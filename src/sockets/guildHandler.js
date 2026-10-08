import {
  getUserGuilds,
  createGuild,
  joinGuildByInvite,
  getCategories,
  getChannelsFull,
  getChannelMessages
} from '../config/db.js';

export function registerGuildHandlers(io, socket, users) {
  // Listar servidores do usuário
  socket.on('guild:list', async (callback) => {
    try {
      const user = users.get(socket.id);
      const guilds = await getUserGuilds(user ? user.name : null);
      if (typeof callback === 'function') {
        callback({ success: true, guilds });
      }
    } catch (err) {
      if (typeof callback === 'function') {
        callback({ success: false, message: err.message });
      }
    }
  });

  // Criar novo servidor
  socket.on('guild:create', async ({ name, iconUrl }, callback) => {
    try {
      const user = users.get(socket.id);
      if (!user) {
        if (typeof callback === 'function') callback({ success: false, message: 'Usuário não autenticado.' });
        return;
      }

      const cleanName = (name || '').trim();
      if (!cleanName) {
        if (typeof callback === 'function') callback({ success: false, message: 'Nome do servidor é obrigatório.' });
        return;
      }

      const newGuild = await createGuild({
        name: cleanName,
        iconUrl: iconUrl || null,
        ownerUsername: user.name
      });

      console.log(`[+] Servidor criado por ${user.name}: ${newGuild.name} (${newGuild.id})`);

      // Notifica o criador com a lista atualizada
      const userGuilds = await getUserGuilds(user.name);
      socket.emit('guild:updated-list', userGuilds);

      if (typeof callback === 'function') {
        callback({ success: true, guild: newGuild });
      }
    } catch (err) {
      console.warn('Erro ao criar servidor:', err.message);
      if (typeof callback === 'function') {
        callback({ success: false, message: err.message });
      }
    }
  });

  // Entrar em servidor via código de convite
  socket.on('guild:join', async ({ inviteCode }, callback) => {
    try {
      const user = users.get(socket.id);
      if (!user) {
        if (typeof callback === 'function') callback({ success: false, message: 'Usuário não autenticado.' });
        return;
      }

      const joinedGuild = await joinGuildByInvite(user.name, inviteCode);
      console.log(`[+] Usuário ${user.name} entrou no servidor ${joinedGuild.name} (${joinedGuild.id})`);

      const userGuilds = await getUserGuilds(user.name);
      socket.emit('guild:updated-list', userGuilds);

      if (typeof callback === 'function') {
        callback({ success: true, guild: joinedGuild });
      }
    } catch (err) {
      console.warn('Erro ao entrar no servidor por convite:', err.message);
      if (typeof callback === 'function') {
        callback({ success: false, message: err.message });
      }
    }
  });

  // Selecionar/Alternar para outro servidor
  socket.on('guild:select', async ({ guildId }, callback) => {
    try {
      const targetGuildId = guildId || 'gamezeda';
      const categories = await getCategories(targetGuildId);
      const channels = await getChannelsFull(targetGuildId);

      const messagesMap = {};
      for (const ch of channels) {
        if (ch.type === 'text') {
          messagesMap[ch.id] = await getChannelMessages(ch.id, 50);
        }
      }

      if (typeof callback === 'function') {
        callback({
          success: true,
          guildId: targetGuildId,
          categories,
          channels,
          chatMessages: messagesMap
        });
      }
    } catch (err) {
      console.warn('Erro ao carregar dados do servidor:', err.message);
      if (typeof callback === 'function') {
        callback({ success: false, message: err.message });
      }
    }
  });
}
