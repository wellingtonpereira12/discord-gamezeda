// WebRTC Manager - Chamada de Voz e Múltiplas Telas Simultâneas (Voz + Tela Sem Interferência)
export class WebRTCManager {
  constructor(socket, onRemoteTrack, onRemoteRemove, onSpeakingChange, onRemoteSpeaking) {
    this.socket = socket;
    this.onRemoteTrack = onRemoteTrack;
    this.onRemoteRemove = onRemoteRemove;
    this.onSpeakingChange = onSpeakingChange;
    this.onRemoteSpeaking = onRemoteSpeaking;

    this.localAudioStream = null;
    this.localScreenStream = null;

    this.isMuted = false;
    this.isScreenSharing = false;

    // Mapa de conexões: peerId -> RTCPeerConnection
    this.peers = new Map();

    // Áudio de VOZ e Áudio de TELA SEPARADOS para NUNCA um cortar o outro:
    this.remoteVoiceAudios = new Map();  // peerId -> HTMLAudioElement (Microfone)
    this.remoteScreenAudios = new Map(); // peerId -> HTMLAudioElement (Som de jogo/tela)

    // Configurações de volume e silenciamento por usuário:
    this.userVolumes = new Map();        // peerId -> volumePercent (default 100)
    this.userMutes = new Map();          // peerId -> boolean (default false)
    this.userScreenAudioMutes = new Map(); // peerId -> boolean (default false)

    this.audioContext = null;
    this.analyser = null;
    this.analyserTimer = null;

    this.rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    };

