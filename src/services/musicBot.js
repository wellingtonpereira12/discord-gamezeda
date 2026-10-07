import play from 'play-dl';
import yts from 'yt-search';

let isPlayDlInitialized = false;

async function ensurePlayDlInit(forceRefresh = false) {
  if (isPlayDlInitialized && !forceRefresh) return;
  try {
    const clientId = await play.getFreeClientID();
    await play.setToken({ soundcloud: { client_id: clientId } });
    isPlayDlInitialized = true;
    console.log('[MusicBot 🎵] play-dl SoundCloud inicializado com sucesso.');
  } catch (err) {
    console.warn('[MusicBot ⚠️] Erro ao obter SoundCloud clientId:', err.message);
  }
}

// Inicializa na carga do módulo
ensurePlayDlInit();

export const BOT_USER = {
  id: 'bot-alfredo',
  name: 'Alfredo',
  avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AlfredoBot&backgroundColor=5865f2',
  inVoice: false,
  currentVoiceRoom: null,
  isSpeaking: false,
  isBot: true,
  isMuted: false,
  isDeafened: false
};

export const RADIO_STATIONS = {
  lofi: {
    title: 'Lofi Hip Hop Radio 24/7 (Beats to Relax/Study to)',
    artist: 'Lofi Girl & Chill Radio',
    url: 'https://streams.ilovemusic.de/iloveradio17.mp3',
    streamUrl: 'https://streams.ilovemusic.de/iloveradio17.mp3',
    duration: 0,
    durationStr: '24/7 Ao Vivo',
    isLive: true,
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400'
  },
  rock: {
    title: 'Classic & Modern Rock 24/7',
    artist: 'I Love Rock',
    url: 'https://streams.ilovemusic.de/iloveradio4.mp3',
    streamUrl: 'https://streams.ilovemusic.de/iloveradio4.mp3',
    duration: 0,
    durationStr: '24/7 Ao Vivo',
    isLive: true,
    thumbnail: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400'
  },
  trap: {
    title: 'Trap, Hip-Hop & Bass 24/7',
    artist: 'I Love Hip Hop',
    url: 'https://streams.ilovemusic.de/iloveradio3.mp3',
    streamUrl: 'https://streams.ilovemusic.de/iloveradio3.mp3',
    duration: 0,
    durationStr: '24/7 Ao Vivo',
    isLive: true,
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400'
  },
  edm: {
    title: 'Dance & EDM Festival 24/7',
    artist: 'I Love Dance',
    url: 'https://streams.ilovemusic.de/iloveradio2.mp3',
    streamUrl: 'https://streams.ilovemusic.de/iloveradio2.mp3',
    duration: 0,
    durationStr: '24/7 Ao Vivo',
    isLive: true,
    thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400'
  },
  sertanejo: {
    title: 'Sertanejo Universitário & Modão 24/7',
    artist: 'Rádio Sertanejo Brasil',
    url: 'https://stream.zeno.fm/w4zqm0qyg7zuv',
    streamUrl: 'https://stream.zeno.fm/w4zqm0qyg7zuv',
    duration: 0,
    durationStr: '24/7 Ao Vivo',
    isLive: true,
    thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400'
  },
  synthwave: {
    title: 'Synthwave & Retrowave 24/7 (Night Drive)',
    artist: 'Nightwave Plaza',
    url: 'https://radio.plaza.one/mp3',
    streamUrl: 'https://radio.plaza.one/mp3',
    duration: 0,
    durationStr: '24/7 Ao Vivo',
    isLive: true,
    thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400'
  }
};

function formatDuration(sec) {
  if (!sec || isNaN(sec) || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Armazenamento em memória do estado de música por canal de voz
const rooms = new Map();

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      roomId,
      currentTrack: null,
      queue: [],
      isPlaying: false,
      isPaused: false,
      startedAt: 0,
      pausedAt: 0,
      elapsedBeforePause: 0,
      volume: 100,
      trackTimer: null,
      idleTimer: null
    });
  }
  return rooms.get(roomId);
}

