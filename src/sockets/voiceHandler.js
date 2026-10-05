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
    voiceRooms[roomId].add(socket.id);
    socket.join(roomId);

    console.log(`[Voz 📞] ${user.name} conectou ao canal de voz: ${roomId}`);

    const existingPeers = Array.from(voiceRooms[roomId])
      .filter(id => id !== socket.id)
      .map(id => ({
        id,
        user: users.get(id)
      }))
      .filter(p => p.user);

    socket.emit('voice:peers-list', { peers: existingPeers, roomId });

    socket.to(roomId).emit('voice:peer-joined', {
      peerId: socket.id,
      user,
      roomId
    });

    broadcastVoiceState();
    broadcastOnlineMembers();
  });

  // Sair da voz
  socket.on('voice:leave', () => {
    const user = users.get(socket.id);
    if (!user || !user.inVoice) return;
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
}

export function leaveVoiceRoom(io, socket, user, users, voiceRooms, broadcastVoiceState, broadcastOnlineMembers) {
  if (!user || !user.inVoice) return;
  const roomId = user.currentVoiceRoom || 'gamezeda';
  user.inVoice = false;
  user.isScreenSharing = false;
  user.isSpeaking = false;
  user.currentVoiceRoom = null;

  if (voiceRooms[roomId]) {
    voiceRooms[roomId].delete(socket.id);
  }
  socket.leave(roomId);

  socket.to(roomId).emit('voice:peer-left', {
    peerId: socket.id,
    user,
    roomId
  });

  broadcastVoiceState();
  broadcastOnlineMembers();
}
