// WebRTC Manager - Transmissão HD (1080p60fps / 8Mbps), Áudio Dual (Voz + Tela Independentes), Supressor de Ruído Neural RNNoise (Xiph.Org) e Dispositivos

// Pre-carregamento e detecção SIMD para o modelo WebAssembly RNNoise (Xiph.Org)
let rnnoiseWasmBinary = null;
let rnnoiseWorkletLoaded = false;
let isSimdSupported = null;

async function checkSimd() {
  if (isSimdSupported !== null) return isSimdSupported;
  try {
    isSimdSupported = await WebAssembly.validate(new Uint8Array([
      0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11
    ]));
  } catch (e) {
    isSimdSupported = false;
  }
  return isSimdSupported;
}

async function preloadRnnoise() {
  if (rnnoiseWasmBinary) return rnnoiseWasmBinary;
  try {
    const simd = await checkSimd();
    const wasmUrl = simd ? '/rnnoise/rnnoise_simd.wasm' : '/rnnoise/rnnoise.wasm';
    const res = await fetch(wasmUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status} ao baixar ${wasmUrl}`);
    rnnoiseWasmBinary = await res.arrayBuffer();
    console.log(`[WebRTC 🤖 RNNoise] Modelo WebAssembly carregado (${simd ? 'SIMD' : 'Standard'}, ${rnnoiseWasmBinary.byteLength} bytes)`);
    return rnnoiseWasmBinary;
  } catch (err) {
    console.warn('[WebRTC 🤖 RNNoise] Aviso ao carregar WASM:', err);
    return null;
  }
}

// Inicia pré-carregamento imediato em segundo plano
if (typeof window !== 'undefined') {
  preloadRnnoise().catch(() => {});
}

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
    this.localCameraStream = null;
    this.processedAudioStream = null;
    this.localScreenAudioTrackId = null;

    this.isMuted = false;
    this.isScreenSharing = false;
    this.isCameraActive = false;

    // Dispositivos selecionados
    this.selectedInputDeviceId = localStorage.getItem('discord_input_device') || 'default';
    this.selectedOutputDeviceId = localStorage.getItem('discord_output_device') || 'default';

    // Mapa de chaves de bitrate para bits por segundo
    this.bitrateMap = {
      '16M': 16000000,
      '12M': 12000000,
      '8M': 8000000,
      '5M': 5000000,
      '2.5M': 2500000
    };

    // Qualidade de Transmissão de Tela (Resolução, FPS, Bitrate e Modo Gamer)
    const savedRes = localStorage.getItem('discord_stream_resolution');
    this.streamResolution = (savedRes && savedRes !== '[object Object]') ? savedRes : '1080p';

    const savedFps = parseInt(localStorage.getItem('discord_stream_fps') || '60', 10);
    this.streamFps = (!isNaN(savedFps) && savedFps > 0) ? savedFps : 60;

    const savedBitrate = localStorage.getItem('discord_stream_bitrate') || '8M';
    if (this.bitrateMap[savedBitrate]) {
      this.streamBitrateKey = savedBitrate;
      this.streamBitrate = this.bitrateMap[savedBitrate];
    } else {
      const numB = parseInt(savedBitrate, 10);
      if (!isNaN(numB) && numB > 100000) {
        this.streamBitrate = numB;
        this.streamBitrateKey = Object.keys(this.bitrateMap).find(k => this.bitrateMap[k] === numB) || '8M';
      } else {
        this.streamBitrateKey = '8M';
        this.streamBitrate = 8000000;
      }
    }

    const savedDegradation = localStorage.getItem('discord_stream_degradation');
    this.streamDegradation = (savedDegradation && savedDegradation !== '[object Object]') ? savedDegradation : 'maintain-framerate';

    // Supressor de Ruído Neural RNNoise (Xiph.Org)
    this.noiseSuppressionEnabled = localStorage.getItem('discord_rnnoise_enabled') !== 'false';
    this.rnnoiseNode = null;
    this.rnnoiseGainNode = null;
    this.bypassGainNode = null;
    this.outputGainNode = null;

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
    this.screenAudioNodes = new Map();   // peerId -> { sourceNode, gainNode, stream } (Web Audio API anti-ducking)
    this.voiceAudioNodes = new Map();    // peerId -> { sourceNode, gainNode, destNode, stream } (Web Audio API amplificação até 500%)

    // Configurações individuais de volume (Voz e Transmissão 100% Separadas)
    this.userVolumes = new Map();         // peerId -> volumePercent voz/microfone
    this.userScreenVolumes = new Map();   // peerId -> volumePercent transmissão de tela
    this.userMutes = new Map();
    this.userScreenAudioMutes = new Map();
    this.isDeafened = false;

    // Resiliência de Malha e Auto-Recuperação WebRTC
    this.isInVoice = false;
    this.expectedPeers = new Set();
    this.reconnectingPeers = new Set();
    this.recoveryTimers = new Map();
    this.iceCheckTimers = new Map();
    this.remoteSpeechIntervals = new Map();
    this.watchdogTimer = null;

    this.audioContext = null;
    this.localSourceNode = null;
    this.noiseGateNode = null;
    this.destinationNode = null;
    this.analyser = null;
    this.analyserTimer = null;

    this.rtcConfig = {
      iceServers: [
        {
          urls: [
            'turn:jogosbolados.duckdns.org:3478?transport=udp',
            'turn:jogosbolados.duckdns.org:3478?transport=tcp',
            'turn:2.24.64.219:3478?transport=udp',
            'turn:2.24.64.219:3478?transport=tcp'
          ],
          username: 'fakedc',
          credential: 'GamezedaVoice2026!'
        },
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443?transport=tcp',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ],
      iceCandidatePoolSize: 10
    };

    this.setupSocketEvents();
  }

  getPeerSenders(peerId) {
    if (!this.peerSenders.has(peerId)) {
      this.peerSenders.set(peerId, {
        micSender: null,
        screenVideoSender: null,
        screenAudioSender: null,
        cameraVideoSender: null
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
    if (this.audioContext.audioWorklet && !rnnoiseWorkletLoaded) {
      this.audioContext.audioWorklet.addModule('/rnnoise/workletProcessor.js?v=20261006_v1')
        .then(() => {
          rnnoiseWorkletLoaded = true;
          console.log('[WebRTC 🤖 RNNoise] AudioWorkletProcessor registrado com sucesso.');
        })
        .catch(err => {
          console.warn('[WebRTC 🤖 RNNoise] Aviso ao registrar AudioWorklet:', err);
        });
    }
  }

  setupSocketEvents() {
    this.socket.on('voice:peers-list', async ({ peers }) => {
      console.log(`[WebRTC 📞] Conectando com ${peers ? peers.length : 0} participantes...`);
      const validPeerIds = new Set((peers || []).map(p => p.id).filter(id => id && id !== this.socket.id && !id.startsWith('bot-')));
      this.expectedPeers = validPeerIds;

      for (const peerId of Array.from(this.peers.keys())) {
        if (!validPeerIds.has(peerId)) {
          console.log(`[WebRTC 🧹] Removendo peer obsoleto após reconexão/atualização: ${peerId}`);
          this.closePeer(peerId);
        }
      }

      for (const peer of (peers || [])) {
        if (!peer || !peer.id || peer.id === this.socket.id || peer.id.startsWith('bot-')) continue;
        try {
          await this.initiateCallTo(peer.id);
        } catch (callErr) {
          console.error(`[WebRTC] Falha ao iniciar chamada para ${peer.id}:`, callErr);
        }
      }
    });

    this.socket.on('voice:peer-joined', async ({ peerId, user }) => {
      console.log(`[WebRTC 📞] Participante detectado: ${user ? user.name : peerId} (${peerId})`);
      if (!peerId || peerId === this.socket.id || peerId.startsWith('bot-')) return;

      this.expectedPeers.add(peerId);
      this.getOrCreatePeer(peerId);

      // Fallback proativo: se o novo participante não enviar oferta em até 3.5s, iniciamos ativamente a chamada
      setTimeout(() => {
        if (this.isInVoice && this.expectedPeers.has(peerId)) {
          const pc = this.peers.get(peerId);
          if (!pc || !pc.remoteDescription || pc.connectionState === 'new') {
            console.log(`[WebRTC 📞 Fallback] Nenhuma oferta recebida de ${peerId} após 3.5s. Iniciando chamada ativamente...`);
            this.initiateCallTo(peerId).catch(() => {});
          }
        }
      }, 3500);
    });

    this.socket.on('webrtc:offer', async ({ senderId, offer, type, screenStreamId, screenAudioTrackId, isScreenStopped, isCameraStopped }) => {
      console.log(`[WebRTC 📞] Oferta de ${senderId} (${type || 'call'})`);
      if (isScreenStopped) {
        this.stopRemoteScreen(senderId);
        if (this.onRemoteRemove) {
          this.onRemoteRemove(senderId, 'video');
        }
      }
      if (isCameraStopped) {
        if (this.onRemoteRemove) {
          this.onRemoteRemove(senderId, 'video');
        }
      }
      if (screenStreamId) {
        this.peerScreenStreamIds.set(senderId, screenStreamId);
      }
      if (screenAudioTrackId) {
        this.peerScreenAudioTrackIds.set(senderId, screenAudioTrackId);
      }
      const pc = this.getOrCreatePeer(senderId);

      try {
        if (pc.signalingState !== 'stable') {
          // Glare handling resiliente com verificação de oferta obsoleta e ofertas de recuperação
          const isPolite = (this.socket && this.socket.id) ? this.socket.id > senderId : false;
          const offerAge = Date.now() - (pc.lastOfferTime || 0);
          const isOfferStale = pc.lastOfferTime && offerAge > 4000;
          const isRecovery = type === 'ice-restart' || pc.connectionState === 'failed';

          if (!isPolite && !isOfferStale && !isRecovery) {
            console.warn(`[WebRTC 📞] Glare com ${senderId} (estado: ${pc.signalingState}) - rejeitando oferta concorrente recente.`);
            return;
          }
          console.log(`[WebRTC 📞] Glare/Recuperação com ${senderId} (estado: ${pc.signalingState}, polite: ${isPolite}, stale: ${isOfferStale}) - executando rollback.`);
          try {
            await pc.setLocalDescription({ type: 'rollback' });
          } catch (rbErr) {
            console.warn('[WebRTC 📞] Falha ao executar rollback:', rbErr);
          }
        }

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        pc.lastOfferTime = null;
        pc.isIceRestarting = false;

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
          if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            pc.lastOfferTime = null;
            pc.isIceRestarting = false;

            if (pc.pendingCandidates && pc.pendingCandidates.length > 0) {
              for (const cand of pc.pendingCandidates) {
                try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {}
              }
              pc.pendingCandidates = [];
            }

            await this.applyBitrateParameters(pc);
          } else {
            console.warn(`[WebRTC 📞] Ignorando resposta de ${senderId} pois estado atual é ${pc.signalingState}`);
          }
        } catch (err) {
          console.error('[WebRTC] Erro ao processar resposta:', err);
        }
      }
    });

    this.socket.on('webrtc:ice-candidate', async ({ senderId, candidate }) => {
      const pc = this.peers.get(senderId);
      if (!pc || !candidate || pc.signalingState === 'closed') return;

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
        const nodeData = this.screenAudioNodes.get(peerId);
        if (nodeData) {
          try {
            nodeData.sourceNode.disconnect();
            nodeData.gainNode.disconnect();
          } catch (e) {}
          this.screenAudioNodes.delete(peerId);
        }
        const screenAudio = this.remoteScreenAudios.get(peerId);
        if (screenAudio) {
          screenAudio.srcObject = null;
        }
      }
    });

    this.socket.on('voice:peer-left', ({ peerId }) => {
      console.log(`[WebRTC 📞] Participante saiu: ${peerId}`);
      this.expectedPeers.delete(peerId);
      this.closePeer(peerId);
    });
  }

  optimizeSdp(sdp) {
    if (!sdp) return sdp;
    // 1. Áudio Opus HD (256 kbps estéreo, FEC e baixa latência)
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

    // 2. Injeta taxa de dados máxima de vídeo no SDP (b=AS e b=TIAS) para desabilitar restrições padrão do browser
    const targetKbps = Math.floor((this.streamBitrate || 12000000) / 1000);
    if (sdp.includes('m=video')) {
      sdp = sdp.replace(/(m=video[^\r\n]*\r?\n)/g, `$1b=AS:${targetKbps}\r\nb=TIAS:${targetKbps * 1000}\r\n`);
    }

    return sdp;
  }

  preferHardwareCodec(pc) {
    try {
      if (typeof pc.getTransceivers !== 'function' || typeof RTCRtpSender.getCapabilities !== 'function') return;
      const capabilities = RTCRtpSender.getCapabilities('video');
      if (!capabilities || !capabilities.codecs) return;

      // Prioriza codecs acelerados por GPU: H.264 (NVENC, AMD, Intel) e VP9
      const h264Codecs = capabilities.codecs.filter(c => c.mimeType.toLowerCase() === 'video/h264');
      const vp9Codecs = capabilities.codecs.filter(c => c.mimeType.toLowerCase() === 'video/vp9');
      const otherCodecs = capabilities.codecs.filter(c => !['video/h264', 'video/vp9'].includes(c.mimeType.toLowerCase()));
      const preferred = [...h264Codecs, ...vp9Codecs, ...otherCodecs];

      for (const t of pc.getTransceivers()) {
        if (t.sender && t.sender.track && t.sender.track.kind === 'video' && typeof t.setCodecPreferences === 'function') {
          try {
            t.setCodecPreferences(preferred);
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  async applyBitrateParameters(pc) {
    try {
      this.preferHardwareCodec(pc);
      const senders = pc.getSenders();
      for (const sender of senders) {
        if (sender.track && sender.track.kind === 'video') {
          const params = sender.getParameters();
          if (!params.encodings || params.encodings.length === 0) {
            params.encodings = [{}];
          }
          const targetBitrate = this.streamBitrate || 12000000;
          const targetFps = this.streamFps || 60;
          const targetDegradation = this.streamDegradation || 'maintain-framerate';

          params.encodings[0].maxBitrate = targetBitrate;
          params.encodings[0].maxFramerate = targetFps;
          params.encodings[0].degradationPreference = targetDegradation;
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
    if (!peerId || peerId === this.socket.id || peerId.startsWith('bot-')) return;
    const pc = this.getOrCreatePeer(peerId);
    try {
      if (pc.signalingState !== 'stable') {
        let retries = 5;
        while (pc.signalingState !== 'stable' && retries > 0) {
          await new Promise(r => setTimeout(r, 100));
          retries--;
        }
        if (pc.signalingState !== 'stable') {
          console.warn(`[WebRTC 📞] Conexão com ${peerId} ocupada em '${pc.signalingState}'. Adiada.`);
          return;
        }
      }

      let offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      offer.sdp = this.optimizeSdp(offer.sdp);
      await pc.setLocalDescription(offer);
      pc.lastOfferTime = Date.now();

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

  getOrCreatePeer(peerId, forceNew = false) {
    if (!forceNew && this.peers.has(peerId)) {
      const existingPc = this.peers.get(peerId);
      if (existingPc.connectionState !== 'closed' && existingPc.connectionState !== 'failed') {
        return existingPc;
      }
      console.log(`[WebRTC ♻️] Reciclando RTCPeerConnection fechada/falha de ${peerId}`);
      try {
        existingPc.onicecandidate = null;
        existingPc.ontrack = null;
        existingPc.oniceconnectionstatechange = null;
        existingPc.onconnectionstatechange = null;
        existingPc.close();
      } catch (e) {}
      this.peers.delete(peerId);
      this.peerSenders.delete(peerId);
    }

    const pc = new RTCPeerConnection(this.rtcConfig);
    pc.pendingCandidates = [];
    pc.createdAt = Date.now();
    pc.lastOfferTime = null;
    pc.isIceRestarting = false;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`[WebRTC 📞 ICE Candidate] ${peerId}: type=${event.candidate.type} proto=${event.candidate.protocol} addr=${event.candidate.address || event.candidate.ip}`);
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

        const handleVideoEnded = () => {
          console.log(`[WebRTC 📹] Track de vídeo finalizado (ended) de ${peerId}`);
          if (this.onRemoteRemove) {
            this.onRemoteRemove(peerId, 'video');
          }
        };

        event.track.onended = handleVideoEnded;
        event.track.onunmute = () => {
          console.log(`[WebRTC 📹] Track de vídeo reativado (unmute) de ${peerId}`);
        };
      } else if (event.track.kind === 'audio') {
        const isScreenAudio = (knownScreenAudioTrackId && event.track.id === knownScreenAudioTrackId) ||
                              (knownScreenStreamId && incomingStream.id === knownScreenStreamId) ||
                              (incomingStream.getVideoTracks && incomingStream.getVideoTracks().length > 0);

        try {
          this.socket.emit('client:diag', {
            event: 'ontrack-audio',
            peerId,
            trackId: event.track.id,
            streamId: incomingStream.id,
            isScreenAudio,
            knownScreenAudioTrackId,
            knownScreenStreamId
          });
        } catch (e) {}

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

    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC 📞 ICE] Peer ${peerId}: estado=${pc.iceConnectionState}`);
      try {
        this.socket.emit('client:diag', {
          event: 'ice-change',
          peerId,
          iceState: pc.iceConnectionState,
          connState: pc.connectionState
        });
      } catch (e) {}

      if (pc.iceConnectionState === 'failed') {
        console.warn(`[WebRTC ⚠️ ICE] ICE falhou para ${peerId}. Tentando ICE restart com oferta...`);
        this.restartIce(peerId);
      } else if (pc.iceConnectionState === 'disconnected') {
        this.scheduleIceCheck(peerId);
      } else if (pc.iceConnectionState === 'connected') {
        this.clearPeerTimers(peerId);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC 📞 Conexão] Peer ${peerId}: estado=${pc.connectionState}`);
      try {
        this.socket.emit('client:diag', {
          event: 'conn-change',
          peerId,
          connState: pc.connectionState,
          iceState: pc.iceConnectionState
        });
      } catch (e) {}

      if (pc.connectionState === 'failed') {
        console.warn(`[WebRTC ⚠️ Conexão] Conexão com ${peerId} falhou. Agendando auto-recuperação resiliente...`);
        this.scheduleAutoRecovery(peerId);
      } else if (pc.connectionState === 'connected') {
        this.clearPeerTimers(peerId);
        const audio = this.remoteVoiceAudios.get(peerId);
        if (audio && audio.paused && !this.isDeafened) {
          audio.play().catch(() => {});
        }
        try {
          pc.getStats().then(stats => {
            let selectedCandidatePair = null;
            stats.forEach(report => {
              if (report.type === 'transport' && report.selectedCandidatePairId) {
                selectedCandidatePair = stats.get(report.selectedCandidatePairId);
              }
            });
            if (selectedCandidatePair) {
              const localCand = stats.get(selectedCandidatePair.localCandidateId);
              const remoteCand = stats.get(selectedCandidatePair.remoteCandidateId);
              console.log(`[WebRTC 📞 CONECTADO] ${peerId}: local=${localCand?.candidateType} remote=${remoteCand?.candidateType}`);
              this.socket.emit('client:diag', {
                event: 'pair-selected',
                peerId,
                localType: localCand?.candidateType,
                remoteType: remoteCand?.candidateType
              });
            }
          }).catch(() => {});
        } catch (e) {}
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

    if (this.localCameraStream) {
      const cameraVideoTrack = this.localCameraStream.getVideoTracks()[0];
      if (cameraVideoTrack && !senders.cameraVideoSender) {
        senders.cameraVideoSender = pc.addTrack(cameraVideoTrack, this.localCameraStream);
      }
    }
  }

  getOutgoingAudioTrack() {
    if (this.noiseSuppressionEnabled && this.processedAudioStream && this.processedAudioStream.getAudioTracks().length > 0) {
      return this.processedAudioStream.getAudioTracks()[0];
    }
    if (this.localAudioStream && this.localAudioStream.getAudioTracks().length > 0) {
      return this.localAudioStream.getAudioTracks()[0];
    }
    if (this.processedAudioStream && this.processedAudioStream.getAudioTracks().length > 0) {
      return this.processedAudioStream.getAudioTracks()[0];
    }
    return null;
  }

  // Reproduzir Voz com suporte a reprodução nativa direta e amplificação até 200% via GainNode
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

    // Atribuição direta do stream WebRTC ao elemento <audio> (W3C standard)
    // Resolve o bug histórico do Chromium crbug.com/120148 que silenciava tracks sem sink direto
    if (audio.srcObject !== stream) {
      audio.srcObject = stream;
    }

    this.applyOutputDeviceToElement(audio);
    this.updatePeerVoiceGain(peerId);

    try {
      this.socket.emit('client:diag', {
        event: 'playRemoteVoice',
        peerId,
        paused: audio.paused,
        muted: audio.muted,
        volume: audio.volume,
        tracks: stream ? stream.getTracks().map(t => `${t.kind}:${t.readyState}:${t.enabled}`) : []
      });
    } catch (e) {}

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn(`[WebRTC 🎙️] Autoplay bloqueado para ${peerId}, aguardando clique:`, err);
        const unlock = () => {
          audio.play().catch(() => {});
          document.removeEventListener('click', unlock);
        };
        document.addEventListener('click', unlock);
      });
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      const unlockCtx = () => {
        this.audioContext.resume();
        document.removeEventListener('click', unlockCtx);
      };
      document.addEventListener('click', unlockCtx);
    }

    this.attachRemoteSpeechDetection(peerId, stream);
  }

  updatePeerVoiceGain(peerId) {
    let volPercent = 100;
    if (this.userVolumes.has(peerId)) {
      volPercent = this.userVolumes.get(peerId);
    } else if (typeof getUserConfig === 'function') {
      const cfg = getUserConfig(peerId);
      if (cfg && cfg.volume !== undefined) volPercent = cfg.volume;
    }

    let isMuted = false;
    if (this.userMutes.has(peerId)) {
      isMuted = this.userMutes.get(peerId);
    } else if (typeof getUserConfig === 'function') {
      const cfg = getUserConfig(peerId);
      if (cfg && cfg.muted !== undefined) isMuted = cfg.muted;
    }

    const isDeaf = this.isDeafened || false;
    const shouldMute = isMuted || isDeaf;
    const gainVal = shouldMute ? 0.0 : (volPercent / 100);

    const audio = this.remoteVoiceAudios.get(peerId);
    let nodeData = this.voiceAudioNodes.get(peerId);

    // Se o usuário configurou amplificação acima de 100% (até 500%), roteia pelo GainNode da Web Audio API
    if (volPercent > 100 && !shouldMute && audio && audio.srcObject) {
      if (nodeData && nodeData.stream !== audio.srcObject) {
        try {
          nodeData.sourceNode.disconnect();
          nodeData.gainNode.disconnect();
        } catch (e) {}
        nodeData = null;
        this.voiceAudioNodes.delete(peerId);
      }
      if (!nodeData) {
        try {
          this.ensureAudioContext();
          if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(() => {});
          }
          const sourceNode = this.audioContext.createMediaStreamSource(audio.srcObject);
          const gainNode = this.audioContext.createGain();
          sourceNode.connect(gainNode);
          gainNode.connect(this.audioContext.destination);
          nodeData = { sourceNode, gainNode, stream: audio.srcObject };
          this.voiceAudioNodes.set(peerId, nodeData);
        } catch (e) {
          console.warn('[WebRTC] Falha ao criar GainNode para amplificação de voz > 100%:', e);
        }
      } else if (nodeData.stream !== audio.srcObject) {
        try {
          nodeData.sourceNode.disconnect();
          nodeData.sourceNode = this.audioContext.createMediaStreamSource(audio.srcObject);
          nodeData.sourceNode.connect(nodeData.gainNode);
          nodeData.stream = audio.srcObject;
        } catch (e) {
          console.warn('[WebRTC] Erro ao reconectar novo stream de voz ao GainNode:', e);
        }
      }
      if (nodeData && nodeData.gainNode && this.audioContext) {
        try {
          nodeData.gainNode.gain.setValueAtTime(gainVal, this.audioContext.currentTime);
        } catch (e) {
          nodeData.gainNode.gain.value = gainVal;
        }
      }
      // Silencia a saída direta do elemento HTML para que o áudio não toque duas vezes
      audio.muted = true;
    } else {
      // Volume normal de 0% a 100% ou mutado: toca nativamente no elemento de áudio (baixa latência e máxima fidelidade)
      if (nodeData && nodeData.gainNode && this.audioContext) {
        try {
          nodeData.gainNode.gain.setValueAtTime(0.0, this.audioContext.currentTime);
        } catch (e) {
          nodeData.gainNode.gain.value = 0.0;
        }
      }
      if (audio) {
        audio.muted = shouldMute;
        audio.volume = Math.max(0, Math.min(1.0, gainVal));
        if (!shouldMute && audio.paused) {
          audio.play().catch(() => {});
        }
      }
    }
  }

  // Reproduzir Áudio de Tela com isolamento de Ducking (Web Audio API)
  playRemoteScreenAudio(peerId, stream) {
    this.ensureAudioContext();

    // 1. Elemento HTML <audio> com muted=true para manter o WebRTC pull model ativo
    // sem sofrer ducking de AEC/NLP quando o espectador falar no microfone
    let audio = this.remoteScreenAudios.get(peerId);
    if (!audio) {
      audio = document.createElement('audio');
      audio.autoplay = true;
      audio.playsInline = true;
      audio.id = `screen-audio-${peerId}`;
      audio.muted = true;
      document.body.appendChild(audio);
      this.remoteScreenAudios.set(peerId, audio);
    }
    audio.srcObject = stream;
    audio.muted = true;
    audio.play().catch(() => {});

    // 2. Roteamento via Web Audio API (AudioDestinationNode)
    // O destino do AudioContext é independente do WebRTC APM NLP, garantindo que o volume
    // da transmissão NUNCA seja reduzido/abaixado quando o espectador falar na chamada!
    let nodeData = this.screenAudioNodes.get(peerId);
    if (!nodeData) {
      try {
        const sourceNode = this.audioContext.createMediaStreamSource(stream);
        const gainNode = this.audioContext.createGain();
        sourceNode.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        nodeData = { sourceNode, gainNode, stream };
        this.screenAudioNodes.set(peerId, nodeData);
      } catch (err) {
        console.warn('[WebRTC] Falha ao rotear tela via AudioContext, fallback para elemento audio:', err);
        audio.muted = this.userScreenAudioMutes.get(peerId) || false;
        this.applyOutputDeviceToElement(audio);
      }
    } else if (nodeData.stream !== stream) {
      try {
        nodeData.sourceNode.disconnect();
        nodeData.sourceNode = this.audioContext.createMediaStreamSource(stream);
        nodeData.sourceNode.connect(nodeData.gainNode);
        nodeData.stream = stream;
      } catch (err) {
        console.warn('[WebRTC] Erro ao reconectar stream de tela ao AudioContext:', err);
      }
    }

    this.updatePeerScreenAudioGain(peerId);

    // Desbloqueia reprodução caso o AudioContext esteja suspenso
    if (this.audioContext.state === 'suspended') {
      const unlock = () => {
        this.audioContext.resume();
        document.removeEventListener('click', unlock);
      };
      document.addEventListener('click', unlock);
    }
  }

  updatePeerScreenAudioGain(peerId) {
    const volPercent = this.userScreenVolumes.has(peerId) ? this.userScreenVolumes.get(peerId) : 100;
    const isSfxMuted = this.userScreenAudioMutes.get(peerId) || false;
    const isDeaf = this.isDeafened || false;
    const shouldMute = isSfxMuted || isDeaf;
    const gainVal = shouldMute ? 0.0 : (volPercent / 100);

    const nodeData = this.screenAudioNodes.get(peerId);
    if (nodeData && nodeData.gainNode && this.audioContext) {
      try {
        nodeData.gainNode.gain.setValueAtTime(gainVal, this.audioContext.currentTime);
      } catch (e) {
        nodeData.gainNode.gain.value = gainVal;
      }
    }

    const audio = this.remoteScreenAudios.get(peerId);
    if (audio && !nodeData) {
      audio.volume = Math.max(0, Math.min(1.0, gainVal));
      audio.muted = shouldMute;
    }
  }

  applyOutputDeviceToElement(audioEl) {
    if (audioEl && typeof audioEl.setSinkId === 'function' && this.selectedOutputDeviceId && this.selectedOutputDeviceId !== 'default') {
      audioEl.setSinkId(this.selectedOutputDeviceId).catch(err => {
        console.warn('Erro ao definir sinkId no elemento de áudio, restaurando dispositivo padrão:', err);
        this.selectedOutputDeviceId = 'default';
        localStorage.removeItem('discord_output_device');
        audioEl.setSinkId('').catch(() => {});
      });
    }
  }

  attachRemoteSpeechDetection(peerId, stream) {
    try {
      this.ensureAudioContext();
      if (this.remoteSpeechIntervals && this.remoteSpeechIntervals.has(peerId)) {
        clearInterval(this.remoteSpeechIntervals.get(peerId));
        this.remoteSpeechIntervals.delete(peerId);
      }
      const source = this.audioContext.createMediaStreamSource(stream);
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);
      let wasSpeaking = false;

      const interval = setInterval(() => {
        if (!this.remoteVoiceAudios.has(peerId)) {
          clearInterval(interval);
          if (this.remoteSpeechIntervals) this.remoteSpeechIntervals.delete(peerId);
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
      if (!this.remoteSpeechIntervals) this.remoteSpeechIntervals = new Map();
      this.remoteSpeechIntervals.set(peerId, interval);
    } catch (e) {}
  }

  // Capturar microfone local
  async startAudio() {
    this.ensureAudioContext();

    const audioConstraints = {
      channelCount: { ideal: 1 },
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: false,
      googAutoGainControl: false,
      googAutoGainControl2: false,
      googNoiseSuppression: true,
      googHighpassFilter: true,
      googDucking: false,
      sampleRate: 48000
    };

    if (this.selectedInputDeviceId && this.selectedInputDeviceId !== 'default') {
      audioConstraints.deviceId = { exact: this.selectedInputDeviceId };
    }

    try {
      try {
        this.localAudioStream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: false
        });
      } catch (devErr) {
        if (this.selectedInputDeviceId && this.selectedInputDeviceId !== 'default') {
          console.warn('[WebRTC 🎤] Microfone específico indisponível, revertendo para microfone padrão:', devErr);
          this.selectedInputDeviceId = 'default';
          localStorage.removeItem('discord_input_device');
          delete audioConstraints.deviceId;
          this.localAudioStream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
            video: false
          });
        } else {
          throw devErr;
        }
      }

      console.log('[WebRTC 🎤] Microfone capturado com sucesso!');
      this.isMuted = false;

      if (this.audioContext && this.audioContext.state === 'suspended') {
        try { await this.audioContext.resume(); } catch (e) {}
      }

      await this.setupAudioProcessingChain(this.localAudioStream);

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
      this.startWatchdog();
      return this.localAudioStream;
    } catch (err) {
      console.error('[WebRTC] Erro ao capturar microfone:', err);
      alert('Não foi possível acessar o microfone! Verifique as permissões.');
      return null;
    }
  }

  async setupAudioProcessingChain(rawStream) {
    try {
      this.ensureAudioContext();

      if (this.localSourceNode) {
        try { this.localSourceNode.disconnect(); } catch (e) {}
      }
      if (this.rnnoiseNode) {
        try {
          this.rnnoiseNode.port.postMessage('destroy');
          this.rnnoiseNode.disconnect();
        } catch (e) {}
        this.rnnoiseNode = null;
      }

      this.localSourceNode = this.audioContext.createMediaStreamSource(rawStream);
      this.destinationNode = this.audioContext.createMediaStreamDestination();
      this.destinationNode.channelCount = 2;
      this.destinationNode.channelCountMode = 'explicit';
      this.destinationNode.channelInterpretation = 'speakers';

      // Nó mestre de saída para mutação instantânea
      this.outputGainNode = this.audioContext.createGain();
      this.outputGainNode.gain.value = this.isMuted ? 0.0 : 1.0;
      this.outputGainNode.connect(this.destinationNode);

      // Ganhos Wet (RNNoise) e Dry (Bypass direto) - inicia em bypass 100% para áudio nunca ficar mudo
      this.rnnoiseGainNode = this.audioContext.createGain();
      this.bypassGainNode = this.audioContext.createGain();

      this.rnnoiseGainNode.gain.value = 0.0;
      this.bypassGainNode.gain.value = 1.0;

      this.rnnoiseGainNode.connect(this.outputGainNode);
      this.bypassGainNode.connect(this.outputGainNode);

      // Normalização de entrada: extrai L e R e soma em sinal mono limpo
      // Suporta nativamente microfones estéreo e interfaces de áudio USB (Focusrite, Behringer, etc)
      const inputSplitter = this.audioContext.createChannelSplitter(2);
      const inputMonoSum = this.audioContext.createGain();
      inputMonoSum.channelCount = 1;
      inputMonoSum.channelCountMode = 'explicit';

      this.localSourceNode.connect(inputSplitter);
      inputSplitter.connect(inputMonoSum, 0); // Canal 0 (Left)
      try { inputSplitter.connect(inputMonoSum, 1); } catch (e) {} // Canal 1 (Right)

      // Filtro subsônico (40Hz) eliminando estalos mecânicos sem afetar a voz
      const subFilter = this.audioContext.createBiquadFilter();
      subFilter.type = 'highpass';
      subFilter.frequency.value = 40;
      subFilter.channelCount = 1;
      subFilter.channelCountMode = 'explicit';

      inputMonoSum.connect(subFilter);

      // Rota de Bypass: duplica o sinal mono para ambos os lados (Left e Right)
      const bypassMerger = this.audioContext.createChannelMerger(2);
      subFilter.connect(bypassMerger, 0, 0); // mono -> Left
      subFilter.connect(bypassMerger, 0, 1); // mono -> Right
      bypassMerger.connect(this.bypassGainNode);

      // Instancia o modelo RNNoise em WebAssembly dentro de um AudioWorklet isolado
      let rnnoiseReady = false;
      try {
        const wasm = await preloadRnnoise();
        if (this.audioContext.audioWorklet && !rnnoiseWorkletLoaded) {
          await this.audioContext.audioWorklet.addModule('/rnnoise/workletProcessor.js?v=20261006_v1');
          rnnoiseWorkletLoaded = true;
        }

        if (wasm && rnnoiseWorkletLoaded) {
          this.rnnoiseNode = new AudioWorkletNode(this.audioContext, '@sapphi-red/web-noise-suppressor/rnnoise', {
            processorOptions: {
              maxChannels: 1,
              wasmBinary: wasm
            }
          });

          subFilter.connect(this.rnnoiseNode);

          // Rota RNNoise: Duplica o sinal filtrado pelo modelo neural para AMBOS os lados (Left e Right)
          const rnnoiseMerger = this.audioContext.createChannelMerger(2);
          this.rnnoiseNode.connect(rnnoiseMerger, 0, 0); // Voz neural limpa -> Left
          this.rnnoiseNode.connect(rnnoiseMerger, 0, 1); // Voz neural limpa -> Right
          rnnoiseMerger.connect(this.rnnoiseGainNode);

          rnnoiseReady = true;
          console.log('[WebRTC 🤖 RNNoise] Supressor neural (RNN/GRU) ativado com sucesso em 48kHz (Dual-Mono Centrado nos dois lados)!');
        }
      } catch (rnErr) {
        console.warn('[WebRTC 🤖 RNNoise] Aviso ao instanciar RNNoise, operando em bypass:', rnErr);
      }

      if (rnnoiseReady && this.noiseSuppressionEnabled) {
        this.bypassGainNode.gain.value = 0.0;
        this.rnnoiseGainNode.gain.value = 1.0;
      } else {
        this.bypassGainNode.gain.value = 1.0;
        this.rnnoiseGainNode.gain.value = 0.0;
      }

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

    if (this.audioContext && typeof this.audioContext.setSinkId === 'function') {
      try {
        await this.audioContext.setSinkId(deviceId === 'default' ? '' : deviceId);
      } catch (e) {
        console.warn('Erro ao setSinkId no AudioContext:', e);
      }
    }

    this.remoteVoiceAudios.forEach(audio => this.applyOutputDeviceToElement(audio));
    this.remoteScreenAudios.forEach(audio => this.applyOutputDeviceToElement(audio));
    document.querySelectorAll('audio').forEach(audio => this.applyOutputDeviceToElement(audio));
  }

  setNoiseSuppression(enabled) {
    this.noiseSuppressionEnabled = !!enabled;
    localStorage.setItem('discord_rnnoise_enabled', this.noiseSuppressionEnabled ? 'true' : 'false');

    if (this.rnnoiseGainNode && this.bypassGainNode && this.audioContext) {
      const now = this.audioContext.currentTime;
      if (this.noiseSuppressionEnabled && this.rnnoiseNode) {
        this.bypassGainNode.gain.setTargetAtTime(0.0, now, 0.02);
        this.rnnoiseGainNode.gain.setTargetAtTime(1.0, now, 0.02);
      } else {
        this.rnnoiseGainNode.gain.setTargetAtTime(0.0, now, 0.02);
        this.bypassGainNode.gain.setTargetAtTime(1.0, now, 0.02);
      }
    }
    console.log(`[WebRTC 🤖 RNNoise] Supressão de ruído: ${this.noiseSuppressionEnabled ? 'ATIVADA' : 'DESATIVADA'}`);
  }

  setMuted(muted) {
    this.isMuted = !!muted;
    if (this.localAudioStream) {
      this.localAudioStream.getAudioTracks().forEach(track => {
        track.enabled = !this.isMuted;
      });
    }
    if (this.processedAudioStream) {
      this.processedAudioStream.getAudioTracks().forEach(track => {
        track.enabled = !this.isMuted;
      });
    }
    if (this.outputGainNode) {
      this.outputGainNode.gain.value = this.isMuted ? 0.0 : 1.0;
    }
    return this.isMuted;
  }

  toggleMute() {
    return this.setMuted(!this.isMuted);
  }

  // Configuração dinâmica de qualidade de transmissão de tela
  getStreamConstraints() {
    const resolutionMap = {
      '720p': { width: 1280, height: 720 },
      '1080p': { width: 1920, height: 1080 },
      '1440p': { width: 2560, height: 1440 },
      'source': { width: 3840, height: 2160 }
    };
    const res = resolutionMap[this.streamResolution] || resolutionMap['1080p'];
    const targetFps = this.streamFps || 60;
    return {
      res,
      targetFps,
      videoConstraints: {
        frameRate: { ideal: targetFps, max: targetFps },
        width: { ideal: res.width, max: 3840 },
        height: { ideal: res.height, max: 2160 },
        cursor: 'always'
      }
    };
  }

  setStreamQuality(arg1, arg2, arg3, arg4) {
    let resolution, fps, bitrate, degradation;

    if (arg1 && typeof arg1 === 'object') {
      resolution = arg1.resolution;
      fps = arg1.fps;
      bitrate = arg1.bitrate;
      degradation = arg1.degradation;
    } else {
      resolution = arg1;
      fps = arg2;
      bitrate = arg3;
      degradation = arg4;
    }

    if (resolution && typeof resolution === 'string' && resolution !== '[object Object]') {
      this.streamResolution = resolution;
      localStorage.setItem('discord_stream_resolution', resolution);
    }

    if (fps !== undefined && fps !== null) {
      const parsedFps = parseInt(fps, 10);
      if (!isNaN(parsedFps) && parsedFps > 0) {
        this.streamFps = parsedFps;
        localStorage.setItem('discord_stream_fps', String(parsedFps));
      }
    }

    if (bitrate) {
      if (typeof bitrate === 'string' && this.bitrateMap[bitrate]) {
        this.streamBitrateKey = bitrate;
        this.streamBitrate = this.bitrateMap[bitrate];
        localStorage.setItem('discord_stream_bitrate', bitrate);
      } else {
        const numB = parseInt(bitrate, 10);
        if (!isNaN(numB)) {
          this.streamBitrate = numB;
          const matchKey = Object.keys(this.bitrateMap).find(k => this.bitrateMap[k] === numB) || '8M';
          this.streamBitrateKey = matchKey;
          localStorage.setItem('discord_stream_bitrate', matchKey);
        }
      }
    }

    if (degradation && typeof degradation === 'string' && degradation !== '[object Object]') {
      this.streamDegradation = degradation;
      localStorage.setItem('discord_stream_degradation', degradation);
    }

    this.applyStreamQualityToActiveSenders();
  }

  async applyStreamQualityToActiveSenders() {
    if (!this.isScreenSharing || !this.localScreenStream) return;
    const videoTrack = this.localScreenStream.getVideoTracks()[0];
    const { res, targetFps } = this.getStreamConstraints();

    if (videoTrack) {
      try {
        if ('contentHint' in videoTrack) {
          videoTrack.contentHint = (this.streamDegradation === 'maintain-resolution') ? 'detail' : 'motion';
        }
      } catch (e) {}
      try {
        if (typeof videoTrack.applyConstraints === 'function') {
          await videoTrack.applyConstraints({
            frameRate: { ideal: targetFps, max: targetFps },
            width: { ideal: res.width, max: 3840 },
            height: { ideal: res.height, max: 2160 }
          });
        }
      } catch (e) {}
    }

    for (const [peerId, pc] of this.peers.entries()) {
      await this.applyBitrateParameters(pc);
    }
  }

  // Compartilhamento de Tela 100% Compatível e Robusto (W3C Standard)
  async startScreenShare(forceVideoOnly = false) {
    try {
      let stream;
      const { videoConstraints } = this.getStreamConstraints();
      if (forceVideoOnly) {
        console.log('[WebRTC] Solicitando getDisplayMedia forçado sem áudio...');
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: videoConstraints,
          audio: false
        });
      } else {
        console.log(`[WebRTC] Solicitando getDisplayMedia 60 FPS (${this.streamResolution}, ${this.streamFps}fps)...`);
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: videoConstraints,
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
              googEchoCancellation: false,
              googAutoGainControl: false,
              googNoiseSuppression: false,
              googDucking: false,
              suppressLocalAudioPlayback: false
            }
          });
        } catch (mediaErr) {
          console.warn('[WebRTC] Tentativa inicial com áudio falhou:', mediaErr);
          const isAudioError = mediaErr.name === 'NotReadableError' ||
                               (mediaErr.message && mediaErr.message.toLowerCase().includes('audio'));
          if (isAudioError) {
            console.warn('[WebRTC] Driver de som do Windows bloqueou a captura (NotReadableError). Tentando fallback imediato para vídeo...');
            try {
              stream = await navigator.mediaDevices.getDisplayMedia({
                video: videoConstraints,
                audio: false
              });
              console.log('[WebRTC] Fallback para vídeo concluído com sucesso!');
            } catch (fallbackErr) {
              console.warn('[WebRTC] Fallback imediato rejeitado (novo gesto necessário):', fallbackErr);
              const customErr = new Error('O driver de áudio do sistema bloqueou a captura (Could not start audio source).');
              customErr.name = 'AudioDriverBlockedError';
              customErr.isAudioDriverBlock = true;
              customErr.originalError = mediaErr;
              throw customErr;
            }
          } else {
            throw mediaErr;
          }
        }
      }

      if (!stream) {
        return null;
      }

      return await this.setupLocalScreenStream(stream);
    } catch (err) {
      console.error('[WebRTC] Falha ao capturar tela:', err);
      try {
        this.socket.emit('client:error', {
          action: 'startScreenShare',
          message: err.message || String(err),
          name: err.name,
          stack: err.stack,
          isAudioDriverBlock: !!err.isAudioDriverBlock
        });
      } catch (e) {}
      this.isScreenSharing = false;
      throw err;
    }
  }

  // Captura direta de tela/janela para aplicativo Electron Desktop
  async startScreenShareWithDesktopSource(sourceId) {
    try {
      let stream;
      const { res, targetFps } = this.getStreamConstraints();
      console.log(`[WebRTC] Capturando fonte desktop no Electron (${res.width}x${res.height} @ ${targetFps}fps):`, sourceId);

      // 1. Tenta capturar vídeo HD com áudio do sistema (loopback)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            mandatory: {
              chromeMediaSource: 'desktop'
            }
          },
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId,
              maxWidth: res.width,
              maxHeight: res.height,
              maxFrameRate: targetFps
            }
          }
        });
        console.log('[WebRTC 🔊] Captura de tela com áudio do sistema iniciada!');
      } catch (audioErr) {
        console.warn('[WebRTC] Captura com áudio falhou ou bloqueada, tentando fallback vídeo puro:', audioErr);
        // 2. Fallback imediato apenas vídeo
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId,
              maxWidth: res.width,
              maxHeight: res.height,
              maxFrameRate: targetFps
            }
          }
        });
        console.log('[WebRTC 📺] Captura de tela sem áudio iniciada!');
      }

      if (!stream) {
        return null;
      }

      return await this.setupLocalScreenStream(stream);
    } catch (err) {
      console.error('[WebRTC] Falha ao capturar tela no Electron:', err);
      try {
        this.socket.emit('client:error', {
          action: 'startScreenShareWithDesktopSource',
          message: err.message || String(err),
          name: err.name,
          stack: err.stack
        });
      } catch (e) {}
      this.isScreenSharing = false;
      throw err;
    }
  }

  async setupLocalScreenStream(stream) {
    if (!stream) return null;

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
      const { res, targetFps } = this.getStreamConstraints();
      try {
        if ('contentHint' in screenVideoTrack) {
          screenVideoTrack.contentHint = (this.streamDegradation === 'maintain-resolution') ? 'detail' : 'motion';
        }
      } catch (e) {}

      try {
        if (typeof screenVideoTrack.applyConstraints === 'function') {
          screenVideoTrack.applyConstraints({
            frameRate: { ideal: targetFps, max: targetFps },
            width: { ideal: res.width, max: 3840 },
            height: { ideal: res.height, max: 2160 }
          }).catch(() => {});
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
  }

  stopRemoteScreen(peerId) {
    if (!peerId) return;
    const screenAudio = this.remoteScreenAudios.get(peerId);
    if (screenAudio) {
      try {
        screenAudio.pause();
        screenAudio.srcObject = null;
      } catch (e) {}
      this.remoteScreenAudios.delete(peerId);
    }
    this.peerScreenStreamIds.delete(peerId);
    this.peerScreenAudioTrackIds.delete(peerId);
  }

  async stopScreenShare() {
    this.isScreenSharing = false;

    // 1. Notifica o servidor IMEDIATAMENTE via Socket.io para que todos os peers saibam instantaneamente
    try {
      this.socket.emit('voice:screen-status', { isSharing: false });
    } catch (sockErr) {
      console.warn('[WebRTC] Falha ao emitir voice:screen-status:', sockErr);
    }

    // 2. Interrompe IMEDIATAMENTE todas as tracks de mídia locais
    if (this.localScreenStream) {
      try {
        const tracks = this.localScreenStream.getTracks();
        tracks.forEach(track => {
          try { track.stop(); } catch (e) {}
        });
      } catch (trackErr) {
        console.warn('[WebRTC] Falha ao parar tracks de tela:', trackErr);
      }
      this.localScreenStream = null;
      this.localScreenAudioTrackId = null;
    }

    // 3. Notifica a UI local caso o encerramento tenha sido acionado pelo banner nativo do sistema/navegador
    if (this.onLocalScreenStopped) {
      try { this.onLocalScreenStopped(); } catch (uiErr) {}
    }

    // 4. Remove senders de cada peer e renegocia a conexão individualmente de forma resiliente
    for (const [peerId, pc] of this.peers.entries()) {
      try {
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
      } catch (peerErr) {
        console.warn(`[WebRTC] Falha ao renegociar encerramento de tela com ${peerId}:`, peerErr);
      }
    }
  }

  async startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });
      this.localCameraStream = stream;
      this.isCameraActive = true;
      const cameraTrack = stream.getVideoTracks()[0];

      if (cameraTrack) {
        cameraTrack.onended = () => {
          this.stopCamera();
        };
      }

      for (const [peerId, pc] of this.peers.entries()) {
        try {
          const senders = this.getPeerSenders(peerId);
          if (senders.cameraVideoSender) {
            try { pc.removeTrack(senders.cameraVideoSender); } catch (e) {}
            senders.cameraVideoSender = null;
          }
          if (cameraTrack) {
            senders.cameraVideoSender = pc.addTrack(cameraTrack, this.localCameraStream);
          }
          await this.renegotiate(pc, peerId, {
            screenStreamId: this.localCameraStream.id
          });
          await this.applyBitrateParameters(pc);
        } catch (peerErr) {
          console.warn(`[WebRTC] Falha ao enviar vídeo da câmera para ${peerId}:`, peerErr);
        }
      }

      try {
        this.socket.emit('voice:camera-status', { isActive: true });
      } catch (sockErr) {}

      return this.localCameraStream;
    } catch (err) {
      console.error('[WebRTC] Falha ao capturar câmera:', err);
      this.localCameraStream = null;
      this.isCameraActive = false;
      throw err;
    }
  }

  async stopCamera() {
    if (this.localCameraStream) {
      const tracks = this.localCameraStream.getTracks();
      for (const [peerId, pc] of this.peers.entries()) {
        const senders = this.getPeerSenders(peerId);
        if (senders.cameraVideoSender) {
          try { pc.removeTrack(senders.cameraVideoSender); } catch (e) {}
          senders.cameraVideoSender = null;
        }
        await this.renegotiate(pc, peerId, { isCameraStopped: true });
      }
      tracks.forEach(t => t.stop());
      this.localCameraStream = null;
    }
    this.isCameraActive = false;
    try {
      this.socket.emit('voice:camera-status', { isActive: false });
      if (!this.isScreenSharing) {
        this.socket.emit('voice:screen-status', { isSharing: false });
      }
    } catch (e) {}
  }

  async renegotiate(pc, targetId, extraData = {}) {
    if (!targetId || !pc) return;
    try {
      let retries = 10;
      while (pc.signalingState !== 'stable' && retries > 0) {
        await new Promise(r => setTimeout(r, 150));
        retries--;
      }
      if (pc.signalingState !== 'stable') {
        console.warn(`[WebRTC 📞] Renegociação adiada com ${targetId}: estado=${pc.signalingState}`);
        return;
      }

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
      if (this.analyserTimer) {
        clearInterval(this.analyserTimer);
        this.analyserTimer = null;
      }

      const meterSource = this.audioContext.createMediaStreamSource(this.processedAudioStream || stream);
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

        // Detecção de voz ativa (VAD) sobre o áudio neural processado pelo RNNoise
        const isSpeaking = avg > 10;

        if (isSpeaking !== wasSpeaking) {
          wasSpeaking = isSpeaking;
          if (this.onSpeakingChange) this.onSpeakingChange(isSpeaking);
        }
      }, 60);
    } catch (e) {}
  }

  clearPeerTimers(peerId) {
    if (this.recoveryTimers.has(peerId)) {
      clearTimeout(this.recoveryTimers.get(peerId));
      this.recoveryTimers.delete(peerId);
    }
    if (this.iceCheckTimers.has(peerId)) {
      clearTimeout(this.iceCheckTimers.get(peerId));
      this.iceCheckTimers.delete(peerId);
    }
  }

  scheduleIceCheck(peerId) {
    if (this.iceCheckTimers.has(peerId)) return;
    const timer = setTimeout(() => {
      this.iceCheckTimers.delete(peerId);
      if (this.isInVoice && this.expectedPeers.has(peerId)) {
        const pc = this.peers.get(peerId);
        if (pc && (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed')) {
          console.log(`[WebRTC 🔄 ICE Check] ICE persistiu '${pc.iceConnectionState}' para ${peerId} após 3s. Reiniciando ICE...`);
          this.restartIce(peerId);
        }
      }
    }, 3000);
    this.iceCheckTimers.set(peerId, timer);
  }

  scheduleAutoRecovery(peerId) {
    if (this.recoveryTimers.has(peerId)) return;
    const timer = setTimeout(() => {
      this.recoveryTimers.delete(peerId);
      if (this.isInVoice && this.expectedPeers.has(peerId)) {
        const pc = this.peers.get(peerId);
        if (!pc || pc.connectionState === 'failed' || pc.iceConnectionState === 'failed') {
          console.log(`[WebRTC 🔄 Auto-Recuperação] Executando reconexão resiliente para ${peerId}...`);
          this.reconnectPeer(peerId);
        }
      }
    }, 1500);
    this.recoveryTimers.set(peerId, timer);
  }

  async restartIce(peerId) {
    const pc = this.peers.get(peerId);
    if (!pc || pc.connectionState === 'closed') {
      return this.reconnectPeer(peerId);
    }
    if (pc.isIceRestarting) {
      console.log(`[WebRTC 🔄 ICE Restart] ICE restart já em andamento para ${peerId}.`);
      return;
    }
    pc.isIceRestarting = true;
    try {
      console.log(`[WebRTC 🔄 ICE Restart] Gerando nova oferta com iceRestart=true para ${peerId}...`);
      if (typeof pc.restartIce === 'function') {
        pc.restartIce();
      }
      let offer = await pc.createOffer({ iceRestart: true });
      offer.sdp = this.optimizeSdp(offer.sdp);
      await pc.setLocalDescription(offer);
      pc.lastOfferTime = Date.now();

      this.socket.emit('webrtc:offer', {
        targetId: peerId,
        offer,
        type: 'ice-restart',
        screenStreamId: this.localScreenStream ? this.localScreenStream.id : null,
        screenAudioTrackId: this.localScreenAudioTrackId
      });

      // Se após 5s o ICE ainda não recuperou, reconecta por completo
      setTimeout(() => {
        pc.isIceRestarting = false;
        if (this.isInVoice && this.expectedPeers.has(peerId)) {
          if (pc.iceConnectionState === 'failed' || pc.connectionState === 'failed') {
            console.warn(`[WebRTC ⚠️ ICE Restart] ICE restart não concluiu para ${peerId}. Recriando conexão completa...`);
            this.reconnectPeer(peerId);
          }
        }
      }, 5000);
    } catch (err) {
      pc.isIceRestarting = false;
      console.warn(`[WebRTC 🔄 ICE Restart] Erro ao criar oferta de ICE restart para ${peerId}:`, err);
      this.reconnectPeer(peerId);
    }
  }

  async reconnectPeer(peerId) {
    if (!this.isInVoice || !this.expectedPeers.has(peerId)) {
      return;
    }
    if (this.reconnectingPeers.has(peerId)) {
      return;
    }
    this.reconnectingPeers.add(peerId);

    try {
      console.log(`[WebRTC 🔄 Auto-Reconexão] Recriando conexão peer a peer com ${peerId}...`);
      this.clearPeerTimers(peerId);

      const oldPc = this.peers.get(peerId);
      if (oldPc) {
        try {
          oldPc.onicecandidate = null;
          oldPc.ontrack = null;
          oldPc.oniceconnectionstatechange = null;
          oldPc.onconnectionstatechange = null;
          oldPc.close();
        } catch (e) {}
        this.peers.delete(peerId);
      }
      this.peerSenders.delete(peerId);

      const newPc = this.getOrCreatePeer(peerId, true);

      // Espera polite (350ms) se for polite peer para evitar colisão de ofertas simultâneas
      const isPolite = (this.socket && this.socket.id) ? this.socket.id > peerId : false;
      if (isPolite) {
        await new Promise(r => setTimeout(r, 350));
        if (newPc.remoteDescription) {
          console.log(`[WebRTC 🔄 Auto-Reconexão] Oferta de ${peerId} já recebida durante espera polite.`);
          this.reconnectingPeers.delete(peerId);
          return;
        }
      }

      await this.initiateCallTo(peerId);
    } catch (err) {
      console.error(`[WebRTC 🔄 Auto-Reconexão] Falha ao reconectar ${peerId}:`, err);
    } finally {
      setTimeout(() => {
        this.reconnectingPeers.delete(peerId);
      }, 2000);
    }
  }

  healMeshConnections() {
    if (!this.isInVoice) return;

    for (const peerId of this.expectedPeers) {
      if (peerId === this.socket.id || (peerId && peerId.startsWith('bot-'))) continue;

      const pc = this.peers.get(peerId);
      if (!pc || pc.connectionState === 'closed' || pc.connectionState === 'failed') {
        console.log(`[WebRTC 🩺 Watchdog] Conexão ausente ou falha para peer ${peerId}. Auto-reconectando...`);
        this.reconnectPeer(peerId);
        continue;
      }

      const age = Date.now() - (pc.createdAt || Date.now());
      if ((pc.connectionState === 'new' || pc.connectionState === 'connecting') && age > 12000) {
        console.log(`[WebRTC 🩺 Watchdog] Conexão congelada em '${pc.connectionState}' há ${Math.round(age/1000)}s para peer ${peerId}. Reiniciando...`);
        this.reconnectPeer(peerId);
        continue;
      }

      if (pc.iceConnectionState === 'failed') {
        console.log(`[WebRTC 🩺 Watchdog] ICE em 'failed' para peer ${peerId}. Reiniciando ICE...`);
        this.restartIce(peerId);
        continue;
      }

      if (pc.connectionState === 'connected') {
        const voiceAudio = this.remoteVoiceAudios.get(peerId);
        if (voiceAudio && voiceAudio.paused && !this.isDeafened && !this.userMutes.get(peerId)) {
          console.log(`[WebRTC 🩺 Watchdog] Áudio pausado detectado para peer ${peerId}. Resumindo play()...`);
          voiceAudio.play().catch(() => {});
        }
      }
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    try {
      const summary = {};
      for (const pId of this.expectedPeers) {
        if (pId === this.socket.id || (pId && pId.startsWith('bot-'))) continue;
        const pConn = this.peers.get(pId);
        const pAud = this.remoteVoiceAudios.get(pId);
        summary[pId] = {
          conn: pConn ? pConn.connectionState : 'none',
          ice: pConn ? pConn.iceConnectionState : 'none',
          sig: pConn ? pConn.signalingState : 'none',
          aud: !!pAud,
          paused: pAud ? pAud.paused : null,
          muted: pAud ? pAud.muted : null,
          vol: pAud ? pAud.volume : null
        };
      }
      this.socket.emit('client:diag', {
        event: 'watchdog-summary',
        summary
      });
    } catch (e) {}
  }

  syncRoomPeers(peerIds) {
    if (!this.isInVoice) return;
    const newExpected = new Set(peerIds.filter(id => id && id !== this.socket.id && !id.startsWith('bot-')));
    this.expectedPeers = newExpected;

    // Remove peers que não estão mais na sala
    for (const peerId of Array.from(this.peers.keys())) {
      if (!this.expectedPeers.has(peerId)) {
        console.log(`[WebRTC 🧹] Peer ${peerId} não está mais no canal de voz, limpando.`);
        this.closePeer(peerId);
      }
    }

    // Auto-reconecta qualquer participante sem conexão ativa
    for (const peerId of this.expectedPeers) {
      const pc = this.peers.get(peerId);
      if (!pc || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        console.log(`[WebRTC 🩺 Sync] Participante ${peerId} sem conexão ativa. Auto-reconectando...`);
        this.reconnectPeer(peerId);
      }
    }
  }

  startWatchdog() {
    this.isInVoice = true;
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    this.watchdogTimer = setInterval(() => {
      this.healMeshConnections();
    }, 5000);
  }

  stopWatchdog() {
    this.isInVoice = false;
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    for (const timer of this.recoveryTimers.values()) clearTimeout(timer);
    this.recoveryTimers.clear();
    for (const timer of this.iceCheckTimers.values()) clearTimeout(timer);
    this.iceCheckTimers.clear();
    for (const interval of this.remoteSpeechIntervals.values()) clearInterval(interval);
    this.remoteSpeechIntervals.clear();
    this.reconnectingPeers.clear();
    this.expectedPeers.clear();
  }

  closePeer(peerId) {
    this.clearPeerTimers(peerId);
    if (this.remoteSpeechIntervals.has(peerId)) {
      clearInterval(this.remoteSpeechIntervals.get(peerId));
      this.remoteSpeechIntervals.delete(peerId);
    }

    const pc = this.peers.get(peerId);
    if (pc) {
      try {
        pc.onicecandidate = null;
        pc.ontrack = null;
        pc.oniceconnectionstatechange = null;
        pc.onconnectionstatechange = null;
        pc.close();
      } catch (e) {}
      this.peers.delete(peerId);
    }
    this.peerSenders.delete(peerId);
    this.peerScreenStreamIds.delete(peerId);
    this.peerScreenAudioTrackIds.delete(peerId);

    const voiceNodeData = this.voiceAudioNodes.get(peerId);
    if (voiceNodeData) {
      try {
        voiceNodeData.sourceNode.disconnect();
        voiceNodeData.gainNode.disconnect();
        if (voiceNodeData.destNode) voiceNodeData.destNode.disconnect();
      } catch (e) {}
      this.voiceAudioNodes.delete(peerId);
    }

    const nodeData = this.screenAudioNodes.get(peerId);
    if (nodeData) {
      try {
        nodeData.sourceNode.disconnect();
        nodeData.gainNode.disconnect();
      } catch (e) {}
      this.screenAudioNodes.delete(peerId);
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
    this.stopWatchdog();
    this.stopScreenShare();
    this.stopCamera();

    for (const [peerId, pc] of this.peers.entries()) {
      try {
        pc.onicecandidate = null;
        pc.ontrack = null;
        pc.oniceconnectionstatechange = null;
        pc.onconnectionstatechange = null;
        pc.close();
      } catch (e) {}
    }

    this.voiceAudioNodes.forEach(nodeData => {
      try {
        nodeData.sourceNode.disconnect();
        nodeData.gainNode.disconnect();
        if (nodeData.destNode) nodeData.destNode.disconnect();
      } catch (e) {}
    });
    this.voiceAudioNodes.clear();

    this.screenAudioNodes.forEach(nodeData => {
      try {
        nodeData.sourceNode.disconnect();
        nodeData.gainNode.disconnect();
      } catch (e) {}
    });
    this.screenAudioNodes.clear();

    if (this.localAudioStream) {
      this.localAudioStream.getTracks().forEach(t => t.stop());
      this.localAudioStream = null;
    }
    if (this.rnnoiseNode) {
      try {
        this.rnnoiseNode.port.postMessage('destroy');
        this.rnnoiseNode.disconnect();
      } catch (e) {}
      this.rnnoiseNode = null;
    }
    this.processedAudioStream = null;
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

  // Volume do Microfone/Voz do Usuário (100% independente da transmissão, até 500% via GainNode)
  setUserVolume(peerId, volumePercent) {
    this.userVolumes.set(peerId, volumePercent);
    this.updatePeerVoiceGain(peerId);
  }

  getUserVolume(peerId) {
    return this.userVolumes.has(peerId) ? this.userVolumes.get(peerId) : 100;
  }

  // Volume da Transmissão de Tela/Jogo (100% independente da voz)
  setUserScreenVolume(peerId, volumePercent) {
    this.userScreenVolumes.set(peerId, volumePercent);
    this.updatePeerScreenAudioGain(peerId);
  }

  getUserScreenVolume(peerId) {
    return this.userScreenVolumes.has(peerId) ? this.userScreenVolumes.get(peerId) : 100;
  }

  setUserMuted(peerId, isMuted) {
    this.userMutes.set(peerId, isMuted);
    this.updatePeerVoiceGain(peerId);
  }

  setDeafened(isDeafened) {
    this.isDeafened = !!isDeafened;
    this.remoteVoiceAudios.forEach((_, peerId) => this.updatePeerVoiceGain(peerId));
    this.remoteScreenAudios.forEach((_, peerId) => this.updatePeerScreenAudioGain(peerId));
  }

  setUserScreenAudioMuted(peerId, isMuted) {
    this.userScreenAudioMutes.set(peerId, isMuted);
    this.updatePeerScreenAudioGain(peerId);
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
