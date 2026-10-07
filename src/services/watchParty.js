import yts from 'yt-search';

export function extractYouTubeVideoId(input) {
  if (!input) return null;
  const str = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }
  const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}

const rooms = new Map();

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      roomId,
      isActive: false,
      videoId: null,
      title: '',
      author: '',
      thumbnail: '',
      duration: 0,
      durationStr: '0:00',
      startedAt: 0,
      pausedAt: 0,
      currentTime: 0,
      isPlaying: false,
      isPaused: false,
      hostId: null,
      hostName: null,
      queue: []
    });
  }
  return rooms.get(roomId);
}

export async function searchYouTubeVideos(query) {
  const clean = (query || '').trim();
  if (!clean) return [];

  const directId = extractYouTubeVideoId(clean);
  if (directId) {
    try {
      const v = await yts({ videoId: directId });
      if (v && v.title) {
        return [{
          videoId: v.videoId,
          title: v.title,
          author: v.author ? v.author.name : 'YouTube',
          thumbnail: v.thumbnail || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
          duration: v.seconds || 0,
          durationStr: v.timestamp || '0:00',
          url: v.url
        }];
      }
    } catch (e) {
      console.warn('[WatchParty ⚠️] Erro ao buscar videoId direto:', e.message);
    }
  }

  try {
    const res = await yts(clean);
    if (!res || !res.videos || res.videos.length === 0) return [];
    return res.videos.slice(0, 6).map(v => ({
      videoId: v.videoId,
      title: v.title,
      author: v.author ? v.author.name : 'YouTube',
      thumbnail: v.thumbnail || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
      duration: v.seconds || 0,
      durationStr: v.timestamp || '0:00',
      url: v.url
    }));
  } catch (err) {
    console.error('[WatchParty ❌] Erro na busca do YouTube:', err.message);
    return [];
  }
}

export class WatchPartyService {
  constructor() {
    this.rooms = rooms;
  }

  getRoomState(roomId) {
    const r = getOrCreateRoom(roomId);
    if (r.isActive && r.isPlaying && !r.isPaused && r.startedAt > 0) {
      r.currentTime = Math.max(0, Math.floor((Date.now() - r.startedAt) / 1000));
    }
    return { ...r };
  }

  async startOrQueue(roomId, query, user, io) {
    const r = getOrCreateRoom(roomId);
    const videos = await searchYouTubeVideos(query);
    if (!videos || videos.length === 0) {
      return { success: false, message: `❌ Nenhum vídeo encontrado para: \`${query}\`` };
    }

    const video = videos[0];

    if (!r.isActive) {
      // Inicia a Watch Party
      r.isActive = true;
      r.videoId = video.videoId;
      r.title = video.title;
      r.author = video.author;
      r.thumbnail = video.thumbnail;
      r.duration = video.duration;
      r.durationStr = video.durationStr;
      r.currentTime = 0;
      r.startedAt = Date.now();
      r.pausedAt = 0;
      r.isPlaying = true;
      r.isPaused = false;
      r.hostId = user.id;
      r.hostName = user.name;
      r.queue = [];

      console.log(`[WatchParty 📺] Nova sessão iniciada na sala ${roomId} por ${user.name}: "${video.title}"`);

      io.to(roomId).emit('watchparty:init', {
        ...this.getRoomState(roomId),
        triggeredBy: user.name
      });

      return {
        success: true,
        action: 'started',
        video,
        message: `📺 **Watch Party iniciada:** [${video.title}](${video.url}) \`[${video.durationStr}]\` por **${user.name}**`
      };
    } else {
      // Já está ativa: adiciona na fila
      r.queue.push(video);
      io.to(roomId).emit('watchparty:queue-update', {
        roomId,
        queue: r.queue
      });

      return {
        success: true,
        action: 'queued',
        video,
        position: r.queue.length,
        message: `➕ **Adicionado à fila do Watch Party:** [${video.title}](${video.url}) \`[${video.durationStr}]\` — Posição **#${r.queue.length}**`
      };
    }
  }

  playNext(roomId, io) {
    const r = getOrCreateRoom(roomId);
    if (r.queue.length > 0) {
      const next = r.queue.shift();
      r.videoId = next.videoId;
      r.title = next.title;
      r.author = next.author;
      r.thumbnail = next.thumbnail;
      r.duration = next.duration;
      r.durationStr = next.durationStr;
      r.currentTime = 0;
      r.startedAt = Date.now();
      r.pausedAt = 0;
      r.isPlaying = true;
      r.isPaused = false;

      io.to(roomId).emit('watchparty:init', {
        ...this.getRoomState(roomId)
      });
      return { success: true, video: next };
    } else {
      this.stop(roomId, null, io);
      return { success: false, message: 'Fila finalizada.' };
    }
  }

  pause(roomId, currentTime = 0, user, io) {
    const r = getOrCreateRoom(roomId);
    if (!r.isActive) return;

    r.isPaused = true;
    r.isPlaying = false;
    r.pausedAt = Date.now();
    r.currentTime = currentTime;

    io.to(roomId).emit('watchparty:pause', {
      roomId,
      currentTime,
      triggeredBy: user ? user.name : 'Alguém'
    });
  }

  resume(roomId, currentTime = 0, user, io) {
    const r = getOrCreateRoom(roomId);
    if (!r.isActive) return;

    r.isPaused = false;
    r.isPlaying = true;
    r.currentTime = currentTime;
    r.startedAt = Date.now() - (currentTime * 1000);

    io.to(roomId).emit('watchparty:resume', {
      roomId,
      currentTime,
      triggeredBy: user ? user.name : 'Alguém'
    });
  }

  seek(roomId, currentTime = 0, user, io) {
    const r = getOrCreateRoom(roomId);
    if (!r.isActive) return;

    r.currentTime = currentTime;
    if (r.isPlaying && !r.isPaused) {
      r.startedAt = Date.now() - (currentTime * 1000);
    }

    io.to(roomId).emit('watchparty:seek', {
      roomId,
      currentTime,
      triggeredBy: user ? user.name : 'Alguém'
    });
  }

  stop(roomId, user, io) {
    const r = getOrCreateRoom(roomId);
    if (!r.isActive) return;

    r.isActive = false;
    r.videoId = null;
    r.title = '';
    r.author = '';
    r.thumbnail = '';
    r.duration = 0;
    r.currentTime = 0;
    r.isPlaying = false;
    r.isPaused = false;
    r.hostId = null;
    r.hostName = null;
    r.queue = [];

    console.log(`[WatchParty 📺] Sessão finalizada na sala ${roomId}`);

    io.to(roomId).emit('watchparty:stop', {
      roomId,
      triggeredBy: user ? user.name : 'Alguém'
    });
  }
}

export const watchPartyService = new WatchPartyService();
