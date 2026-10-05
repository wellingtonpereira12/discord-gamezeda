export function registerSoundboardHandlers(io, socket, users, voiceRooms) {
  // Disparar som para todos no canal de voz
  socket.on('soundboard:play', ({ soundId, soundUrl, soundName, emoji }) => {
    const user = users.get(socket.id);
    if (!user || !user.inVoice) return;

    console.log(`[Soundboard 🔊] ${user.name} tocou som: ${soundName} (${emoji})`);

    // Emite para todos que estão no canal gamezeda
    io.to('gamezeda').emit('soundboard:played', {
      soundId,
      soundUrl,
      soundName,
      emoji,
      playedBy: user.name,
      playedById: socket.id
    });
  });
}
