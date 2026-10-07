import { saveMessage, getChannelMessages, getChannels } from '../config/db.js';
import { musicBot, BOT_USER, RADIO_STATIONS } from '../services/musicBot.js';

export function registerChatHandlers(io, socket, users, voiceRooms, broadcastVoiceState) {
  // Envio de mensagem
  socket.on('chat:send', async ({ channelId, text, attachmentUrl }) => {
    const user = users.get(socket.id);
    if (!user) return;
    if ((!text || !text.trim()) && !attachmentUrl) return;

    const validChannels = await getChannels();
    const targetChannel = validChannels.includes(channelId) ? channelId : 'geral';

    const cleanText = (text || '').trim();
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const msgPayload = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      channelId: targetChannel,
      sender: user.name,
      avatar: user.avatar,
      isSystem: false,
      text: cleanText,
      attachmentUrl: attachmentUrl || null,
      timestamp: `Hoje às ${timeStr}`,
      createdAt: now.toISOString()
    };

    const saved = await saveMessage(msgPayload);

    // Emite a mensagem do usuário para o canal
    io.emit('chat:new-message', {
      channelId: targetChannel,
      message: saved
    });

    // ==========================================
    // INTERCEPTADOR DE COMANDOS DO BOT DE MÚSICA
    // ==========================================
    if (cleanText.startsWith('!') || cleanText.startsWith('/')) {
      handleBotCommand(cleanText, user, targetChannel, io, voiceRooms, broadcastVoiceState);
    }
  });

  // Buscar histórico de canal específico
  socket.on('chat:get-channel', async ({ channelId }) => {
    const validChannels = await getChannels();
    const targetChannel = validChannels.includes(channelId) ? channelId : 'geral';
    const messages = await getChannelMessages(targetChannel, 50);

    socket.emit('chat:channel-history', {
      channelId: targetChannel,
      messages
    });
  });
}

async function sendBotMessage(io, channelId, text) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const botMsg = {
    id: `bot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    channelId,
    sender: BOT_USER.name,
    avatar: BOT_USER.avatar,
    isSystem: false,
    isBot: true,
    text,
    timestamp: `Hoje às ${timeStr}`,
    createdAt: now.toISOString()
  };

  const saved = await saveMessage(botMsg);
  io.emit('chat:new-message', {
    channelId,
    message: saved
  });
}

async function handleBotCommand(text, user, channelId, io, voiceRooms, broadcastVoiceState) {
  const parts = text.slice(1).trim().split(/\s+/);
  const command = parts[0].toLowerCase();
  const query = parts.slice(1).join(' ').trim();

  const isMusicCommand = [
    'play', 'p', 'tocar',
    'skip', 's', 'pular',
    'pause', 'pausar',
    'resume', 'r', 'despausar', 'continuar',
    'stop', 'parar',
    'queue', 'q', 'fila',
    'np', 'nowplaying', 'tocando',
    'radio', 'estilo',
    'clear', 'limpar',
    'help', 'ajuda', 'comandos'
  ].includes(command);

  if (!isMusicCommand) return;

  // Comandos que não exigem estar na voz
  if (['help', 'ajuda', 'comandos'].includes(command)) {
    const helpText = `🎧 **COMANDOS DO ALFREDO (BOT DE MÚSICA):**
• \`!play <música / link>\` ou \`!p\` — Toca música do SoundCloud ou link YouTube/MP3
• \`!radio <gênero>\` — Rádios 24/7 (\`lofi\`, \`rock\`, \`trap\`, \`edm\`, \`sertanejo\`, \`synthwave\`)
• \`!pause\` — Pausa a música
• \`!resume\` — Retoma a música pausada
• \`!skip\` ou \`!s\` — Pula para a próxima faixa da fila
• \`!stop\` — Para a reprodução, limpa a fila e sai da voz
• \`!queue\` ou \`!fila\` — Exibe as próximas músicas na fila
• \`!np\` — Informações da música que está tocando agora
• \`!clear\` — Limpa a fila de espera

💡 *Dica: Clique com o botão direito no avatar do Alfredo no palco para ajustar o volume dele individualmente (0% a 200%)!*`;
    return sendBotMessage(io, channelId, helpText);
  }

  // Para tocar ou controlar o bot, o usuário precisa estar em um canal de voz
  if (!user.inVoice || !user.currentVoiceRoom) {
    return sendBotMessage(
      io,
      channelId,
      `⚠️ **${user.name}**, você precisa estar conectado a um canal de voz para usar o bot de música! 🎙️`
    );
  }

  const roomId = user.currentVoiceRoom;

  switch (command) {
    case 'play':
    case 'p':
    case 'tocar': {
      if (!query) {
        // Se já estiver pausado, resume
        const state = musicBot.getRoomState(roomId);
        if (state.isPlaying && state.isPaused) {
          const res = musicBot.resume(roomId, io, voiceRooms, broadcastVoiceState);
          return sendBotMessage(io, channelId, res.message);
        }
        return sendBotMessage(
          io,
          channelId,
          `⚠️ Uso correto: \`!play <nome ou link da música>\` ou \`!radio <estilo>\``
        );
      }

      sendBotMessage(io, channelId, `🔍 Buscando: \`${query}\`...`);
      const playRes = await musicBot.handlePlay(roomId, query, user, io, voiceRooms, broadcastVoiceState);
      return sendBotMessage(io, channelId, playRes.message);
    }

    case 'radio':
    case 'estilo': {
      const genre = query.toLowerCase() || 'lofi';
      const validGenres = Object.keys(RADIO_STATIONS);
      if (!RADIO_STATIONS[genre]) {
        return sendBotMessage(
          io,
          channelId,
          `⚠️ Gênero não encontrado. Gêneros disponíveis: \`${validGenres.join(', ')}\`\nExemplo: \`!radio lofi\` ou \`!radio rock\``
        );
      }
      sendBotMessage(io, channelId, `📻 Sintonizando rádio 24/7 de **${genre.toUpperCase()}**...`);
      const radioRes = await musicBot.handlePlay(roomId, `radio ${genre}`, user, io, voiceRooms, broadcastVoiceState);
      return sendBotMessage(io, channelId, radioRes.message);
    }

    case 'skip':
    case 's':
    case 'pular': {
      const skipRes = musicBot.skip(roomId, io, voiceRooms, broadcastVoiceState);
      return sendBotMessage(io, channelId, skipRes.message);
    }

    case 'pause':
    case 'pausar': {
      const pauseRes = musicBot.pause(roomId, io);
      return sendBotMessage(io, channelId, pauseRes.message);
    }

    case 'resume':
    case 'r':
    case 'despausar':
    case 'continuar': {
      const resumeRes = musicBot.resume(roomId, io, voiceRooms, broadcastVoiceState);
      return sendBotMessage(io, channelId, resumeRes.message);
    }

    case 'stop':
    case 'parar': {
      const stopRes = musicBot.stop(roomId, io, voiceRooms, broadcastVoiceState);
      return sendBotMessage(io, channelId, stopRes.message);
    }

    case 'queue':
    case 'q':
    case 'fila': {
      const queueRes = musicBot.getQueue(roomId);
      return sendBotMessage(io, channelId, queueRes.message);
    }

    case 'np':
    case 'nowplaying':
    case 'tocando': {
      const npRes = musicBot.getNowPlaying(roomId);
      return sendBotMessage(io, channelId, npRes.message);
    }

    case 'clear':
    case 'limpar': {
      const clearRes = musicBot.clearQueue(roomId, io);
      return sendBotMessage(io, channelId, clearRes.message);
    }

    default:
      break;
  }
}
