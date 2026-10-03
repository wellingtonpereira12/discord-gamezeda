import express from 'express';
import http from 'http';
import https from 'https';
import fs from 'fs';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

let server;
const keyPath = path.join(__dirname, 'key.pem');
const certPath = path.join(__dirname, 'cert.pem');

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log('[+] SSL ativo! Iniciando HTTPS.');
  server = https.createServer({
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  }, app);
} else {
  console.log('[!] Sem SSL. Iniciando HTTP.');
  server = http.createServer(app);
}

const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, 'public')));

// Gerenciamento de Usuários REAIS Conectados
const users = new Map(); // socketId -> user
const voiceRooms = {
  'gamezeda': new Set()
};

// Canais de Texto Separados e Independentes
const channelList = [
  'geral',
  'links',
  'meme-imagem-videos',
  'musicas',
  'novo-video-youtube',
  'clips-twitch',
  'blogger',
  'informacoes-eventos-regras',
  'nova-live',
  'vendo-mousepad',
  'to-sem-mic',
  'tribunal-de-justica'
];

const chatMessages = {};
channelList.forEach(ch => {
  chatMessages[ch] = [];
});

function broadcastOnlineMembers() {
  const memberList = Array.from(users.values());
  io.emit('members:update', memberList);
}

function broadcastVoiceState() {
  const voiceMembers = Array.from(voiceRooms['gamezeda']).map(id => users.get(id)).filter(Boolean);
  io.emit('voice:update', {
    roomId: 'gamezeda',
    users: voiceMembers
  });
}

io.on('connection', (socket) => {
  console.log(`[+] Socket conectado: ${socket.id}`);

  // Entrar com o nome real
  socket.on('join:server', ({ name }) => {
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

    // Notificação de boas-vindas no canal geral
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const welcomeMsg = {
      id: `sys-${Date.now()}`,
      sender: user.name,
      isSystem: true,
      text: `${user.name} entrou no grupo.`,
      timestamp: `Hoje às ${timeStr}`
    };
    chatMessages['geral'].push(welcomeMsg);

    // Envia estado inicial ao usuário (incluindo todas as mensagens separadas por canal)
    socket.emit('init:state', {
      currentUser: user,
      onlineUsers: Array.from(users.values()),
      voiceUsers: Array.from(voiceRooms['gamezeda']).map(id => users.get(id)).filter(Boolean),
      chatMessages
    });

    broadcastOnlineMembers();
    io.emit('chat:new-message', { channelId: 'geral', message: welcomeMsg });
  });

  // Envio de mensagem para canal específico
  socket.on('chat:send', ({ channelId, text }) => {
    const user = users.get(socket.id);
    if (!user || !text || !text.trim()) return;

    const targetChannel = channelList.includes(channelId) ? channelId : 'geral';

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const msg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      sender: user.name,
      avatar: user.avatar,
      isSystem: false,
      text: text.trim(),
      timestamp: `Hoje às ${timeStr}`
    };

    if (!chatMessages[targetChannel]) {
      chatMessages[targetChannel] = [];
    }
    chatMessages[targetChannel].push(msg);
    if (chatMessages[targetChannel].length > 100) chatMessages[targetChannel].shift();

    // Emite apenas para o canal específico
    io.emit('chat:new-message', { channelId: targetChannel, message: msg });
  });

  // Requisição de histórico de um canal específico
  socket.on('chat:get-channel', ({ channelId }) => {
    const targetChannel = channelList.includes(channelId) ? channelId : 'geral';
    socket.emit('chat:channel-history', {
      channelId: targetChannel,
      messages: chatMessages[targetChannel] || []
    });
  });

  // ==========================================
  // CANAL DE VOZ (CHAMADA COMO TELEFONE)
  // ==========================================
  socket.on('voice:join', () => {
    const user = users.get(socket.id);
    if (!user) return;

    user.inVoice = true;
    voiceRooms['gamezeda'].add(socket.id);
    socket.join('gamezeda');

    console.log(`[Voz 📞] ${user.name} entrou no canal Gamezeda`);

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

  socket.on('voice:leave', () => {
    const user = users.get(socket.id);
    if (!user || !user.inVoice) return;
    leaveVoiceRoom(socket, user);
  });

  // WebRTC Signaling
  socket.on('webrtc:offer', ({ targetId, offer }) => {
    io.to(targetId).emit('webrtc:offer', {
      senderId: socket.id,
      offer
    });
  });

  socket.on('webrtc:answer', ({ targetId, answer }) => {
    io.to(targetId).emit('webrtc:answer', {
      senderId: socket.id,
      answer
    });
  });

  socket.on('webrtc:ice-candidate', ({ targetId, candidate }) => {
    io.to(targetId).emit('webrtc:ice-candidate', {
      senderId: socket.id,
      candidate
    });
  });

  // Indicador de fala (círculo verde)
  socket.on('voice:speaking', ({ isSpeaking }) => {
    const user = users.get(socket.id);
    if (!user) return;
    user.isSpeaking = isSpeaking;
    socket.to('gamezeda').emit('voice:peer-speaking', {
      peerId: socket.id,
      isSpeaking
    });
  });

  // Compartilhamento de tela
  socket.on('voice:screen-status', ({ isSharing }) => {
    const user = users.get(socket.id);
    if (!user) return;
    user.isScreenSharing = isSharing;
    socket.to('gamezeda').emit('voice:peer-screen-status', {
      peerId: socket.id,
      isSharing
    });
    broadcastVoiceState();
  });

  // Desconexão total
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      console.log(`[-] Usuário desconectado: ${user.name}`);
      if (user.inVoice) {
        leaveVoiceRoom(socket, user);
      }
      users.delete(socket.id);
      broadcastOnlineMembers();
    }
  });
});

function leaveVoiceRoom(socket, user) {
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🎮 DISCORD CLONE (gamezeda) ONLINE NA PORTA ${PORT}!`);
  console.log(`=======================================================`);
});
