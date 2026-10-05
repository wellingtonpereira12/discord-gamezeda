import { registerChatHandlers } from './chatHandler.js';
import { registerVoiceHandlers, leaveVoiceRoom } from './voiceHandler.js';
import { registerSoundboardHandlers } from './soundboardHandler.js';
import { registerAuthHandlers } from './authHandler.js';
import { getAllMessagesByChannel, saveMessage, findUser, saveUser, addAuthorizedDevice } from '../config/db.js';

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
    io.emit('members:update', uniqueList);
  }

  function broadcastVoiceState() {
    const voiceMembers = Array.from(voiceRooms['gamezeda'])
      .map(id => users.get(id))
      .filter(Boolean);
    io.emit('voice:update', {
      roomId: 'gamezeda',
      users: voiceMembers
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
          if (existingUser.inVoice) {
            leaveVoiceRoom(io, socket, existingUser, users, voiceRooms, broadcastVoiceState, broadcastOnlineMembers);
          }
          users.delete(existingSocketId);
          const oldSocket = io.sockets.sockets.get(existingSocketId);
          if (oldSocket) {
            oldSocket.emit('session:replaced', {
              message: 'Você foi desconectado pois sua conta foi acessada em outro local.'
            });
            oldSocket.disconnect(true);
          }
        }
      }

      const user = {
        id: socket.id,
        name: cleanName,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`,
        inVoice: false,
        isSpeaking: false,
        isScreenSharing: false,
        isMuted: false
      };

      users.set(socket.id, user);
      console.log(`[+] Usuário registrado: ${user.name} (${socket.id})`);

      // Garante que o usuário e seu dispositivo estão cadastrados
      try {
        let userRecord = await findUser(cleanName);
        if (!userRecord) {
          await saveUser({ username: cleanName, avatar: user.avatar, deviceId });
        } else if (!userRecord.password_hash && deviceId) {
          await addAuthorizedDevice(cleanName, deviceId);
        }
      } catch (err) {
        console.warn('Erro ao atualizar usuário no banco:', err.message);
      }

      // Mensagem de boas-vindas no canal geral
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const welcomeMsg = {
        id: `sys-${Date.now()}`,
        channelId: 'geral',
        sender: user.name,
        isSystem: true,
        text: `${user.name} entrou no servidor.`,
        timestamp: `Hoje às ${timeStr}`
      };
      await saveMessage(welcomeMsg);

      // Carrega todo o histórico inicial do banco
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

      socket.emit('init:state', {
        currentUser: user,
        onlineUsers: uniqueOnline,
        voiceUsers: Array.from(voiceRooms['gamezeda']).map(id => users.get(id)).filter(Boolean),
        chatMessages
      });

      broadcastOnlineMembers();
      io.emit('chat:new-message', { channelId: 'geral', message: welcomeMsg });
    });

    // Registra sub-módulos
    registerAuthHandlers(io, socket, users);
    registerChatHandlers(io, socket, users);
    registerVoiceHandlers(io, socket, users, voiceRooms, broadcastVoiceState, broadcastOnlineMembers);
    registerSoundboardHandlers(io, socket, users, voiceRooms);

    // Logout voluntário do usuário
    socket.on('logout', () => {
      const user = users.get(socket.id);
      if (user) {
        console.log(`[-] Usuário deslogou: ${user.name} (${socket.id})`);
        if (user.inVoice) {
          leaveVoiceRoom(io, socket, user, users, voiceRooms, broadcastVoiceState, broadcastOnlineMembers);
        }
        users.delete(socket.id);
        broadcastOnlineMembers();
      }
    });

    // Desconexão total
    socket.on('disconnect', () => {
      const user = users.get(socket.id);
      if (user) {
        console.log(`[-] Usuário desconectado: ${user.name}`);
        if (user.inVoice) {
          leaveVoiceRoom(io, socket, user, users, voiceRooms, broadcastVoiceState, broadcastOnlineMembers);
        }
        users.delete(socket.id);
        broadcastOnlineMembers();
      }
    });
  });
}