export async function searchTrack(rawQuery, requestedByName = 'Alguém') {
  await ensurePlayDlInit();
  const query = (rawQuery || '').trim();
  if (!query) return null;

  // 1. Rádio pré-definida
  const radioKey = query.toLowerCase().replace(/^(radio|rádio)\s+/, '').trim();
  if (RADIO_STATIONS[radioKey]) {
    const radio = RADIO_STATIONS[radioKey];
    return {
      id: `radio-${radioKey}-${Date.now()}`,
      title: radio.title,
      artist: radio.artist,
      url: radio.url,
      streamUrl: radio.streamUrl,
      duration: 0,
      durationStr: radio.durationStr,
      thumbnail: radio.thumbnail,
      requestedBy: requestedByName,
      isLive: true
    };
  }

  // 2. Link de Áudio Direto (MP3 / OGG / AAC / M4A)
  if (/^https?:\/\/.*\.(mp3|ogg|m4a|aac|flac)(\?.*)?$/i.test(query)) {
    const fileName = query.split('/').pop().split('?')[0];
    return {
      id: `direct-${Date.now()}`,
      title: decodeURIComponent(fileName) || 'Áudio Direto da Web',
      artist: 'Web Audio Stream',
      url: query,
      streamUrl: query,
      duration: 0,
      durationStr: 'Stream Direto',
      thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
      requestedBy: requestedByName,
      isLive: true
    };
  }

  // 3. Link do YouTube: extrai título com yt-search e busca no SoundCloud
  let searchQuery = query;
  if (query.includes('youtube.com/') || query.includes('youtu.be/')) {
    try {
      const cleanTitle = (raw) => {
        return (raw || '')
          .replace(/\[[^\]]*\]/gi, ' ')
          .replace(/\([^)]*(?:official|video|audio|clip|4k|hd|lyric|remaster)[^)]*\)/gi, ' ')
          .replace(/(?:official\s+music\s+video|official\s+video|music\s+video|lyric\s+video)/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      };

      const ytMatch = query.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (ytMatch) {
        const ytInfo = await yts({ videoId: ytMatch[1] });
        if (ytInfo && ytInfo.title) {
          searchQuery = cleanTitle(ytInfo.title);
          console.log(`[MusicBot 🔍] Link do YouTube detectado. Título limpo: "${searchQuery}"`);
        }
      } else {
        const ytSearch = await yts(query);
        if (ytSearch && ytSearch.videos && ytSearch.videos.length > 0) {
          searchQuery = cleanTitle(ytSearch.videos[0].title);
          console.log(`[MusicBot 🔍] Link do YouTube detectado via busca. Título limpo: "${searchQuery}"`);
        }
      }
    } catch (e) {
      console.warn('[MusicBot ⚠️] Falha ao extrair título do YouTube:', e.message);
    }
  }

  // 4. Busca no SoundCloud via play-dl
  try {
    const results = await play.search(searchQuery, {
      source: { soundcloud: 'tracks' },
      limit: 8
    });

    if (!results || results.length === 0) {
      const fallbackQuery = searchQuery.split('-')[0].trim();
      const retry = await play.search(fallbackQuery, { source: { soundcloud: 'tracks' }, limit: 5 });
      if (!retry || retry.length === 0) return null;
      return await resolveSoundCloudTrack(retry, requestedByName);
    }

    return await resolveSoundCloudTrack(results, requestedByName);
  } catch (err) {
    console.warn('[MusicBot ⚠️] Erro na busca, renovando token e tentando novamente...', err.message);
    try {
      await ensurePlayDlInit(true);
      const retry = await play.search(searchQuery, { source: { soundcloud: 'tracks' }, limit: 5 });
      if (retry && retry.length > 0) {
        return await resolveSoundCloudTrack(retry, requestedByName);
      }
    } catch (retryErr) {
      console.error('[MusicBot ❌] Falha no retry da busca:', retryErr.message);
    }
    return null;
  }
}

