import { createCategory, deleteCategory, createChannel, deleteChannel } from '../config/db.js';
import { leaveVoiceRoom } from './voiceHandler.js';

export function registerChannelHandlers(io, socket, users, voiceRooms, broadcastVoiceState, broadcastOnlineMembers) {
  // Criar Categoria ("Abinha Separadora")
  socket.on('category:create', async ({ name }, callback) => {
    try {
      const user = users.get(socket.id);
      if (!user) return;

      const newCat = await createCategory({ name });
      console.log(`[+] Categoria criada por ${user.name}: ${newCat.name} (${newCat.id})`);
      io.emit('category:created', newCat);

      if (typeof callback === 'function') {
        callback({ success: true, category: newCat });
      }
    } catch (err) {
      console.warn('Erro ao criar categoria:', err.message);
      if (typeof callback === 'function') {
        callback({ success: false, message: err.message });
      }
    }
  });

  // Excluir Categoria
  socket.on('category:delete', async ({ categoryId }, callback) => {
    try {
      const user = users.get(socket.id);
      if (!user) return;

      await deleteCategory(categoryId);
      console.log(`[-] Categoria excluída por ${user.name}: ${categoryId}`);
      io.emit('category:deleted', { categoryId });

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (err) {
      console.warn('Erro ao excluir categoria:', err.message);
      if (typeof callback === 'function') {
        callback({ success: false, message: err.message });
      }
    }
  });

  // Criar Canal (Texto ou Voz)
  socket.on('channel:create', async ({ name, type, categoryId }, callback) => {
    try {
      const user = users.get(socket.id);
      if (!user) return;

      const newChannel = await createChannel({ name, type, categoryId });
      console.log(`[+] Canal criado por ${user.name}: #${newChannel.name} [${newChannel.type}] (${newChannel.id})`);
      io.emit('channel:created', newChannel);

      if (typeof callback === 'function') {
        callback({ success: true, channel: newChannel });
      }
    } catch (err) {
      console.warn('Erro ao criar canal:', err.message);
      if (typeof callback === 'function') {
        callback({ success: false, message: err.message });
      }
    }
  });

  // Excluir Canal
  socket.on('channel:delete', async ({ channelId }, callback) => {
    try {
      const user = users.get(socket.id);
      if (!user) return;

      if (channelId === 'geral') {
        if (typeof callback === 'function') {
          callback({ success: false, message: 'O canal geral é fixo e não pode ser excluído.' });
        }
        return;
      }

      // Se for canal de voz ativo e houver participantes conectados nele
      if (voiceRooms[channelId] && voiceRooms[channelId].size > 0) {
        for (const sId of Array.from(voiceRooms[channelId])) {
          const u = users.get(sId);
          const s = io.sockets.sockets.get(sId);
          if (s && u) {
            leaveVoiceRoom(io, s, u, users, voiceRooms, broadcastVoiceState, broadcastOnlineMembers);
            s.emit('voice:channel-deleted', { channelId });
          }
        }
      }

      await deleteChannel(channelId);
      console.log(`[-] Canal excluído por ${user.name}: ${channelId}`);
      io.emit('channel:deleted', { channelId });

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (err) {
      console.warn('Erro ao excluir canal:', err.message);
      if (typeof callback === 'function') {
        callback({ success: false, message: err.message });
      }
    }
  });
}
