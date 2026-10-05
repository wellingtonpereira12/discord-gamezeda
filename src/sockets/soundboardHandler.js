export function registerSoundboardHandlers(io, socket, users, voiceRooms) {
  // Disparar som para todos no canal de voz atual
  socket.on('soundboard:play', ({ soundId, soundUrl, soundName, emoji }) => {
    const user = users.get(socket.id);
    if (!user || !user.inVoice) return;
    const room = user.currentVoiceRoom || 'gamezeda';

    console.log(`[Soundboard 🔊] ${user.name} tocou som em [${room}]: ${soundName} (${emoji})`);

    // Emite para todos que estão no mesmo canal de voz
    io.to(room).emit('soundboard:played', {
      soundId,
      soundUrl,
      soundName,
      emoji,
      playedBy: user.name,
      playedById: socket.id
    });
  });
}
