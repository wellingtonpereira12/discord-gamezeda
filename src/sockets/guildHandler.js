import {
  getUserGuilds,
  createGuild,
  updateGuild,
  deleteGuild,
  joinGuildByInvite,
  getCategories,
  getChannelsFull,
  getChannelMessages,
  getGuildRoles,
  createGuildRole,
  deleteGuildRole,
  assignMemberRole,
  removeMemberRole,
  getGuildMembersWithRoles
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
      const user = users.get(socket.id);
      if (user) {
        user.currentGuildId = targetGuildId;
      }
      socket.join(`guild:${targetGuildId}`);

      const categories = await getCategories(targetGuildId);
      const channels = await getChannelsFull(targetGuildId);
      const roles = await getGuildRoles(targetGuildId);
      const userGuilds = await getUserGuilds(user ? user.name : null);
      const currentGuild = userGuilds.find(g => g.id === targetGuildId);

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
          guild: currentGuild,
          categories,
          channels,
          roles,
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

  // Atualizar configurações do servidor (Nome, Ícone)
  socket.on('guild:update', async ({ guildId, name, iconUrl }, callback) => {
    try {
      const user = users.get(socket.id);
      if (!user) {
        if (typeof callback === 'function') callback({ success: false, message: 'Não autenticado.' });
        return;
      }

      const updated = await updateGuild(guildId, { name, iconUrl });
      console.log(`[*] Servidor ${guildId} atualizado por ${user.name}:`, updated.name);

      // Notifica todos os clientes que o servidor foi atualizado
      io.emit('guild:updated', updated);

      if (typeof callback === 'function') {
        callback({ success: true, guild: updated });
      }
    } catch (err) {
      console.warn('Erro ao atualizar servidor:', err.message);
      if (typeof callback === 'function') {
        callback({ success: false, message: err.message });
      }
    }
  });

  // Listar Cargos do Servidor
  socket.on('guild:roles:list', async ({ guildId }, callback) => {
    try {
      const roles = await getGuildRoles(guildId);
      if (typeof callback === 'function') {
        callback({ success: true, roles });
      }
    } catch (err) {
      if (typeof callback === 'function') {
        callback({ success: false, message: err.message });
      }
    }
  });

  // Criar Novo Cargo
  socket.on('guild:role:create', async ({ guildId, name, color, permissions }, callback) => {
    try {
      const user = users.get(socket.id);
      if (!user) {
        if (typeof callback === 'function') callback({ success: false, message: 'Não autenticado.' });
        return;
      }

      const newRole = await createGuildRole(guildId, { name, color, permissions });
      console.log(`[+] Cargo [${newRole.name}] criado no servidor ${guildId} por ${user.name}`);

      io.to(`guild:${guildId}`).emit('guild:roles:updated', { guildId });
      io.emit('guild:roles:updated', { guildId });

      if (typeof callback === 'function') {
        callback({ success: true, role: newRole });
      }
    } catch (err) {
      console.warn('Erro ao criar cargo:', err.message);
      if (typeof callback === 'function') {
        callback({ success: false, message: err.message });
      }
    }
  });

  // Excluir Cargo
  socket.on('guild:role:delete', async ({ guildId, roleId }, callback) => {
    try {
      const user = users.get(socket.id);
      if (!user) {
        if (typeof callback === 'function') callback({ success: false, message: 'Não autenticado.' });
        return;
      }

      await deleteGuildRole(guildId, roleId);
      console.log(`[-] Cargo [${roleId}] excluído do servidor ${guildId} por ${user.name}`);

      io.to(`guild:${guildId}`).emit('guild:roles:updated', { guildId });
      io.emit('guild:roles:updated', { guildId });

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (err) {
      console.warn('Erro ao excluir cargo:', err.message);
      if (typeof callback === 'function') {
        callback({ success: false, message: err.message });
      }
    }
  });

  // Listar Membros do Servidor com Cargos
  socket.on('guild:members:list', async ({ guildId }, callback) => {
    try {
      const members = await getGuildMembersWithRoles(guildId);
      if (typeof callback === 'function') {
        callback({ success: true, members });
      }
    } catch (err) {
      if (typeof callback === 'function') {
        callback({ success: false, message: err.message });
      }
    }
  });

  // Atribuir Cargo a Membro
  socket.on('guild:member:role:assign', async ({ guildId, username, roleId }, callback) => {
    try {
      await assignMemberRole(guildId, username, roleId);
      io.to(`guild:${guildId}`).emit('guild:members:roles-changed', { guildId });
      io.emit('guild:members:roles-changed', { guildId });

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (err) {
      if (typeof callback === 'function') {
        callback({ success: false, message: err.message });
      }
    }
  });

  // Remover Cargo de Membro
  socket.on('guild:member:role:remove', async ({ guildId, username, roleId }, callback) => {
    try {
      await removeMemberRole(guildId, username, roleId);
      io.to(`guild:${guildId}`).emit('guild:members:roles-changed', { guildId });
      io.emit('guild:members:roles-changed', { guildId });

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (err) {
      if (typeof callback === 'function') {
        callback({ success: false, message: err.message });
      }
    }
  });

  // Excluir Servidor
  socket.on('guild:delete', async ({ guildId }, callback) => {
    try {
      const user = users.get(socket.id);
      if (!user) {
        if (typeof callback === 'function') callback({ success: false, message: 'Usuário não autenticado.' });
        return;
      }

      const targetGuildId = (guildId || '').trim();
      if (!targetGuildId || targetGuildId === 'gamezeda') {
        if (typeof callback === 'function') callback({ success: false, message: 'O servidor principal não pode ser excluído.' });
        return;
      }

      await deleteGuild(targetGuildId, user.name);
      console.log(`[-] Servidor [${targetGuildId}] excluído por ${user.name}`);

      io.emit('guild:deleted', { guildId: targetGuildId });

      // Atualiza lista de servidores de todos os usuários
      for (const [sId, u] of users.entries()) {
        const s = io.sockets.sockets.get(sId);
        if (s && u) {
          const uGuilds = await getUserGuilds(u.name);
          s.emit('guild:updated-list', uGuilds);
        }
      }

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (err) {
      console.warn('Erro ao excluir servidor:', err.message);
      if (typeof callback === 'function') {
        callback({ success: false, message: err.message });
      }
    }
  });
}
