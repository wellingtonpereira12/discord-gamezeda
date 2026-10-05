import { saveMessage, getChannelMessages, getChannels } from '../config/db.js';

export function registerChatHandlers(io, socket, users) {
  // Envio de mensagem
  socket.on('chat:send', async ({ channelId, text, attachmentUrl }) => {
    const user = users.get(socket.id);
    if (!user) return;
    if ((!text || !text.trim()) && !attachmentUrl) return;

    const validChannels = await getChannels();
    const targetChannel = validChannels.includes(channelId) ? channelId : 'geral';

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const msgPayload = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      channelId: targetChannel,
      sender: user.name,
      avatar: user.avatar,
      isSystem: false,
      text: (text || '').trim(),
      attachmentUrl: attachmentUrl || null,
      timestamp: `Hoje às ${timeStr}`
    };

    const saved = await saveMessage(msgPayload);

    // Emite para o canal correspondente
    io.emit('chat:new-message', {
      channelId: targetChannel,
      message: saved
    });
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
