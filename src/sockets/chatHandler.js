import { saveMessage, getChannelMessages, getChannels } from '../config/db.js';
import { musicBot, BOT_USER, RADIO_STATIONS } from '../services/musicBot.js';
import { watchPartyService } from '../services/watchParty.js';

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
    // INTERCEPTADOR DE COMANDOS DO BOT DE MÚSICA & WATCH PARTY
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

  const isWatchCommand = [
    'watch', 'w', 'assistir', 'yt', 'youtube'
  ].includes(command);

  if (!isMusicCommand && !isWatchCommand) return;

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

📺 **ASSISTIR JUNTOS (WATCH PARTY YOUTUBE):**
• \`!watch <vídeo / link>\` ou \`!w <termo>\` — Abre ou enfileira vídeo no palco compartilhado
• \`!w pause\` / \`!w resume\` — Pausa ou retoma o vídeo para todos
• \`!w skip\` — Pula para o próximo vídeo da fila
• \`!w stop\` — Encerra a Watch Party e fecha a tela
• \`!w seek <segundos>\` — Salta para o segundo indicado

💡 *Dica: Você também pode usar o botão "Assistir Juntos" diretamente na barra do palco de voz!*`;
    return sendBotMessage(io, channelId, helpText);
  }

  // Para tocar ou controlar bot / watch party, o usuário precisa estar em um canal de voz
  if (!user.inVoice || !user.currentVoiceRoom) {
    return sendBotMessage(
      io,
      channelId,
      `⚠️ **${user.name}**, você precisa estar conectado a um canal de voz para usar este comando! 🎙️`
    );
  }

  const roomId = user.currentVoiceRoom;

  // Comandos de Watch Party
  if (isWatchCommand) {
    const subCmd = query.toLowerCase();
    if (subCmd === 'pause' || subCmd === 'pausar') {
      const state = watchPartyService.getRoomState(roomId);
      watchPartyService.pause(roomId, state.currentTime, user, io);
      return sendBotMessage(io, channelId, `⏸️ **${user.name}** pausou o vídeo no Watch Party.`);
    }

    if (subCmd === 'resume' || subCmd === 'play' || subCmd === 'despausar') {
      const state = watchPartyService.getRoomState(roomId);
      watchPartyService.resume(roomId, state.currentTime, user, io);
      return sendBotMessage(io, channelId, `▶️ **${user.name}** retomou a reprodução no Watch Party.`);
    }

    if (subCmd === 'skip' || subCmd === 'pular' || subCmd === 'next') {
      const nextRes = watchPartyService.playNext(roomId, io);
      if (nextRes.success) {
        return sendBotMessage(io, channelId, `⏭️ **${user.name}** pulou para o próximo vídeo: **${nextRes.video.title}**`);
      } else {
        return sendBotMessage(io, channelId, `⏹️ Fila encerrada. Watch Party finalizada.`);
      }
    }

    if (subCmd === 'stop' || subCmd === 'parar' || subCmd === 'sair' || subCmd === 'close') {
      watchPartyService.stop(roomId, user, io);
      return sendBotMessage(io, channelId, `⏹️ **${user.name}** encerrou o Watch Party.`);
    }

    if (subCmd.startsWith('seek ')) {
      const sec = parseInt(subCmd.split(' ')[1], 10);
      if (!isNaN(sec)) {
        watchPartyService.seek(roomId, sec, user, io);
        return sendBotMessage(io, channelId, `⏩ **${user.name}** sincronizou o vídeo para **${sec}s**.`);
      }
    }

    if (!query) {
      return sendBotMessage(
        io,
        channelId,
        `⚠️ Uso correto: \`!watch <termo de busca ou link do YouTube>\` ou clique em **Assistir Juntos** no palco de voz!`
      );
    }

    sendBotMessage(io, channelId, `🔍 Buscando vídeo no YouTube: \`${query}\`...`);
    const partyRes = await watchPartyService.startOrQueue(roomId, query, user, io);
    return sendBotMessage(io, channelId, partyRes.message);
  }

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
