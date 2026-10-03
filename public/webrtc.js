// WebRTC Manager - Transmissão HD (1080p60fps / 8Mbps), Áudio Stereo 256k, Supressor de Ruído e Dispositivos
export class WebRTCManager {
  constructor(socket, onRemoteTrack, onRemoteRemove, onSpeakingChange, onRemoteSpeaking) {
    this.socket = socket;
    this.onRemoteTrack = onRemoteTrack;
    this.onRemoteRemove = onRemoteRemove;
    this.onSpeakingChange = onSpeakingChange;
    this.onRemoteSpeaking = onRemoteSpeaking;

    this.localAudioStream = null;
    this.localScreenStream = null;
    this.processedAudioStream = null;

    this.isMuted = false;
    this.isScreenSharing = false;

    // Dispositivos selecionados
    this.selectedInputDeviceId = localStorage.getItem('discord_input_device') || 'default';
    this.selectedOutputDeviceId = localStorage.getItem('discord_output_device') || 'default';

    // Supressor de Ruído (Noise Gate)
    this.noiseSuppressionEnabled = localStorage.getItem('discord_noise_gate_enabled') !== 'false';
    this.noiseGateThreshold = parseFloat(localStorage.getItem('discord_noise_gate_thresh') || '14'); // limiar 0 a 100

    // Mapa de conexões: peerId -> RTCPeerConnection
    this.peers = new Map();

    // Elementos de áudio remotos
    this.remoteVoiceAudios = new Map();  // peerId -> HTMLAudioElement (Microfone)
    this.remoteScreenAudios = new Map(); // peerId -> HTMLAudioElement (Som de tela/jogo)

    // Configurações individuais de volume
    this.userVolumes = new Map();
    this.userMutes = new Map();
    this.userScreenAudioMutes = new Map();

    this.audioContext = null;
    this.localSourceNode = null;
    this.noiseGateNode = null;
    this.destinationNode = null;
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
      this.audioContext = new AudioCtx({ latencyHint: 'interactive', sampleRate: 48000 });
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  setupSocketEvents() {
    this.socket.on('voice:peers-list', async ({ peers }) => {
      console.log(`[WebRTC 📞] Conectando com ${peers.length} participantes...`);
      for (const peer of peers) {
        await this.initiateCallTo(peer.id);
      }
    });

    this.socket.on('voice:peer-joined', async ({ peerId, user }) => {
      console.log(`[WebRTC 📞] Participante detectado: ${user.name} (${peerId})`);
      this.getOrCreatePeer(peerId);
    });

    this.socket.on('webrtc:offer', async ({ senderId, offer, type }) => {
      console.log(`[WebRTC 📞] Oferta de ${senderId} (${type || 'call'})`);
      const pc = this.getOrCreatePeer(senderId);

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        if (pc.pendingCandidates && pc.pendingCandidates.length > 0) {
          for (const cand of pc.pendingCandidates) {
            try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {}
          }
          pc.pendingCandidates = [];
        }

        const answer = await pc.createAnswer();
        answer.sdp = this.optimizeSdp(answer.sdp);
        await pc.setLocalDescription(answer);

        this.socket.emit('webrtc:answer', {
          targetId: senderId,
          answer,
          type
        });

        await this.applyBitrateParameters(pc);
      } catch (err) {
        console.error('[WebRTC] Erro ao responder oferta:', err);
      }
    });

    this.socket.on('webrtc:answer', async ({ senderId, answer }) => {
      console.log(`[WebRTC 📞] Resposta de ${senderId}`);
      const pc = this.peers.get(senderId);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));

          if (pc.pendingCandidates && pc.pendingCandidates.length > 0) {
            for (const cand of pc.pendingCandidates) {
              try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {}
            }
            pc.pendingCandidates = [];
          }

          await this.applyBitrateParameters(pc);
        } catch (err) {
          console.error('[WebRTC] Erro ao aplicar answer:', err);
        }
      }
    });

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

    this.socket.on('voice:peer-left', ({ peerId }) => {
      console.log(`[WebRTC 📞] Participante saiu: ${peerId}`);
      this.closePeer(peerId);
    });
  }

  // Otimização de SDP para alta fidelidade (Opus 256kbps Stereo)
  optimizeSdp(sdp) {
    if (!sdp) return sdp;
    // Injeta maxaveragebitrate de 256kbps, stereo=1 e cbr=1 para som com fidelidade de estúdio
    return sdp.replace(/a=fmtp:(\d+) minptime=\d+;useinbandfec=1/g,
      'a=fmtp:$1 minptime=10;useinbandfec=1;stereo=1;maxaveragebitrate=256000;cbr=1');
  }

  // Alocação de Bitrate Máximo no Sender (8 Mbps para vídeo sem pixelado)
  async applyBitrateParameters(pc) {
    try {
      const senders = pc.getSenders();
      for (const sender of senders) {
        if (sender.track && sender.track.kind === 'video') {
          const params = sender.getParameters();
          if (!params.encodings || params.encodings.length === 0) {
            params.encodings = [{}];
          }
          // 8 Mbps para 1080p/60fps com máxima nitidez em jogos
          params.encodings[0].maxBitrate = 8000000;
          params.encodings[0].maxFramerate = 60;
          params.encodings[0].degradationPreference = 'maintain-resolution';
          await sender.setParameters(params);
        } else if (sender.track && sender.track.kind === 'audio') {
          const params = sender.getParameters();
          if (!params.encodings || params.encodings.length === 0) {
            params.encodings = [{}];
          }
          params.encodings[0].maxBitrate = 256000; // 256 kbps para áudio cristalino
          await sender.setParameters(params);
        }
      }
    } catch (e) {
      console.warn('Erro ao configurar bitrates do sender:', e);
    }
  }

  async initiateCallTo(peerId) {
    const pc = this.getOrCreatePeer(peerId);
    try {
      let offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      offer.sdp = this.optimizeSdp(offer.sdp);
      await pc.setLocalDescription(offer);

      this.socket.emit('webrtc:offer', {
        targetId: peerId,
        offer,
        type: 'call'
      });

      await this.applyBitrateParameters(pc);
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

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('webrtc:ice-candidate', {
          targetId: peerId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      console.log(`[WebRTC 📞] Track recebido de ${peerId}: ${event.track.kind}`);

      if (event.track.kind === 'audio') {
        const stream = event.streams[0] || new MediaStream([event.track]);
        if (!this.remoteVoiceAudios.has(peerId)) {
          this.playRemoteVoice(peerId, stream);
        } else {
          this.playRemoteScreenAudio(peerId, stream);
        }
      } else if (event.track.kind === 'video') {
        const videoStream = new MediaStream([event.track]);
        if (this.onRemoteTrack) {
          this.onRemoteTrack(peerId, videoStream, event.track);
        }

        event.track.onended = () => {
          if (this.onRemoteRemove) {
            this.onRemoteRemove(peerId, 'video');
          }
        };
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.closePeer(peerId);
      }
    };

    this.addLocalTracksToPeer(pc);
    this.peers.set(peerId, pc);
    return pc;
  }

  addLocalTracksToPeer(pc) {
    const audioTrack = this.getOutgoingAudioTrack();
    if (audioTrack) {
      const senders = pc.getSenders();
      const exists = senders.some(s => s.track && s.track.kind === 'audio');
      if (!exists) {
        pc.addTrack(audioTrack, this.processedAudioStream || this.localAudioStream);
      }
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

  getOutgoingAudioTrack() {
    if (this.processedAudioStream && this.processedAudioStream.getAudioTracks().length > 0) {
      return this.processedAudioStream.getAudioTracks()[0];
    }
    if (this.localAudioStream && this.localAudioStream.getAudioTracks().length > 0) {
      return this.localAudioStream.getAudioTracks()[0];
    }
    return null;
  }

  // Reproduzir Voz com controle de dispositivo de saída (setSinkId)
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

    this.applyOutputDeviceToElement(audio);

    const volPercent = this.userVolumes.has(peerId) ? this.userVolumes.get(peerId) : 100;
    const isMuted = this.userMutes.get(peerId) || false;
    audio.volume = Math.max(0, Math.min(1.0, volPercent / 100));
    audio.muted = isMuted;

    audio.play().catch(() => {
      const unlock = () => { audio.play(); document.removeEventListener('click', unlock); };
      document.addEventListener('click', unlock);
    });

    this.attachRemoteSpeechDetection(peerId, stream);
  }

  // Reproduzir Áudio de Tela com controle de saída
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
    this.applyOutputDeviceToElement(audio);

    const volPercent = this.userVolumes.has(peerId) ? this.userVolumes.get(peerId) : 100;
    const isSfxMuted = this.userScreenAudioMutes.get(peerId) || false;
    audio.volume = Math.max(0, Math.min(1.0, volPercent / 100));
    audio.muted = isSfxMuted;

    audio.play().catch(() => {});
  }

  applyOutputDeviceToElement(audioEl) {
    if (audioEl && typeof audioEl.setSinkId === 'function' && this.selectedOutputDeviceId && this.selectedOutputDeviceId !== 'default') {
      audioEl.setSinkId(this.selectedOutputDeviceId).catch(err => {
        console.warn('Erro ao definir sinkId no elemento de áudio:', err);
      });
    }
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

  // Capturar microfone local com Supressor de Ruído (Noise Gate)
  async startAudio() {
    this.ensureAudioContext();

    const audioConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000
    };

    if (this.selectedInputDeviceId && this.selectedInputDeviceId !== 'default') {
      audioConstraints.deviceId = { exact: this.selectedInputDeviceId };
    }

    try {
      this.localAudioStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false
      });

      console.log('[WebRTC 🎤] Microfone ativado!');
      this.isMuted = false;

      // Configuração da cadeia de áudio com Noise Gate
      this.setupAudioProcessingChain(this.localAudioStream);

      const outgoingTrack = this.getOutgoingAudioTrack();
      for (const [peerId, pc] of this.peers.entries()) {
        const senders = pc.getSenders();
        const existing = senders.find(s => s.track && s.track.kind === 'audio');
        if (existing) {
          await existing.replaceTrack(outgoingTrack);
        } else {
          pc.addTrack(outgoingTrack, this.processedAudioStream || this.localAudioStream);
          await this.renegotiate(pc, peerId);
        }
      }

      this.setupLocalSpeechMeter(this.localAudioStream);
      return this.localAudioStream;
    } catch (err) {
      console.error('[WebRTC] Erro ao capturar microfone:', err);
      alert('Não foi possível acessar o microfone! Verifique as permissões.');
      return null;
    }
  }

  // Processador de Áudio: Filtro Passa-Altas + Noise Gate
  setupAudioProcessingChain(rawStream) {
    try {
      this.ensureAudioContext();

      if (this.localSourceNode) {
        try { this.localSourceNode.disconnect(); } catch (e) {}
      }

      this.localSourceNode = this.audioContext.createMediaStreamSource(rawStream);

      // Filtro passa-altas para remover vibrações graves (ruído de mesa e ventoinhas < 80Hz)
      const highpass = this.audioContext.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 80;

      // Noise Gate Gain Node
      this.noiseGateNode = this.audioContext.createGain();
      this.noiseGateNode.gain.value = 1.0;

      // Destino do stream processado
      this.destinationNode = this.audioContext.createMediaStreamDestination();

      this.localSourceNode.connect(highpass);
      highpass.connect(this.noiseGateNode);
      this.noiseGateNode.connect(this.destinationNode);

      this.processedAudioStream = this.destinationNode.stream;
    } catch (e) {
      console.warn('Erro ao configurar cadeia de processamento de áudio, usando áudio nativo:', e);
      this.processedAudioStream = rawStream;
    }
  }

  // Mudança do dispositivo de entrada (Microfone) em tempo real
  async setInputDevice(deviceId) {
    this.selectedInputDeviceId = deviceId;
    localStorage.setItem('discord_input_device', deviceId);

    if (this.localAudioStream) {
      this.localAudioStream.getTracks().forEach(t => t.stop());
      this.localAudioStream = null;
      await this.startAudio();
    }
  }

  // Mudança do dispositivo de saída (Alto-falante / Fone)
  async setOutputDevice(deviceId) {
    this.selectedOutputDeviceId = deviceId;
    localStorage.setItem('discord_output_device', deviceId);

    this.remoteVoiceAudios.forEach(audio => this.applyOutputDeviceToElement(audio));
    this.remoteScreenAudios.forEach(audio => this.applyOutputDeviceToElement(audio));
    document.querySelectorAll('audio').forEach(audio => this.applyOutputDeviceToElement(audio));
  }

  // Configuração do Supressor de Ruído
  setNoiseSuppression(enabled, threshold) {
    this.noiseSuppressionEnabled = enabled;
    if (threshold !== undefined) {
      this.noiseGateThreshold = threshold;
      localStorage.setItem('discord_noise_gate_thresh', threshold.toString());
    }
    localStorage.setItem('discord_noise_gate_enabled', enabled ? 'true' : 'false');
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

  // Compartilhamento de Tela em Ultra HD (1080p / 60 FPS / 8 Mbps / Som Stereo)
  async startScreenShare() {
    try {
      this.localScreenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always",
          width: { ideal: 1920, max: 2560 },
          height: { ideal: 1080, max: 1440 },
          frameRate: { ideal: 60, max: 60 }
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 2,
          sampleRate: 48000
        }
      });

      this.isScreenSharing = true;
      const screenVideoTrack = this.localScreenStream.getVideoTracks()[0];

      // contentHint = 'motion' evita blur e garante 60fps fluído em jogos
      if ('contentHint' in screenVideoTrack) {
        screenVideoTrack.contentHint = 'motion';
      }

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
        await this.applyBitrateParameters(pc);
      }

      this.socket.emit('voice:screen-status', { isSharing: true });
      return this.localScreenStream;
    } catch (err) {
      console.error('[WebRTC] Falha ao compartilhar tela HD:', err);
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
      let offer = await pc.createOffer();
      offer.sdp = this.optimizeSdp(offer.sdp);
      await pc.setLocalDescription(offer);

      this.socket.emit('webrtc:offer', {
        targetId: targetId,
        offer,
        type: 'stream-update'
      });
    } catch (e) {
      console.warn('Renegotiate warning:', e);
    }
  }

  setupLocalSpeechMeter(stream) {
    try {
      this.ensureAudioContext();
      const meterSource = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      meterSource.connect(this.analyser);

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

        // Noise Gate Logic: Se o som estiver abaixo do limiar, corta o ganho
        const threshold = this.noiseGateThreshold;
        const isOpen = avg > threshold;

        if (this.noiseGateNode && this.noiseSuppressionEnabled) {
          const targetGain = isOpen ? 1.0 : 0.0;
          this.noiseGateNode.gain.setTargetAtTime(targetGain, this.audioContext.currentTime, 0.05);
        }

        const isSpeaking = isOpen;
        if (isSpeaking !== wasSpeaking) {
          wasSpeaking = isSpeaking;
          if (this.onSpeakingChange) this.onSpeakingChange(isSpeaking);
        }
      }, 80);
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

  setUserVolume(peerId, volumePercent) {
    this.userVolumes.set(peerId, volumePercent);
    const vol = Math.max(0, Math.min(2.0, volumePercent / 100));
    const voiceAudio = this.remoteVoiceAudios.get(peerId);
    if (voiceAudio) voiceAudio.volume = Math.min(1.0, vol);
    const screenAudio = this.remoteScreenAudios.get(peerId);
    if (screenAudio) screenAudio.volume = Math.min(1.0, vol);
  }

  setUserMuted(peerId, isMuted) {
    this.userMutes.set(peerId, isMuted);
    const voiceAudio = this.remoteVoiceAudios.get(peerId);
    if (voiceAudio) voiceAudio.muted = isMuted;
  }

  setUserScreenAudioMuted(peerId, isMuted) {
    this.userScreenAudioMutes.set(peerId, isMuted);
    const screenAudio = this.remoteScreenAudios.get(peerId);
    if (screenAudio) screenAudio.muted = isMuted;
  }
}
