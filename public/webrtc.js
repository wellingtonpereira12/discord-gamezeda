// WebRTC Manager - Transmissão HD (1080p60fps / 8Mbps), Áudio Dual (Voz + Tela Independentes), Supressor de Ruído e Dispositivos
export class WebRTCManager {
  constructor(socket, onRemoteTrack, onRemoteRemove, onSpeakingChange, onRemoteSpeaking) {
    this.socket = socket;
    this.onRemoteTrack = onRemoteTrack;
    this.onRemoteRemove = onRemoteRemove;
    this.onSpeakingChange = onSpeakingChange;
    this.onRemoteSpeaking = onRemoteSpeaking;
    this.onRemoteScreenAudio = null;

    this.localAudioStream = null;
    this.localScreenStream = null;
    this.processedAudioStream = null;
    this.localScreenAudioTrackId = null;

    this.isMuted = false;
    this.isScreenSharing = false;

    // Dispositivos selecionados
    this.selectedInputDeviceId = localStorage.getItem('discord_input_device') || 'default';
    this.selectedOutputDeviceId = localStorage.getItem('discord_output_device') || 'default';

    // Supressor de Ruído (Noise Gate)
    this.noiseSuppressionEnabled = localStorage.getItem('discord_noise_gate_enabled') !== 'false';
    this.noiseGateThreshold = parseFloat(localStorage.getItem('discord_noise_gate_thresh') || '14');

    // Mapa de conexões: peerId -> RTCPeerConnection
    this.peers = new Map();

    // Rastreamento explícito de Senders por Peer: peerId -> { micSender, screenVideoSender, screenAudioSender }
    this.peerSenders = new Map();

    // Rastreamento dos IDs de Stream de Tela e Track de Áudio da Tela de cada Peer remoto
    this.peerScreenStreamIds = new Map();      // peerId -> streamId
    this.peerScreenAudioTrackIds = new Map();  // peerId -> trackId

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

  getPeerSenders(peerId) {
    if (!this.peerSenders.has(peerId)) {
      this.peerSenders.set(peerId, {
        micSender: null,
        screenVideoSender: null,
        screenAudioSender: null
      });
    }
    return this.peerSenders.get(peerId);
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

    this.socket.on('webrtc:offer', async ({ senderId, offer, type, screenStreamId, screenAudioTrackId }) => {
      console.log(`[WebRTC 📞] Oferta de ${senderId} (${type || 'call'})`);
      if (screenStreamId) {
        this.peerScreenStreamIds.set(senderId, screenStreamId);
      }
      if (screenAudioTrackId) {
        this.peerScreenAudioTrackIds.set(senderId, screenAudioTrackId);
      }
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
          type,
          screenStreamId: this.localScreenStream ? this.localScreenStream.id : null,
          screenAudioTrackId: this.localScreenAudioTrackId
        });

        await this.applyBitrateParameters(pc);
      } catch (err) {
        console.error('[WebRTC] Erro ao responder oferta:', err);
      }
    });

    this.socket.on('webrtc:answer', async ({ senderId, answer, screenStreamId, screenAudioTrackId }) => {
      console.log(`[WebRTC 📞] Resposta de ${senderId}`);
      if (screenStreamId) {
        this.peerScreenStreamIds.set(senderId, screenStreamId);
      }
      if (screenAudioTrackId) {
        this.peerScreenAudioTrackIds.set(senderId, screenAudioTrackId);
      }
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

    this.socket.on('voice:peer-screen-status', ({ peerId, isSharing, screenStreamId, screenAudioTrackId }) => {
      if (isSharing) {
        if (screenStreamId) this.peerScreenStreamIds.set(peerId, screenStreamId);
        if (screenAudioTrackId) this.peerScreenAudioTrackIds.set(peerId, screenAudioTrackId);
      } else {
        this.peerScreenStreamIds.delete(peerId);
        this.peerScreenAudioTrackIds.delete(peerId);
        const screenAudio = this.remoteScreenAudios.get(peerId);
        if (screenAudio) {
          screenAudio.srcObject = null;
        }
      }
    });

    this.socket.on('voice:peer-left', ({ peerId }) => {
      console.log(`[WebRTC 📞] Participante saiu: ${peerId}`);
      this.closePeer(peerId);
    });
  }

  optimizeSdp(sdp) {
    if (!sdp) return sdp;
    // Localiza o payload type do Opus (geralmente 111) e injeta estéreo e alta taxa de bits
    const opusMatch = sdp.match(/a=rtpmap:(\d+)\s+opus\/48000/i);
    if (opusMatch) {
      const pt = opusMatch[1];
      const fmtpRegex = new RegExp(`a=fmtp:${pt}\\s+(.*)`);
      if (fmtpRegex.test(sdp)) {
        sdp = sdp.replace(fmtpRegex, (line, params) => {
          let updated = params;
          if (!updated.includes('stereo=1')) updated += ';stereo=1;sprop-stereo=1';
          if (!updated.includes('maxaveragebitrate')) updated += ';maxaveragebitrate=256000';
          if (!updated.includes('minptime=')) updated += ';minptime=10';
          if (!updated.includes('useinbandfec=')) updated += ';useinbandfec=1';
          return `a=fmtp:${pt} ${updated}`;
        });
      } else {
        sdp = sdp.replace(new RegExp(`(a=rtpmap:${pt}\\s+opus\\/48000\\/2\\r?\\n)`),
          `$1a=fmtp:${pt} minptime=10;useinbandfec=1;stereo=1;sprop-stereo=1;maxaveragebitrate=256000\r\n`);
      }
    }
    return sdp;
  }

  async applyBitrateParameters(pc) {
    try {
      const senders = pc.getSenders();
      for (const sender of senders) {
        if (sender.track && sender.track.kind === 'video') {
          const params = sender.getParameters();
          if (!params.encodings || params.encodings.length === 0) {
            params.encodings = [{}];
          }
          params.encodings[0].maxBitrate = 8000000;
          params.encodings[0].maxFramerate = 60;
          params.encodings[0].degradationPreference = 'maintain-resolution';
          await sender.setParameters(params);
        } else if (sender.track && sender.track.kind === 'audio') {
          const params = sender.getParameters();
          if (!params.encodings || params.encodings.length === 0) {
            params.encodings = [{}];
          }
          params.encodings[0].maxBitrate = 256000;
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
        type: 'call',
        screenStreamId: this.localScreenStream ? this.localScreenStream.id : null,
        screenAudioTrackId: this.localScreenAudioTrackId
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

    // Identificação 100% Confiável de Tracks: Voz vs Áudio de Tela
    pc.ontrack = (event) => {
      console.log(`[WebRTC 📞] Track recebido de ${peerId}: ${event.track.kind} (ID: ${event.track.id})`);
      const incomingStream = event.streams[0] || new MediaStream([event.track]);
      const knownScreenStreamId = this.peerScreenStreamIds.get(peerId);
      const knownScreenAudioTrackId = this.peerScreenAudioTrackIds.get(peerId);

      if (event.track.kind === 'video') {
        this.peerScreenStreamIds.set(peerId, incomingStream.id);
        if (this.onRemoteTrack) {
          this.onRemoteTrack(peerId, incomingStream, event.track);
        }

        event.track.onended = () => {
          if (this.onRemoteRemove) {
            this.onRemoteRemove(peerId, 'video');
          }
        };
      } else if (event.track.kind === 'audio') {
        const isScreenAudio = (knownScreenAudioTrackId && event.track.id === knownScreenAudioTrackId) ||
                              (knownScreenStreamId && incomingStream.id === knownScreenStreamId) ||
                              (incomingStream.getVideoTracks && incomingStream.getVideoTracks().length > 0) ||
                              (this.peerScreenStreamIds.has(peerId) && this.remoteVoiceAudios.has(peerId) && this.remoteVoiceAudios.get(peerId).srcObject);

        if (isScreenAudio) {
          console.log(`[WebRTC 🔊] Roteado para SOM DE TELA/JOGO de ${peerId}`);
          this.peerScreenAudioTrackIds.set(peerId, event.track.id);
          this.playRemoteScreenAudio(peerId, incomingStream);
          if (this.onRemoteScreenAudio) {
            this.onRemoteScreenAudio(peerId, incomingStream, event.track);
          }
        } else {
          console.log(`[WebRTC 🎙️] Roteado para VOZ/MICROFONE de ${peerId}`);
          this.playRemoteVoice(peerId, incomingStream);
        }
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.closePeer(peerId);
      }
    };

    this.addLocalTracksToPeer(pc, peerId);
    this.peers.set(peerId, pc);
    return pc;
  }

  // Adiciona tracks locais garantindo referência separada para cada sender
  addLocalTracksToPeer(pc, peerId) {
    const senders = this.getPeerSenders(peerId);
    const audioTrack = this.getOutgoingAudioTrack();

    if (audioTrack && !senders.micSender) {
      senders.micSender = pc.addTrack(audioTrack, this.processedAudioStream || this.localAudioStream);
    }

    if (this.localScreenStream) {
      const screenVideoTrack = this.localScreenStream.getVideoTracks()[0];
      const screenAudioTrack = this.localScreenStream.getAudioTracks()[0];

      if (screenVideoTrack && !senders.screenVideoSender) {
        senders.screenVideoSender = pc.addTrack(screenVideoTrack, this.localScreenStream);
      }
      if (screenAudioTrack && !senders.screenAudioSender) {
        senders.screenAudioSender = pc.addTrack(screenAudioTrack, this.localScreenStream);
      }
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

  // Reproduzir Voz
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

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        const unlock = () => { audio.play(); document.removeEventListener('click', unlock); };
        document.addEventListener('click', unlock);
      });
    }

    this.attachRemoteSpeechDetection(peerId, stream);
  }

  // Reproduzir Áudio de Tela com tratamento de Autoplay
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

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        const unlock = () => { audio.play(); document.removeEventListener('click', unlock); };
        document.addEventListener('click', unlock);
      });
    }
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

  // Capturar microfone local
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

      this.setupAudioProcessingChain(this.localAudioStream);

      const outgoingTrack = this.getOutgoingAudioTrack();
      for (const [peerId, pc] of this.peers.entries()) {
        const senders = this.getPeerSenders(peerId);
        if (senders.micSender) {
          await senders.micSender.replaceTrack(outgoingTrack);
        } else {
          senders.micSender = pc.addTrack(outgoingTrack, this.processedAudioStream || this.localAudioStream);
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

  setupAudioProcessingChain(rawStream) {
    try {
      this.ensureAudioContext();

      if (this.localSourceNode) {
        try { this.localSourceNode.disconnect(); } catch (e) {}
      }

      this.localSourceNode = this.audioContext.createMediaStreamSource(rawStream);

      const highpass = this.audioContext.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 80;

      this.noiseGateNode = this.audioContext.createGain();
      this.noiseGateNode.gain.value = 1.0;

      this.destinationNode = this.audioContext.createMediaStreamDestination();

      this.localSourceNode.connect(highpass);
      highpass.connect(this.noiseGateNode);
      this.noiseGateNode.connect(this.destinationNode);

      this.processedAudioStream = this.destinationNode.stream;
    } catch (e) {
      console.warn('Usando áudio direto sem processamento adicional:', e);
      this.processedAudioStream = rawStream;
    }
  }

  async setInputDevice(deviceId) {
    this.selectedInputDeviceId = deviceId;
    localStorage.setItem('discord_input_device', deviceId);

    if (this.localAudioStream) {
      this.localAudioStream.getTracks().forEach(t => t.stop());
      this.localAudioStream = null;
      await this.startAudio();
    }
  }

  async setOutputDevice(deviceId) {
    this.selectedOutputDeviceId = deviceId;
    localStorage.setItem('discord_output_device', deviceId);

    this.remoteVoiceAudios.forEach(audio => this.applyOutputDeviceToElement(audio));
    this.remoteScreenAudios.forEach(audio => this.applyOutputDeviceToElement(audio));
    document.querySelectorAll('audio').forEach(audio => this.applyOutputDeviceToElement(audio));
  }

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
    if (this.noiseGateNode) {
      this.noiseGateNode.gain.value = this.isMuted ? 0.0 : 1.0;
    }
    return this.isMuted;
  }

  // Compartilhamento de Tela 100% Compatível e Robusto (W3C Standard)
  async startScreenShare() {
    try {
      console.log('[WebRTC] Solicitando getDisplayMedia({ video: true, audio: true })...');
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      if (!stream) {
        return null;
      }

      this.localScreenStream = stream;
      this.isScreenSharing = true;

      const screenVideoTrack = stream.getVideoTracks()[0];
      const screenAudioTrack = stream.getAudioTracks()[0];

      if (screenAudioTrack) {
        console.log('[WebRTC 🔊] Áudio do sistema capturado com sucesso! ID:', screenAudioTrack.id);
        this.localScreenAudioTrackId = screenAudioTrack.id;
        try {
          if (screenAudioTrack.applyConstraints) {
            screenAudioTrack.applyConstraints({
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false
            }).catch(() => {});
          }
        } catch (e) {}
      } else {
        console.warn('[WebRTC ℹ️] Tela compartilhada sem trilha de áudio.');
        this.localScreenAudioTrackId = null;
      }

      if (screenVideoTrack) {
        try {
          if ('contentHint' in screenVideoTrack) {
            screenVideoTrack.contentHint = 'motion';
          }
        } catch (e) {}

        screenVideoTrack.onended = () => {
          this.stopScreenShare();
        };
      }

      for (const [peerId, pc] of this.peers.entries()) {
        try {
          const senders = this.getPeerSenders(peerId);

          if (senders.screenVideoSender) {
            try { pc.removeTrack(senders.screenVideoSender); } catch(e) {}
            senders.screenVideoSender = null;
          }
          if (senders.screenAudioSender) {
            try { pc.removeTrack(senders.screenAudioSender); } catch(e) {}
            senders.screenAudioSender = null;
          }

          if (screenVideoTrack) {
            senders.screenVideoSender = pc.addTrack(screenVideoTrack, this.localScreenStream);
          }
          if (screenAudioTrack) {
            senders.screenAudioSender = pc.addTrack(screenAudioTrack, this.localScreenStream);
          }

          await this.renegotiate(pc, peerId, {
            screenStreamId: this.localScreenStream.id,
            screenAudioTrackId: screenAudioTrack ? screenAudioTrack.id : null
          });
          await this.applyBitrateParameters(pc);
        } catch (peerErr) {
          console.warn(`[WebRTC] Falha ao adicionar tracks ao peer ${peerId}:`, peerErr);
        }
      }

      try {
        this.socket.emit('voice:screen-status', {
          isSharing: true,
          hasAudio: !!screenAudioTrack,
          screenStreamId: this.localScreenStream.id,
          screenAudioTrackId: screenAudioTrack ? screenAudioTrack.id : null
        });
      } catch (sockErr) {}

      return this.localScreenStream;
    } catch (err) {
      console.error('[WebRTC] Falha ao capturar tela:', err);
      try {
        this.socket.emit('client:error', {
          action: 'startScreenShare',
          message: err.message || String(err),
          name: err.name,
          stack: err.stack
        });
      } catch (e) {}
      this.isScreenSharing = false;
      return null;
    }
  }

  async stopScreenShare() {
    if (this.localScreenStream) {
      const tracks = this.localScreenStream.getTracks();

      for (const [peerId, pc] of this.peers.entries()) {
        const senders = this.getPeerSenders(peerId);

        if (senders.screenVideoSender) {
          try { pc.removeTrack(senders.screenVideoSender); } catch (e) {}
          senders.screenVideoSender = null;
        }

        if (senders.screenAudioSender) {
          try { pc.removeTrack(senders.screenAudioSender); } catch (e) {}
          senders.screenAudioSender = null;
        }

        await this.renegotiate(pc, peerId, { isScreenStopped: true });
      }

      tracks.forEach(track => track.stop());
      this.localScreenStream = null;
      this.localScreenAudioTrackId = null;
    }

    this.isScreenSharing = false;
    this.socket.emit('voice:screen-status', { isSharing: false });
  }

  async renegotiate(pc, targetId, extraData = {}) {
    if (!targetId) return;
    try {
      if (pc.signalingState !== 'stable') {
        await new Promise(r => setTimeout(r, 250));
      }
      if (pc.signalingState !== 'stable') return;

      let offer = await pc.createOffer();
      offer.sdp = this.optimizeSdp(offer.sdp);
      await pc.setLocalDescription(offer);

      this.socket.emit('webrtc:offer', {
        targetId,
        offer,
        type: 'stream-update',
        ...extraData
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
    this.peerSenders.delete(peerId);
    this.peerScreenStreamIds.delete(peerId);
    this.peerScreenAudioTrackIds.delete(peerId);

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
    this.peerSenders.clear();
    this.peerScreenStreamIds.clear();
    this.peerScreenAudioTrackIds.clear();
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

  togglePeerScreenAudio(peerId) {
    const currentMute = this.userScreenAudioMutes.get(peerId) || false;
    const newMute = !currentMute;
    this.setUserScreenAudioMuted(peerId, newMute);
    return newMute;
  }

  isPeerScreenAudioMuted(peerId) {
    return this.userScreenAudioMutes.get(peerId) || false;
  }
}