    this.setupSocketEvents();
  }

  ensureAudioContext() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  setupSocketEvents() {
    // Lista de quem já está na sala (ligo para cada um deles)
    this.socket.on('voice:peers-list', async ({ peers }) => {
      console.log(`[WebRTC 📞] Conectando com ${peers.length} participantes na sala...`);
      for (const peer of peers) {
        await this.initiateCallTo(peer.id);
      }
    });

    // Novo participante entrou
    this.socket.on('voice:peer-joined', async ({ peerId, user }) => {
      console.log(`[WebRTC 📞] Participante detectado: ${user.name} (${peerId})`);
      this.getOrCreatePeer(peerId);
    });

    // Oferta WebRTC recebida
    this.socket.on('webrtc:offer', async ({ senderId, offer, type }) => {
      console.log(`[WebRTC 📞] Oferta de ${senderId} (tipo: ${type || 'call'})`);
      const pc = this.getOrCreatePeer(senderId);

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Processa candidatos ICE pendentes
        if (pc.pendingCandidates && pc.pendingCandidates.length > 0) {
          for (const cand of pc.pendingCandidates) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {}
          }
          pc.pendingCandidates = [];
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        this.socket.emit('webrtc:answer', {
          targetId: senderId,
          answer: answer,
          type
        });
      } catch (err) {
        console.error('[WebRTC] Erro ao responder oferta:', err);
      }
    });

    // Resposta WebRTC recebida
    this.socket.on('webrtc:answer', async ({ senderId, answer }) => {
      console.log(`[WebRTC 📞] Resposta de ${senderId}`);
      const pc = this.peers.get(senderId);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));

          if (pc.pendingCandidates && pc.pendingCandidates.length > 0) {
            for (const cand of pc.pendingCandidates) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch (e) {}
            }
            pc.pendingCandidates = [];
          }
        } catch (err) {
          console.error('[WebRTC] Erro ao aplicar answer:', err);
        }
      }
    });

    // Candidatos ICE recebidos
    this.socket.on('webrtc:ice-candidate', async ({ senderId, candidate }) => {
      const pc = this.peers.get(senderId);
      if (!pc || !candidate) return;

      if (!pc.remoteDescription || !pc.remoteDescription.type) {
        if (!pc.pendingCandidates) pc.pendingCandidates = [];
        pc.pendingCandidates.push(candidate);
      } else {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('[WebRTC] Erro ao adicionar ICE candidate:', err);
        }
      }
    });

    // Participante saiu
    this.socket.on('voice:peer-left', ({ peerId }) => {
      console.log(`[WebRTC 📞] Participante saiu: ${peerId}`);
      this.closePeer(peerId);
    });
  }

  async initiateCallTo(peerId) {
    const pc = this.getOrCreatePeer(peerId);
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);

      this.socket.emit('webrtc:offer', {
        targetId: peerId,
        offer: offer,
        type: 'call'
      });
    } catch (err) {
      console.error(`[WebRTC] Falha ao ligar para ${peerId}:`, err);
    }
  }

  getOrCreatePeer(peerId) {
    if (this.peers.has(peerId)) {
      return this.peers.get(peerId);
    }

    const pc = new RTCPeerConnection(this.rtcConfig);
    pc.pendingCandidates = [];

    // Enviar ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('webrtc:ice-candidate', {
          targetId: peerId,
          candidate: event.candidate
        });
      }
    };

    // Receber Tracks (Áudio do Microfone, Vídeo da Tela, Áudio da Tela)
    pc.ontrack = (event) => {
      console.log(`[WebRTC 📞] Track recebido de ${peerId}: ${event.track.kind}`);

      if (event.track.kind === 'audio') {
        const stream = event.streams[0] || new MediaStream([event.track]);

        // Se ainda não temos o microfone deste peer, este primeiro áudio é a voz dele!
        if (!this.remoteVoiceAudios.has(peerId)) {
          console.log(`[WebRTC 🎙️] Conectando áudio de VOZ/MICROFONE de ${peerId}`);
          this.playRemoteVoice(peerId, stream);
        } else {
          // Se já temos a voz dele, qualquer áudio adicional é o SOM DA TELA / JOGO!
          console.log(`[WebRTC 🔊] Conectando áudio secundário de TELA/JOGO de ${peerId}`);
          this.playRemoteScreenAudio(peerId, stream);
        }
      } else if (event.track.kind === 'video') {
        console.log(`[WebRTC 📺] Conectando VÍDEO de TELA de ${peerId}`);
        const videoStream = new MediaStream([event.track]);
        if (this.onRemoteTrack) {
          this.onRemoteTrack(peerId, videoStream, event.track);
        }

        event.track.onended = () => {
          console.log(`[WebRTC 📺] Track de tela encerrado de ${peerId}`);
          if (this.onRemoteRemove) {
            this.onRemoteRemove(peerId, 'video');
          }
        };
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC 📞] Conexão ${peerId}: ${pc.connectionState}`);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.closePeer(peerId);
      }
    };

    this.addLocalTracksToPeer(pc);

    this.peers.set(peerId, pc);
    return pc;
  }

  addLocalTracksToPeer(pc) {
    if (this.localAudioStream) {
      this.localAudioStream.getAudioTracks().forEach(track => {
        const senders = pc.getSenders();
        const exists = senders.some(s => s.track && s.track.kind === 'audio');
        if (!exists) {
          pc.addTrack(track, this.localAudioStream);
        }
      });
    }
    if (this.localScreenStream) {
      this.localScreenStream.getTracks().forEach(track => {
        const senders = pc.getSenders();
        const exists = senders.some(s => s.track && s.track.id === track.id);
        if (!exists) {
          pc.addTrack(track, this.localScreenStream);
        }
      });
    }
  }

  // Reproduzir ÁUDIO DO MICROFONE (VOZ) - NUNCA É SUBSTITUÍDO OU CORTADO PELA TELA
  playRemoteVoice(peerId, stream) {
    this.ensureAudioContext();

    let audio = this.remoteVoiceAudios.get(peerId);
    if (!audio) {
      audio = document.createElement('audio');
      audio.autoplay = true;
      audio.playsInline = true;
      audio.id = `voice-audio-${peerId}`;
      document.body.appendChild(audio);
      this.remoteVoiceAudios.set(peerId, audio);
    }
    audio.srcObject = stream;
    const volPercent = this.userVolumes.has(peerId) ? this.userVolumes.get(peerId) : 100;
    const isMuted = this.userMutes.get(peerId) || false;
    audio.volume = Math.max(0, Math.min(1.0, volPercent / 100));
    audio.muted = isMuted;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        const unlock = () => {
          audio.play();
          document.removeEventListener('click', unlock);
        };
        document.addEventListener('click', unlock);
      });
    }

    this.attachRemoteSpeechDetection(peerId, stream);
  }

  // Reproduzir ÁUDIO DA TELA (SOM DO JOGO / GUIA) - TOCA JUNTO COM A VOZ!
  playRemoteScreenAudio(peerId, stream) {
    this.ensureAudioContext();

    let audio = this.remoteScreenAudios.get(peerId);
    if (!audio) {
      audio = document.createElement('audio');
      audio.autoplay = true;
      audio.playsInline = true;
      audio.id = `screen-audio-${peerId}`;
      document.body.appendChild(audio);
      this.remoteScreenAudios.set(peerId, audio);
    }
    audio.srcObject = stream;
    const volPercent = this.userVolumes.has(peerId) ? this.userVolumes.get(peerId) : 100;
    const isSfxMuted = this.userScreenAudioMutes.get(peerId) || false;
    audio.volume = Math.max(0, Math.min(1.0, volPercent / 100));
    audio.muted = isSfxMuted;

    audio.play().catch(() => {});
  }

  attachRemoteSpeechDetection(peerId, stream) {
    try {
      this.ensureAudioContext();
      const source = this.audioContext.createMediaStreamSource(stream);
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);
      let wasSpeaking = false;

      const interval = setInterval(() => {
        if (!this.remoteVoiceAudios.has(peerId)) {
          clearInterval(interval);
          return;
        }
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length;
        const isSpeaking = avg > 12;

        if (isSpeaking !== wasSpeaking) {
          wasSpeaking = isSpeaking;
          if (this.onRemoteSpeaking) {
            this.onRemoteSpeaking(peerId, isSpeaking);
          }
        }
      }, 100);
    } catch (e) {}
  }

  // Capturar microfone local
  async startAudio() {
    this.ensureAudioContext();
    if (this.localAudioStream) return this.localAudioStream;

    try {
      this.localAudioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      console.log('[WebRTC 🎤] Microfone ativado!');
      this.isMuted = false;

      const audioTrack = this.localAudioStream.getAudioTracks()[0];
      for (const [peerId, pc] of this.peers.entries()) {
        const senders = pc.getSenders();
        const exists = senders.some(s => s.track && s.track.kind === 'audio');
        if (!exists) {
          pc.addTrack(audioTrack, this.localAudioStream);
          await this.renegotiate(pc, peerId);
        }
      }

      this.setupLocalSpeechMeter(this.localAudioStream);
      return this.localAudioStream;
    } catch (err) {
      console.error('[WebRTC] Erro ao capturar microfone:', err);
      alert('Por favor, permita o acesso ao microfone no navegador!');
      return null;
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.localAudioStream) {
      this.localAudioStream.getAudioTracks().forEach(track => {
        track.enabled = !this.isMuted;
      });
    }
    return this.isMuted;
  }

  // Compartilhar tela: Adiciona o vídeo e opcionalmente o áudio da tela SEM TOCAR NO MICROFONE!
  async startScreenShare() {
    try {
      this.localScreenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: true
      });

      this.isScreenSharing = true;
      const screenVideoTrack = this.localScreenStream.getVideoTracks()[0];

      screenVideoTrack.onended = () => {
        this.stopScreenShare();
      };

      for (const [peerId, pc] of this.peers.entries()) {
        pc.addTrack(screenVideoTrack, this.localScreenStream);

        const screenAudioTrack = this.localScreenStream.getAudioTracks()[0];
        if (screenAudioTrack) {
          pc.addTrack(screenAudioTrack, this.localScreenStream);
        }

        await this.renegotiate(pc, peerId);
      }

      this.socket.emit('voice:screen-status', { isSharing: true });
      return this.localScreenStream;
    } catch (err) {
      console.error('[WebRTC] Falha ao compartilhar tela:', err);
      this.isScreenSharing = false;
      return null;
    }
  }

  async stopScreenShare() {
    if (this.localScreenStream) {
      this.localScreenStream.getTracks().forEach(track => {
        track.stop();
        for (const [peerId, pc] of this.peers.entries()) {
          const sender = pc.getSenders().find(s => s.track === track);
          if (sender) {
            try { pc.removeTrack(sender); } catch (e) {}
            this.renegotiate(pc, peerId);
          }
        }
      });
      this.localScreenStream = null;
    }
    this.isScreenSharing = false;
    this.socket.emit('voice:screen-status', { isSharing: false });
  }

  async renegotiate(pc, targetId) {
    if (!targetId) return;
    try {
      if (pc.signalingState !== 'stable') {
        await new Promise(r => setTimeout(r, 200));
      }
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.socket.emit('webrtc:offer', {
        targetId: targetId,
        offer: offer,
        type: 'stream-update'
      });
    } catch (e) {
      console.warn('Renegotiate warning:', e);
    }
  }

  setupLocalSpeechMeter(stream) {
    try {
      this.ensureAudioContext();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const buffer = new Uint8Array(this.analyser.frequencyBinCount);
      let wasSpeaking = false;

      this.analyserTimer = setInterval(() => {
        if (this.isMuted) {
          if (wasSpeaking) {
            wasSpeaking = false;
            if (this.onSpeakingChange) this.onSpeakingChange(false);
          }
          return;
        }

        this.analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i];
        const avg = sum / buffer.length;
        const isSpeaking = avg > 14;

        if (isSpeaking !== wasSpeaking) {
          wasSpeaking = isSpeaking;
          if (this.onSpeakingChange) this.onSpeakingChange(isSpeaking);
        }
      }, 100);
    } catch (e) {}
  }

  closePeer(peerId) {
    const pc = this.peers.get(peerId);
    if (pc) {
      pc.close();
      this.peers.delete(peerId);
    }
    const voiceAudio = this.remoteVoiceAudios.get(peerId);
    if (voiceAudio) {
      voiceAudio.remove();
      this.remoteVoiceAudios.delete(peerId);
    }
    const screenAudio = this.remoteScreenAudios.get(peerId);
    if (screenAudio) {
      screenAudio.remove();
      this.remoteScreenAudios.delete(peerId);
    }
    if (this.onRemoteRemove) {
      this.onRemoteRemove(peerId);
    }
  }

  leaveVoice() {
    this.stopScreenShare();

    if (this.localAudioStream) {
      this.localAudioStream.getTracks().forEach(t => t.stop());
      this.localAudioStream = null;
    }
    if (this.analyserTimer) {
      clearInterval(this.analyserTimer);
      this.analyserTimer = null;
    }

    this.peers.clear();
    this.remoteVoiceAudios.clear();
    this.remoteScreenAudios.clear();
  }

  // Ajuste de volume individual do usuário (0% a 200%)
  setUserVolume(peerId, volumePercent) {
    this.userVolumes.set(peerId, volumePercent);
    const vol = Math.max(0, Math.min(2.0, volumePercent / 100));
    const voiceAudio = this.remoteVoiceAudios.get(peerId);
    if (voiceAudio) {
      voiceAudio.volume = Math.min(1.0, vol);
    }
    const screenAudio = this.remoteScreenAudios.get(peerId);
    if (screenAudio) {
      screenAudio.volume = Math.min(1.0, vol);
    }
  }

  // Silenciar usuário individualmente (somente para quem clicou)
  setUserMuted(peerId, isMuted) {
    this.userMutes.set(peerId, isMuted);
    const voiceAudio = this.remoteVoiceAudios.get(peerId);
    if (voiceAudio) {
      voiceAudio.muted = isMuted;
    }
  }

  // Silenciar áudio da tela/efeitos sonoros do usuário
  setUserScreenAudioMuted(peerId, isMuted) {
    this.userScreenAudioMutes.set(peerId, isMuted);
    const screenAudio = this.remoteScreenAudios.get(peerId);
    if (screenAudio) {
      screenAudio.muted = isMuted;
    }
  }
}
