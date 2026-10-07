import { BOT_USER, musicBot } from '../services/musicBot.js';

export function registerVoiceHandlers(io, socket, users, voiceRooms, broadcastVoiceState, broadcastOnlineMembers) {
  // Entrar na voz (sala dinâmica ou padrão)
  socket.on('voice:join', (payload = {}) => {
    const user = users.get(socket.id);
    if (!user) return;

    const roomId = (payload && payload.roomId) || 'gamezeda';

    // Se já estava em outro canal de voz, sai dele antes de entrar no novo
    if (user.inVoice && user.currentVoiceRoom && user.currentVoiceRoom !== roomId) {
      leaveVoiceRoom(io, socket, user, users, voiceRooms, broadcastVoiceState, broadcastOnlineMembers);
    }

    if (!voiceRooms[roomId]) {
      voiceRooms[roomId] = new Set();
    }

    user.inVoice = true;
    user.currentVoiceRoom = roomId;
    user.isMuted = payload.isMuted !== undefined ? !!payload.isMuted : false;
    user.isDeafened = payload.isDeafened !== undefined ? !!payload.isDeafened : false;
    voiceRooms[roomId].add(socket.id);
    socket.join(roomId);

    console.log(`[Voz 📞] ${user.name} conectou ao canal de voz: ${roomId}`);

    const existingPeers = Array.from(voiceRooms[roomId])
      .filter(id => id !== socket.id)
      .map(id => {
        if (id === BOT_USER.id) {
          return { id: BOT_USER.id, user: BOT_USER };
        }
        return { id, user: users.get(id) };
      })
      .filter(p => p.user);

    socket.emit('voice:peers-list', { peers: existingPeers, roomId });

    socket.to(roomId).emit('voice:peer-joined', {
      peerId: socket.id,
      user,
      roomId
    });

    // Se o bot de música já estiver tocando nesta sala, envia o estado da música para o usuário que acabou de entrar
    const roomState = musicBot.getRoomState(roomId);
    if (roomState && roomState.isPlaying && roomState.currentTrack) {
      let elapsed = roomState.elapsedBeforePause;
      if (!roomState.isPaused && roomState.startedAt > 0) {
        elapsed += Math.floor((Date.now() - roomState.startedAt) / 1000);
      }
      socket.emit('music:play', {
        track: roomState.currentTrack,
        position: elapsed,
        isPaused: roomState.isPaused
      });
      socket.emit('music:queue-update', {
        roomId,
        currentTrack: roomState.currentTrack,
        queue: roomState.queue,
        isPlaying: roomState.isPlaying,
        isPaused: roomState.isPaused
      });

      if (!roomState.isPaused) {
        socket.emit('voice:peer-speaking', {
          peerId: BOT_USER.id,
          isSpeaking: true
        });
      }
    }

    broadcastVoiceState();
    broadcastOnlineMembers();
  });

  // Sair da voz
  socket.on('voice:leave', () => {
    const user = users.get(socket.id);
    leaveVoiceRoom(io, socket, user, users, voiceRooms, broadcastVoiceState, broadcastOnlineMembers);
  });

  // Sinalização WebRTC: Oferta
  socket.on('webrtc:offer', (payload) => {
    io.to(payload.targetId).emit('webrtc:offer', {
      ...payload,
      senderId: socket.id
    });
  });

  // Sinalização WebRTC: Resposta
  socket.on('webrtc:answer', (payload) => {
    io.to(payload.targetId).emit('webrtc:answer', {
      ...payload,
      senderId: socket.id
    });
  });

  // Sinalização WebRTC: Candidatos ICE
  socket.on('webrtc:ice-candidate', ({ targetId, candidate }) => {
    io.to(targetId).emit('webrtc:ice-candidate', {
      senderId: socket.id,
      candidate
    });
  });

  // Log de erros do cliente no terminal do servidor
  socket.on('client:error', (data) => {
    console.error(`[CLIENT ERROR ${socket.id}]:`, JSON.stringify(data));
  });

  // Indicador de fala em tempo real
  socket.on('voice:speaking', ({ isSpeaking }) => {
    const user = users.get(socket.id);
    if (!user || !user.inVoice || !user.currentVoiceRoom) return;
    user.isSpeaking = isSpeaking;
    socket.to(user.currentVoiceRoom).emit('voice:peer-speaking', {
      peerId: socket.id,
      isSpeaking
    });
  });

  // Status de compartilhamento de tela
  socket.on('voice:screen-status', (payload) => {
    const user = users.get(socket.id);
    if (!user || !user.inVoice || !user.currentVoiceRoom) return;
    user.isScreenSharing = payload.isSharing;
    socket.to(user.currentVoiceRoom).emit('voice:peer-screen-status', {
      ...payload,
      peerId: socket.id
    });
    broadcastVoiceState();
  });

  // Status de microfone mutado e fone desativado (mute / deafen)
  socket.on('voice:mute-status', (payload = {}) => {
    const user = users.get(socket.id);
    if (!user || !user.inVoice) return;
    user.isMuted = !!payload.isMuted;
    user.isDeafened = !!payload.isDeafened;
    broadcastVoiceState();
  });
}

export function leaveVoiceRoom(io, socket, user, users, voiceRooms, broadcastVoiceState, broadcastOnlineMembers) {
  const targetUser = user || (socket ? users.get(socket.id) : null);
  const targetSocketId = (socket && socket.id) || (targetUser ? targetUser.id : null);

  if (targetUser) {
    targetUser.inVoice = false;
    targetUser.isScreenSharing = false;
    targetUser.isSpeaking = false;
    targetUser.isMuted = false;
    targetUser.isDeafened = false;
    targetUser.currentVoiceRoom = null;
  }

  // Remove o socket de TODAS as salas de voz
  if (voiceRooms) {
    for (const [rId, socketSet] of Object.entries(voiceRooms)) {
      if (targetSocketId && socketSet.has(targetSocketId)) {
        socketSet.delete(targetSocketId);
        if (io) {
          io.to(rId).emit('voice:peer-left', {
            peerId: targetSocketId,
            user: targetUser,
            roomId: rId
          });
        }
      }

      // Se não sobrou nenhum humano na sala e o bot estiver nela, desconecta o bot
      const remainingHumans = Array.from(socketSet).filter(id => id !== BOT_USER.id);
      if (remainingHumans.length === 0 && BOT_USER.inVoice && BOT_USER.currentVoiceRoom === rId) {
        musicBot.stop(rId, io, voiceRooms, broadcastVoiceState);
      }
    }
  }

  if (socket && typeof socket.leave === 'function' && voiceRooms) {
    for (const rId of Object.keys(voiceRooms)) {
      try {
        socket.leave(rId);
      } catch (e) {}
    }
  }

  if (typeof broadcastVoiceState === 'function') {
    broadcastVoiceState();
  }
  if (typeof broadcastOnlineMembers === 'function') {
    broadcastOnlineMembers();
  }
}
