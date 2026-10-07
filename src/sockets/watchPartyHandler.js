import { watchPartyService, searchYouTubeVideos } from '../services/watchParty.js';

export function registerWatchPartyHandlers(io, socket, users) {
  // Busca interativa de vídeos no YouTube para a modal
  socket.on('watchparty:search', async ({ query }, callback) => {
    try {
      const results = await searchYouTubeVideos(query);
      if (typeof callback === 'function') {
        callback({ success: true, results });
      } else {
        socket.emit('watchparty:search-results', { results });
      }
    } catch (e) {
      if (typeof callback === 'function') callback({ success: false, results: [] });
    }
  });

  // Iniciar sessão ou adicionar à fila
  socket.on('watchparty:start', async ({ query }) => {
    const user = users.get(socket.id);
    if (!user || !user.inVoice || !user.currentVoiceRoom) return;

    await watchPartyService.startOrQueue(user.currentVoiceRoom, query, user, io);
  });

  // Pausar
  socket.on('watchparty:pause', ({ currentTime }) => {
    const user = users.get(socket.id);
    if (!user || !user.inVoice || !user.currentVoiceRoom) return;

    watchPartyService.pause(user.currentVoiceRoom, currentTime, user, io);
  });

  // Retomar (Play)
  socket.on('watchparty:resume', ({ currentTime }) => {
    const user = users.get(socket.id);
    if (!user || !user.inVoice || !user.currentVoiceRoom) return;

    watchPartyService.resume(user.currentVoiceRoom, currentTime, user, io);
  });

  // Pular para segundo específico (Seek)
  socket.on('watchparty:seek', ({ currentTime }) => {
    const user = users.get(socket.id);
    if (!user || !user.inVoice || !user.currentVoiceRoom) return;

    watchPartyService.seek(user.currentVoiceRoom, currentTime, user, io);
  });

  // Próximo vídeo
  socket.on('watchparty:skip', () => {
    const user = users.get(socket.id);
    if (!user || !user.inVoice || !user.currentVoiceRoom) return;

    watchPartyService.playNext(user.currentVoiceRoom, io);
  });

  // Encerrar sessão
  socket.on('watchparty:stop', () => {
    const user = users.get(socket.id);
    if (!user || !user.inVoice || !user.currentVoiceRoom) return;

    watchPartyService.stop(user.currentVoiceRoom, user, io);
  });

  // Consulta do estado atual
  socket.on('watchparty:get-state', (callback) => {
    const user = users.get(socket.id);
    if (!user || !user.inVoice || !user.currentVoiceRoom) return;

    const state = watchPartyService.getRoomState(user.currentVoiceRoom);
    if (typeof callback === 'function') {
      callback(state);
    } else {
      socket.emit('watchparty:state', state);
    }
  });
}