async function resolveSoundCloudTrack(results, requestedByName) {
  const validTracks = results.filter(r => r && r.url);
  if (validTracks.length === 0) return null;

  // Ordena para priorizar faixas completas (> 45s e <= 720s) em relação a snippets de 30s
  validTracks.sort((a, b) => {
    const aGood = (a.durationInSec > 45 && a.durationInSec <= 720) ? 1 : 0;
    const bGood = (b.durationInSec > 45 && b.durationInSec <= 720) ? 1 : 0;
    return bGood - aGood;
  });

  // Tenta extrair o stream dos melhores resultados
  for (const selected of validTracks.slice(0, 4)) {
    try {
      const stream = await play.stream(selected.url);
      if (stream && stream.url) {
        const duration = selected.durationInSec || 0;
        return {
          id: `sc-${selected.id || Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          title: selected.name || 'Música sem título',
          artist: selected.user ? selected.user.name : 'SoundCloud',
          url: selected.url,
          streamUrl: stream.url,
          duration: duration,
          durationStr: formatDuration(duration),
          thumbnail: selected.thumbnail || 'https://api.dicebear.com/7.x/bottts/svg?seed=AlfredoBot',
          requestedBy: requestedByName,
          isLive: false
        };
      }
    } catch (e) {
      console.warn(`[MusicBot ⚠️] Falha ao extrair stream de "${selected.name}":`, e.message);
    }
  }

  return null;
}

export class MusicBotService {
  constructor() {
    this.rooms = rooms;
  }

  getRoomState(roomId) {
    return getOrCreateRoom(roomId);
  }

  // Inicia ou adiciona à fila
  async handlePlay(roomId, query, user, io, voiceRooms, broadcastVoiceState) {
    const room = getOrCreateRoom(roomId);

    // Faz o bot entrar no canal de voz se ainda não estiver
    this.ensureBotInVoice(roomId, io, voiceRooms, broadcastVoiceState);

    const track = await searchTrack(query, user.name);
    if (!track) {
      return { success: false, message: `❌ Nenhuma música encontrada para: \`${query}\`` };
    }

    if (!room.isPlaying) {
      // Inicia imediatamente
      room.currentTrack = track;
      this.startTrack(roomId, track, io, voiceRooms, broadcastVoiceState);
      return {
        success: true,
        action: 'playing',
        track,
        message: `🎵 **Tocando agora:** [${track.title}](${track.url}) \`[${track.durationStr}]\` (Pedido por **${user.name}**)`
      };
    } else {
      // Adiciona à fila
      room.queue.push(track);
      this.emitQueueUpdate(roomId, io);
      return {
        success: true,
        action: 'queued',
        track,
        position: room.queue.length,
        message: `➕ **Adicionado à fila:** [${track.title}](${track.url}) \`[${track.durationStr}]\` — Posição **#${room.queue.length}**`
      };
    }
  }

  startTrack(roomId, track, io, voiceRooms, broadcastVoiceState) {
    const room = getOrCreateRoom(roomId);
    if (room.trackTimer) clearTimeout(room.trackTimer);
    if (room.idleTimer) clearTimeout(room.idleTimer);

    room.currentTrack = track;
    room.isPlaying = true;
    room.isPaused = false;
    room.startedAt = Date.now();
    room.pausedAt = 0;
    room.elapsedBeforePause = 0;

    // Marca o bot como falando (verde no avatar)
    BOT_USER.isSpeaking = true;
    io.to(roomId).emit('voice:peer-speaking', {
      peerId: BOT_USER.id,
      isSpeaking: true
    });

    // Emite o evento de início da música para todos na sala
    io.to(roomId).emit('music:play', {
      track,
      position: 0,
      isPaused: false
    });

    this.emitQueueUpdate(roomId, io);

    // Se não for rádio ao vivo, agenda término automático para avançar na fila
    if (!track.isLive && track.duration > 0) {
      const waitMs = (track.duration * 1000) + 1500;
      room.trackTimer = setTimeout(() => {
        this.nextTrack(roomId, io, voiceRooms, broadcastVoiceState);
      }, waitMs);
    }
  }

  nextTrack(roomId, io, voiceRooms, broadcastVoiceState) {
    const room = getOrCreateRoom(roomId);
    if (room.trackTimer) clearTimeout(room.trackTimer);

    if (room.queue.length > 0) {
      const next = room.queue.shift();
      this.startTrack(roomId, next, io, voiceRooms, broadcastVoiceState);

      // Avisa no chat que a próxima começou
      const now = new Date();
      const timeStr = now.toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      io.emit('chat:new-message', {
        channelId: 'geral',
        message: {
          id: `bot-msg-${Date.now()}`,
          channelId: 'geral',
          sender: 'Alfredo',
          avatar: BOT_USER.avatar,
          isSystem: false,
          isBot: true,
          text: `🎵 **Tocando agora:** [${next.title}](${next.url}) \`[${next.durationStr}]\` (Pedido por **${next.requestedBy}**)`,
          timestamp: `Hoje às ${timeStr}`,
          createdAt: now.toISOString()
        }
      });
    } else {
      // Fila acabou
      room.currentTrack = null;
      room.isPlaying = false;
      room.isPaused = false;
      BOT_USER.isSpeaking = false;

      io.to(roomId).emit('voice:peer-speaking', {
        peerId: BOT_USER.id,
        isSpeaking: false
      });

      io.to(roomId).emit('music:stop', { roomId });
      this.emitQueueUpdate(roomId, io);

      // Desconecta após 3 minutos de inatividade
      room.idleTimer = setTimeout(() => {
        if (!room.isPlaying) {
          this.leaveVoice(roomId, io, voiceRooms, broadcastVoiceState);
        }
      }, 180000);
    }
  }

  skip(roomId, io, voiceRooms, broadcastVoiceState) {
    const room = getOrCreateRoom(roomId);
    if (!room.isPlaying && !room.currentTrack) {
      return { success: false, message: '⚠️ Não há nenhuma música tocando no momento.' };
    }
    const skipped = room.currentTrack;
    this.nextTrack(roomId, io, voiceRooms, broadcastVoiceState);
    return {
      success: true,
      message: `⏭️ Pulando: **${skipped.title}**`
    };
  }

  pause(roomId, io) {
    const room = getOrCreateRoom(roomId);
    if (!room.isPlaying || room.isPaused) {
      return { success: false, message: '⚠️ A música já está pausada ou não está tocando.' };
    }

    if (room.trackTimer) {
      clearTimeout(room.trackTimer);
      room.trackTimer = null;
    }

    room.isPaused = true;
    room.pausedAt = Date.now();
    const elapsed = Math.floor((room.pausedAt - room.startedAt) / 1000);
    room.elapsedBeforePause += elapsed;

    BOT_USER.isSpeaking = false;
    io.to(roomId).emit('voice:peer-speaking', { peerId: BOT_USER.id, isSpeaking: false });
    io.to(roomId).emit('music:pause', { roomId });

    return { success: true, message: '⏸️ Música pausada. Use `!resume` para continuar.' };
  }

  resume(roomId, io, voiceRooms, broadcastVoiceState) {
    const room = getOrCreateRoom(roomId);
    if (!room.isPlaying || !room.isPaused) {
      return { success: false, message: '⚠️ A música não está pausada.' };
    }

    room.isPaused = false;
    room.startedAt = Date.now();

    BOT_USER.isSpeaking = true;
    io.to(roomId).emit('voice:peer-speaking', { peerId: BOT_USER.id, isSpeaking: true });
    io.to(roomId).emit('music:resume', { roomId });

    // Restaura o timer do restante da música
    const current = room.currentTrack;
    if (current && !current.isLive && current.duration > 0) {
      const remainingSec = Math.max(1, current.duration - room.elapsedBeforePause);
      room.trackTimer = setTimeout(() => {
        this.nextTrack(roomId, io, voiceRooms, broadcastVoiceState);
      }, remainingSec * 1000);
    }

    return { success: true, message: '▶️ Continuando a reprodução da música!' };
  }

  stop(roomId, io, voiceRooms, broadcastVoiceState) {
    const room = getOrCreateRoom(roomId);
    if (room.trackTimer) clearTimeout(room.trackTimer);
    if (room.idleTimer) clearTimeout(room.idleTimer);

    room.queue = [];
    room.currentTrack = null;
    room.isPlaying = false;
    room.isPaused = false;

    BOT_USER.isSpeaking = false;
    io.to(roomId).emit('voice:peer-speaking', { peerId: BOT_USER.id, isSpeaking: false });
    io.to(roomId).emit('music:stop', { roomId });
    this.emitQueueUpdate(roomId, io);

    this.leaveVoice(roomId, io, voiceRooms, broadcastVoiceState);

    return { success: true, message: '⏹️ Música parada e fila limpa. Alfredo saiu do canal de voz.' };
  }

  clearQueue(roomId, io) {
    const room = getOrCreateRoom(roomId);
    const count = room.queue.length;
    room.queue = [];
    this.emitQueueUpdate(roomId, io);
    return { success: true, message: `🧹 Fila limpa! Foram removidas **${count}** faixas pendentes.` };
  }

  getNowPlaying(roomId) {
    const room = getOrCreateRoom(roomId);
    if (!room.isPlaying || !room.currentTrack) {
      return { success: false, message: '⚠️ Nenhuma música tocando no momento. Digite `!play <nome>` para tocar!' };
    }

    const t = room.currentTrack;
    let elapsed = room.elapsedBeforePause;
    if (!room.isPaused && room.startedAt > 0) {
      elapsed += Math.floor((Date.now() - room.startedAt) / 1000);
    }
    if (t.duration > 0 && elapsed > t.duration) elapsed = t.duration;

    const elapsedStr = formatDuration(elapsed);
    const progressPercent = t.duration > 0 ? Math.min(100, Math.floor((elapsed / t.duration) * 100)) : 100;
    const barLength = 16;
    const filled = Math.round((progressPercent / 100) * barLength);
    const bar = '▬'.repeat(Math.max(0, filled - 1)) + '🔘' + '▬'.repeat(Math.max(0, barLength - filled));

    return {
      success: true,
      track: t,
      elapsed,
      elapsedStr,
      isPaused: room.isPaused,
      message: `🎵 **Tocando Agora:**\n[${t.title}](${t.url})\nArtista: **${t.artist}**\n\`${bar}\` \`[${elapsedStr} / ${t.durationStr}]\`\nPedido por: **${t.requestedBy}**`
    };
  }

  getQueue(roomId) {
    const room = getOrCreateRoom(roomId);
    if (!room.isPlaying && room.queue.length === 0) {
      return { success: false, message: '📭 A fila de músicas está vazia. Digite `!play <nome>` para adicionar!' };
    }

    let text = `📜 **Fila de Músicas do Canal:**\n`;
    if (room.currentTrack) {
      text += `▶️ **Tocando agora:** [${room.currentTrack.title}](${room.currentTrack.url}) \`[${room.currentTrack.durationStr}]\` (Pedido por **${room.currentTrack.requestedBy}**)\n\n`;
    }

    if (room.queue.length > 0) {
      text += `**Próximas faixas (${room.queue.length}):**\n`;
      room.queue.slice(0, 10).forEach((tr, idx) => {
        text += `\`#${idx + 1}.\` [${tr.title}](${tr.url}) \`[${tr.durationStr}]\` — ${tr.requestedBy}\n`;
      });
      if (room.queue.length > 10) {
        text += `*...e mais ${room.queue.length - 10} músicas na fila.*`;
      }
    } else {
      text += `*Nenhuma música na fila a seguir.*`;
    }

    return { success: true, message: text, queue: room.queue, currentTrack: room.currentTrack };
  }

  emitQueueUpdate(roomId, io) {
    const room = getOrCreateRoom(roomId);
    io.to(roomId).emit('music:queue-update', {
      roomId,
      currentTrack: room.currentTrack,
      queue: room.queue,
      isPlaying: room.isPlaying,
      isPaused: room.isPaused
    });
  }

  ensureBotInVoice(roomId, io, voiceRooms, broadcastVoiceState) {
    if (!voiceRooms[roomId]) {
      voiceRooms[roomId] = new Set();
    }

    if (!BOT_USER.inVoice || BOT_USER.currentVoiceRoom !== roomId) {
      BOT_USER.inVoice = true;
      BOT_USER.currentVoiceRoom = roomId;
      voiceRooms[roomId].add(BOT_USER.id);

      console.log(`[MusicBot 🤖] Alfredo entrou no canal de voz: ${roomId}`);

      io.to(roomId).emit('voice:peer-joined', {
        peerId: BOT_USER.id,
        user: BOT_USER,
        roomId
      });

      if (typeof broadcastVoiceState === 'function') {
        broadcastVoiceState();
      }
    }
  }

  leaveVoice(roomId, io, voiceRooms, broadcastVoiceState) {
    if (voiceRooms && voiceRooms[roomId]) {
      voiceRooms[roomId].delete(BOT_USER.id);
    }
    BOT_USER.inVoice = false;
    BOT_USER.currentVoiceRoom = null;
    BOT_USER.isSpeaking = false;

    console.log(`[MusicBot 🤖] Alfredo saiu do canal de voz: ${roomId}`);

    io.to(roomId).emit('voice:peer-left', {
      peerId: BOT_USER.id,
      user: BOT_USER,
      roomId
    });

    if (typeof broadcastVoiceState === 'function') {
      broadcastVoiceState();
    }
  }
}

export const musicBot = new MusicBotService();
