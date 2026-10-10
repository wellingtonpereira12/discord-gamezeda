import { BOT_USER, musicBot } from '../services/musicBot.js';
import { watchPartyService } from '../services/watchParty.js';
import { getUserGuildPermissions, getChannelGuildId, isMemberBanned } from '../config/db.js';

export function registerVoiceHandlers(io, socket, users, voiceRooms, broadcastVoiceState, broadcastOnlineMembers) {
  // Entrar na voz (sala dinâmica ou padrão)
  socket.on('voice:join', async (payload = {}) => {
    const user = users.get(socket.id);
    if (!user) return;

    const roomId = (payload && payload.roomId) || 'gamezeda';

    // Se o canal pertencer a um servidor customizado, verifica se o usuário está expulso/banido
    const chGuildId = await getChannelGuildId(roomId);
    if (chGuildId && chGuildId !== 'gamezeda') {
      const banned = await isMemberBanned(chGuildId, user.name);
      if (banned) {
        console.warn(`[Voz 🚫] ${user.name} tentou entrar no canal ${roomId} mas está expulso de ${chGuildId}`);
        socket.emit('voice:force-disconnect', { guildId: chGuildId, reason: 'Você foi expulso deste servidor.' });
        return;
      }
    }

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

    // Se houver Watch Party ativa nesta sala, sincroniza o vídeo e segundo exato
    const wpState = watchPartyService.getRoomState(roomId);
    if (wpState && wpState.isActive) {
      socket.emit('watchparty:init', wpState);
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
    const sender = users.get(socket.id);
    const target = users.get(payload ? payload.targetId : null);
    console.log(`[WebRTC 📤 Oferta] ${sender ? sender.name : socket.id} -> ${target ? target.name : (payload && payload.targetId)} (tipo: ${(payload && payload.type) || 'call'})`);
    if (payload && payload.targetId) {
      io.to(payload.targetId).emit('webrtc:offer', {
        ...payload,
        senderId: socket.id
      });
    }
  });

  // Sinalização WebRTC: Resposta
  socket.on('webrtc:answer', (payload) => {
    const sender = users.get(socket.id);
    const target = users.get(payload ? payload.targetId : null);
    console.log(`[WebRTC 📥 Resposta] ${sender ? sender.name : socket.id} -> ${target ? target.name : (payload && payload.targetId)} (tipo: ${(payload && payload.type) || 'answer'})`);
    if (payload && payload.targetId) {
      io.to(payload.targetId).emit('webrtc:answer', {
        ...payload,
        senderId: socket.id
      });
    }
  });

  // Sinalização WebRTC: Candidatos ICE
  socket.on('webrtc:ice-candidate', ({ targetId, candidate }) => {
    if (targetId) {
      io.to(targetId).emit('webrtc:ice-candidate', {
        senderId: socket.id,
        candidate
      });
    }
  });

  // Log de erros e diagnósticos do cliente no terminal do servidor
  socket.on('client:diag', (data) => {
    const user = users.get(socket.id);
    console.log(`[DIAG ${user ? user.name : socket.id}]:`, JSON.stringify(data));
  });

  socket.on('client:error', (data) => {
    const user = users.get(socket.id);
    console.error(`[CLIENT ERROR ${user ? user.name : socket.id}]:`, JSON.stringify(data));
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
  socket.on('voice:screen-status', (payload = {}) => {
    const user = users.get(socket.id);
    if (!user) return;
    const isSharing = !!payload.isSharing;
    user.isScreenSharing = isSharing;
    if (user.currentVoiceRoom) {
      socket.to(user.currentVoiceRoom).emit('voice:peer-screen-status', {
        ...payload,
        isSharing,
        peerId: socket.id
      });
    }
    broadcastVoiceState();
  });

  // Status de câmera / webcam
  socket.on('voice:camera-status', (payload = {}) => {
    const user = users.get(socket.id);
    if (!user || !user.inVoice || !user.currentVoiceRoom) return;
    user.isCameraActive = !!payload.isActive;
    socket.to(user.currentVoiceRoom).emit('voice:peer-camera-status', {
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

  // Desconectar membro do canal de voz (Ação de Moderação) - Requer isMod
  socket.on('voice:disconnect-member', async ({ targetUsername, targetSocketId, guildId }, callback) => {
    try {
      const user = users.get(socket.id);
      if (!user) {
        if (typeof callback === 'function') callback({ success: false, message: 'Não autenticado.' });
        return;
      }

      const targetGuild = guildId || (user && user.currentGuildId) || 'gamezeda';
      const perms = await getUserGuildPermissions(targetGuild, user.name);
      if (!perms.isMod) {
        if (typeof callback === 'function') callback({ success: false, message: 'Apenas moderadores e administradores podem desconectar membros da voz.' });
        return;
      }

      let targetSocket = null;
      let targetUser = null;
      if (targetSocketId) {
        targetSocket = io.sockets.sockets.get(targetSocketId);
        targetUser = users.get(targetSocketId);
      } else if (targetUsername) {
        for (const [sId, u] of users.entries()) {
          if (u && u.name && u.name.toLowerCase() === targetUsername.toLowerCase() && u.inVoice) {
            targetSocket = io.sockets.sockets.get(sId);
            targetUser = u;
            break;
          }
        }
      }

      if (!targetUser || !targetUser.inVoice) {
        if (typeof callback === 'function') callback({ success: false, message: 'Usuário não está conectado na voz.' });
        return;
      }

      const targetPerms = await getUserGuildPermissions(targetGuild, targetUser.name);
      if (targetPerms.isOwner) {
        if (typeof callback === 'function') callback({ success: false, message: 'Você não pode desconectar o dono do servidor.' });
        return;
      }
      if (targetPerms.isAdmin && !perms.isOwner) {
        if (typeof callback === 'function') callback({ success: false, message: 'Apenas o dono do servidor pode desconectar administradores.' });
        return;
      }
      if (targetPerms.isMod && !perms.isAdmin) {
        if (typeof callback === 'function') callback({ success: false, message: 'Moderadores não podem desconectar outros moderadores.' });
        return;
      }

      console.log(`[Voz 🔇] ${targetUser.name} foi desconectado da voz por ${user.name}`);

      leaveVoiceRoom(io, targetSocket, targetUser, users, voiceRooms, broadcastVoiceState, broadcastOnlineMembers);

      if (targetSocket) {
        targetSocket.emit('voice:force-disconnect', {
          reason: `Você foi desconectado do canal de voz por ${user.name}.`
        });
      }

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (err) {
      console.warn('Erro ao desconectar usuário da voz:', err.message);
      if (typeof callback === 'function') {
        callback({ success: false, message: err.message });
      }
    }
  });
}

export function leaveVoiceRoom(io, socket, user, users, voiceRooms, broadcastVoiceState, broadcastOnlineMembers) {
  const targetUser = user || (socket ? users.get(socket.id) : null);
  const targetSocketId = (socket && socket.id) || (targetUser ? targetUser.id : null);

  if (targetUser) {
    targetUser.inVoice = false;
    targetUser.isScreenSharing = false;
    targetUser.isCameraActive = false;
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

      // Se não sobrou nenhum humano na sala, desconecta o bot e encerra Watch Party
      const remainingHumans = Array.from(socketSet).filter(id => id !== BOT_USER.id);
      if (remainingHumans.length === 0) {
        if (BOT_USER.inVoice && BOT_USER.currentVoiceRoom === rId) {
          musicBot.stop(rId, io, voiceRooms, broadcastVoiceState);
        }
        watchPartyService.stop(rId, null, io);
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
