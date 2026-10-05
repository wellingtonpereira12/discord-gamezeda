export function registerVoiceHandlers(io, socket, users, voiceRooms, broadcastVoiceState, broadcastOnlineMembers) {
  // Entrar na voz (Gamezeda)
  socket.on('voice:join', () => {
    const user = users.get(socket.id);
    if (!user) return;

    user.inVoice = true;
    voiceRooms['gamezeda'].add(socket.id);
    socket.join('gamezeda');

    console.log(`[Voz 📞] ${user.name} conectou ao canal Gamezeda`);

    const existingPeers = Array.from(voiceRooms['gamezeda'])
      .filter(id => id !== socket.id)
      .map(id => ({
        id,
        user: users.get(id)
      }))
      .filter(p => p.user);

    socket.emit('voice:peers-list', { peers: existingPeers });

    socket.to('gamezeda').emit('voice:peer-joined', {
      peerId: socket.id,
      user
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
    if (!user) return;
    user.isSpeaking = isSpeaking;
    socket.to('gamezeda').emit('voice:peer-speaking', {
      peerId: socket.id,
      isSpeaking
    });
  });

  // Status de compartilhamento de tela
  socket.on('voice:screen-status', (payload) => {
    const user = users.get(socket.id);
    if (!user) return;
    user.isScreenSharing = payload.isSharing;
    socket.to('gamezeda').emit('voice:peer-screen-status', {
      ...payload,
      peerId: socket.id
    });
    broadcastVoiceState();
  });
}

export function leaveVoiceRoom(io, socket, user, users, voiceRooms, broadcastVoiceState, broadcastOnlineMembers) {
  if (!user) return;
  user.inVoice = false;
  user.isScreenSharing = false;
  user.isSpeaking = false;
  voiceRooms['gamezeda'].delete(socket.id);
  socket.leave('gamezeda');

  socket.to('gamezeda').emit('voice:peer-left', {
    peerId: socket.id,
    user
  });

  broadcastVoiceState();
  broadcastOnlineMembers();
}
