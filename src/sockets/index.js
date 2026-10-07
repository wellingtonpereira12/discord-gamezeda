import { registerChatHandlers } from './chatHandler.js';
import { registerVoiceHandlers, leaveVoiceRoom } from './voiceHandler.js';
import { registerSoundboardHandlers } from './soundboardHandler.js';
import { registerAuthHandlers } from './authHandler.js';
import { registerChannelHandlers } from './channelHandler.js';
import { registerWatchPartyHandlers } from './watchPartyHandler.js';
import { BOT_USER, musicBot } from '../services/musicBot.js';
import {
  getAllMessagesByChannel,
  saveMessage,
  findUser,
  saveUser,
  addAuthorizedDevice,
  removeAuthorizedDevice,
  getCategories,
  getChannelsFull,
  updateUserProfile
} from '../config/db.js';

export function setupSockets(io) {
  const users = new Map(); // socketId -> user
  const voiceRooms = {
    'gamezeda': new Set()
  };

  function broadcastOnlineMembers() {
    const seen = new Set();
    const uniqueList = [];
    for (const u of users.values()) {
      const lower = u.name.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        uniqueList.push(u);
      }
    }
    // Inclui Alfredo como membro bot online
    if (!seen.has(BOT_USER.name.toLowerCase())) {
      uniqueList.push(BOT_USER);
    }
    io.emit('members:update', uniqueList);
  }

  function broadcastVoiceState() {
    const roomsState = {};
    for (const [roomId, socketIds] of Object.entries(voiceRooms)) {
      const activeInRoom = [];
      for (const sId of Array.from(socketIds)) {
        if (sId === BOT_USER.id) {
          if (BOT_USER.inVoice && BOT_USER.currentVoiceRoom === roomId) {
            activeInRoom.push(BOT_USER);
          } else {
            socketIds.delete(sId);
          }
          continue;
        }

        const u = users.get(sId);
        if (u && u.inVoice && u.currentVoiceRoom === roomId) {
          activeInRoom.push(u);
        } else {
          socketIds.delete(sId);
        }
      }
      roomsState[roomId] = activeInRoom;
    }

    io.emit('voice:update', {
      rooms: roomsState,
      roomId: 'gamezeda',
      users: roomsState['gamezeda'] || []
    });
  }

  io.on('connection', (socket) => {
    console.log(`[+] Socket conectado: ${socket.id}`);

    // Registro do usuário
    socket.on('join:server', async ({ name, deviceId }) => {
      const cleanName = (name || '').trim();
      if (!cleanName) return;

      // Garante consistência absoluta: nunca permite duas conexões ativas com o mesmo nome
      for (const [existingSocketId, existingUser] of users.entries()) {
        if (existingUser.name.toLowerCase() === cleanName.toLowerCase() && existingSocketId !== socket.id) {
          console.log(`[!] Removendo sessão duplicada de ${cleanName} (${existingSocketId})`);
          const oldSocket = io.sockets.sockets.get(existingSocketId);
          leaveVoiceRoom(io, oldSocket, existingUser, users, voiceRooms, broadcastVoiceState, broadcastOnlineMembers);
          users.delete(existingSocketId);
          if (oldSocket) {
            oldSocket.emit('session:replaced', {
              message: 'Você foi desconectado pois sua conta foi acessada em outro local.'
            });
            oldSocket.disconnect(true);
          }
        }
      }

      let userRecord = null;
      try {
        userRecord = await findUser(cleanName);
      } catch (err) {}

      const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`;
      const avatar = userRecord && userRecord.avatar ? userRecord.avatar : defaultAvatar;
      const bannerColor = userRecord && userRecord.banner_color ? userRecord.banner_color : '#5865F2';
      const bio = userRecord && userRecord.bio ? userRecord.bio : '';
      const customStatusText = userRecord && userRecord.custom_status_text ? userRecord.custom_status_text : '';
      const statusMode = userRecord && userRecord.status_mode ? userRecord.status_mode : 'online';

      const user = {
        id: socket.id,
        name: cleanName,
        avatar: avatar,
        bannerColor: bannerColor,
        bio: bio,
        customStatusText: customStatusText,
        status: statusMode,
        inVoice: false,
        currentVoiceRoom: null,
        isSpeaking: false,
        isScreenSharing: false,
        isMuted: false,
        isDeafened: false,
        activity: null
      };

      users.set(socket.id, user);
      console.log(`[+] Usuário registrado: ${user.name} (${socket.id})`);

      // Garante que o usuário e seu dispositivo estão cadastrados
      try {
        if (!userRecord) {
          await saveUser({ username: cleanName, avatar: user.avatar, bannerColor, bio, customStatusText, statusMode, deviceId });
        } else if (!userRecord.password_hash && deviceId) {
          await addAuthorizedDevice(cleanName, deviceId);
        }
      } catch (err) {
        console.warn('Erro ao atualizar usuário no banco:', err.message);
      }

      // Mensagem de boas-vindas no canal geral
      const now = new Date();
      const timeStr = now.toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const welcomeMsg = {
        id: `sys-${Date.now()}`,
        channelId: 'geral',
        sender: user.name,
        isSystem: true,
        text: `${user.name} entrou no servidor.`,
        timestamp: `Hoje às ${timeStr}`,
        createdAt: now.toISOString()
      };
      await saveMessage(welcomeMsg);

      // Carrega categorias, canais e mensagens do banco
      const categories = await getCategories();
      const channels = await getChannelsFull();
      const chatMessages = await getAllMessagesByChannel();

      const seen = new Set();
      const uniqueOnline = [];
      for (const u of users.values()) {
        const lower = u.name.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          uniqueOnline.push(u);
        }
      }
      if (!seen.has(BOT_USER.name.toLowerCase())) {
        uniqueOnline.push(BOT_USER);
      }

      const roomsState = {};
      for (const [roomId, socketIds] of Object.entries(voiceRooms)) {
        roomsState[roomId] = Array.from(socketIds).map(id => {
          if (id === BOT_USER.id) return BOT_USER;
          return users.get(id);
        }).filter(Boolean);
      }

      socket.emit('init:state', {
        currentUser: user,
        onlineUsers: uniqueOnline,
        voiceUsers: roomsState['gamezeda'] || [],
        voiceRooms: roomsState,
        categories,
        channels,
        chatMessages
      });

      broadcastOnlineMembers();
      io.emit('chat:new-message', { channelId: 'geral', message: welcomeMsg });
    });

    // Registra sub-módulos
    registerAuthHandlers(io, socket, users);
    registerChatHandlers(io, socket, users, voiceRooms, broadcastVoiceState);
    registerVoiceHandlers(io, socket, users, voiceRooms, broadcastVoiceState, broadcastOnlineMembers);
    registerSoundboardHandlers(io, socket, users, voiceRooms);
    registerChannelHandlers(io, socket, users, voiceRooms, broadcastVoiceState, broadcastOnlineMembers);
    registerWatchPartyHandlers(io, socket, users);

    // Controles diretos da UI do Mini Player de Música
    socket.on('music:action', async ({ action, query }) => {
      const user = users.get(socket.id);
      if (!user || !user.inVoice || !user.currentVoiceRoom) return;
      const roomId = user.currentVoiceRoom;

      if (action === 'play' && query) {
        await musicBot.handlePlay(roomId, query, user, io, voiceRooms, broadcastVoiceState);
      } else if (action === 'skip') {
        musicBot.skip(roomId, io, voiceRooms, broadcastVoiceState);
      } else if (action === 'pause') {
        musicBot.pause(roomId, io);
      } else if (action === 'resume') {
        musicBot.resume(roomId, io, voiceRooms, broadcastVoiceState);
      } else if (action === 'stop') {
        musicBot.stop(roomId, io, voiceRooms, broadcastVoiceState);
      }
    });

    // Logout voluntário do usuário
    socket.on('logout', async (data = {}) => {
      const user = users.get(socket.id);
      if (user) {
        console.log(`[-] Usuário deslogou: ${user.name} (${socket.id})`);
        leaveVoiceRoom(io, socket, user, users, voiceRooms, broadcastVoiceState, broadcastOnlineMembers);
        users.delete(socket.id);
        broadcastOnlineMembers();

        const devId = (data && data.deviceId) || null;
        if (devId) {
          try {
            await removeAuthorizedDevice(user.name, devId);
            console.log(`[x] Dispositivo ${devId} desautorizado para ${user.name}`);
          } catch (err) {
            console.warn('Erro ao desautorizar dispositivo no logout:', err.message);
          }
        }
      }
    });

    // Atualização de jogo / atividade em tempo real (Discord Game Activity)
    socket.on('user:activity-update', (activityData) => {
      const user = users.get(socket.id);
      if (!user) return;

      if (activityData && activityData.game) {
        user.activity = {
          game: String(activityData.game).slice(0, 60),
          startedAt: Number(activityData.startedAt) || Date.now()
        };
      } else {
        user.activity = null;
      }

      broadcastOnlineMembers();
      broadcastVoiceState();
    });

    // Atualização de perfil do usuário (avatar, banner, bio, status, frase)
    socket.on('user:update-profile', async (profileData) => {
      const user = users.get(socket.id);
      if (!user || !profileData) return;

      const newAvatar = profileData.avatarUrl !== undefined ? profileData.avatarUrl : profileData.avatar;
      const newStatus = profileData.statusMode !== undefined ? profileData.statusMode : profileData.status;

      if (newAvatar !== undefined) user.avatar = newAvatar;
      if (profileData.bannerColor !== undefined) user.bannerColor = profileData.bannerColor;
      if (profileData.bio !== undefined) user.bio = profileData.bio;
      if (profileData.customStatusText !== undefined) user.customStatusText = profileData.customStatusText;
      if (newStatus !== undefined) user.status = newStatus;

      try {
        await updateUserProfile(user.name, {
          avatar: user.avatar,
          bannerColor: user.bannerColor,
          bio: user.bio,
          customStatusText: user.customStatusText,
          statusMode: user.status
        });
      } catch (err) {
        console.warn('Erro ao salvar atualização de perfil:', err.message);
      }

      socket.emit('user:profile-updated', {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          bannerColor: user.bannerColor,
          bio: user.bio,
          customStatusText: user.customStatusText,
          statusMode: user.status
        }
      });
      broadcastOnlineMembers();
      broadcastVoiceState();
    });

    // Desconexão total
    socket.on('disconnect', () => {
      const user = users.get(socket.id);
      if (user) {
        console.log(`[-] Usuário desconectado: ${user.name}`);
        leaveVoiceRoom(io, socket, user, users, voiceRooms, broadcastVoiceState, broadcastOnlineMembers);
        users.delete(socket.id);
        broadcastOnlineMembers();
      }
    });
  });
}
