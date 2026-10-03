import { registerChatHandlers } from './chatHandler.js';
import { registerVoiceHandlers, leaveVoiceRoom } from './voiceHandler.js';
import { registerSoundboardHandlers } from './soundboardHandler.js';
import { getAllMessagesByChannel, saveMessage } from '../config/db.js';

export function setupSockets(io) {
  const users = new Map(); // socketId -> user
  const voiceRooms = {
    'gamezeda': new Set()
  };

  function broadcastOnlineMembers() {
    const memberList = Array.from(users.values());
    io.emit('members:update', memberList);
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
    socket.on('join:server', async ({ name }) => {
      const cleanName = (name || '').trim();
      if (!cleanName) return;

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

      socket.emit('init:state', {
        currentUser: user,
        onlineUsers: Array.from(users.values()),
        voiceUsers: Array.from(voiceRooms['gamezeda']).map(id => users.get(id)).filter(Boolean),
        chatMessages
      });

      broadcastOnlineMembers();
      io.emit('chat:new-message', { channelId: 'geral', message: welcomeMsg });
    });

    // Registra sub-módulos
    registerChatHandlers(io, socket, users);
    registerVoiceHandlers(io, socket, users, voiceRooms, broadcastVoiceState, broadcastOnlineMembers);
    registerSoundboardHandlers(io, socket, users, voiceRooms);

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
