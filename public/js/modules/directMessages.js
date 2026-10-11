// ==========================================================================
// FAKEDC - MENSAGENS DIRETAS (DMs 1 A 1 ESTILO DISCORD COM NOTIFICAÇÕES)
// ==========================================================================

import { escapeHtml } from './utils.js';

let activeSocket = null;
let getCurrentUserFn = () => null;
let activeDmTarget = null;
let onOpenDmCallback = null;

// Mapa de mensagens diretas não lidas por usuário: Map(usernameLower -> count)
const unreadDmCounts = new Map();

export function getUnreadDmTotal() {
  let total = 0;
  unreadDmCounts.forEach((count, username) => {
    const isViewing = activeDmTarget && activeDmTarget.toLowerCase() === username && document.hasFocus() && document.visibilityState === 'visible';
    if (!isViewing) {
      total += count;
    }
  });
  return total;
}

export function getUnreadDmCount(username) {
  if (!username) return 0;
  return unreadDmCounts.get(username.toLowerCase()) || 0;
}

export function clearUnreadDm(username) {
  if (!username) return;
  const key = username.toLowerCase();
  if (unreadDmCounts.has(key)) {
    unreadDmCounts.delete(key);
    if (activeSocket) {
      activeSocket.emit('dm:read', { targetUser: username });
    }
    updateDmBadgesUI();
  }
}

export function updateDmBadgesUI() {
  const totalUnread = getUnreadDmTotal();

  // 1. Atualizar badge do botão Home / Mensagens Diretas na barra lateral de servidores
  const btnHome = document.getElementById('btn-server-home');
  if (btnHome) {
    let badge = btnHome.querySelector('.guild-unread-badge');
    if (totalUnread > 0) {
      btnHome.classList.add('has-unread');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'guild-unread-badge';
        btnHome.appendChild(badge);
      }
      badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
    } else {
      btnHome.classList.remove('has-unread');
      if (badge) badge.remove();
    }
  }

  // 2. Atualizar badges de cada conversa na lista de DMs
  document.querySelectorAll('.dm-item').forEach(item => {
    const uName = (item.dataset.username || '').toLowerCase();
    const count = unreadDmCounts.get(uName) || 0;
    const isViewing = activeDmTarget && activeDmTarget.toLowerCase() === uName && document.hasFocus() && document.visibilityState === 'visible';
    const showUnread = count > 0 && !isViewing;

    item.classList.toggle('has-unread', showUnread);

    let badge = item.querySelector('.dm-unread-badge');
    if (showUnread) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'dm-unread-badge';
        item.appendChild(badge);
      }
      badge.textContent = count > 99 ? '99+' : count;
    } else if (badge) {
      badge.remove();
    }
  });

  // 3. Atualizar título da janela e badges gerais do aplicativo
  if (typeof window.updateAppTitleAndBadges === 'function') {
    window.updateAppTitleAndBadges();
  }
}

export function initDirectMessages({ socket, getCurrentUser, onOpenDm }) {
  activeSocket = socket;
  if (typeof getCurrentUser === 'function') getCurrentUserFn = getCurrentUser;
  onOpenDmCallback = onOpenDm;

  if (activeSocket) {
    activeSocket.on('dm:new-message', (msg) => {
      handleIncomingDm(msg);
    });
  }

  initNewDmModal();
}

export function loadConversations() {
  if (!activeSocket) return;
  activeSocket.emit('dm:conversations', (res) => {
    if (res && res.success && Array.isArray(res.conversations)) {
      // Sincroniza contador de não lidas vindos do banco de dados
      res.conversations.forEach(c => {
        if (!c.username) return;
        const key = c.username.toLowerCase();
        const isViewing = activeDmTarget && activeDmTarget.toLowerCase() === key && document.hasFocus() && document.visibilityState === 'visible';
        if (c.unreadCount > 0 && !isViewing) {
          unreadDmCounts.set(key, c.unreadCount);
        } else if (isViewing) {
          unreadDmCounts.delete(key);
        }
      });
      renderConversationsList(res.conversations);
      updateDmBadgesUI();
    }
  });
}

export function renderConversationsList(conversations = []) {
  const container = document.getElementById('dm-conversations-container');
  if (!container) return;

  container.innerHTML = '';

  if (conversations.length === 0) {
    container.innerHTML = `
      <div style="color: #949ba4; font-size: 13px; padding: 20px 12px; text-align: center; line-height: 1.4;">
        Nenhuma conversa recente.<br>
        <span style="font-size: 11px; color: #80848e;">Clique em um membro online na lista para iniciar uma conversa privada!</span>
      </div>
    `;
    return;
  }

  conversations.forEach(conv => {
    const item = document.createElement('div');
    const uKey = conv.username.toLowerCase();
    const count = unreadDmCounts.get(uKey) || conv.unreadCount || 0;
    const isViewing = activeDmTarget && activeDmTarget.toLowerCase() === uKey && document.hasFocus() && document.visibilityState === 'visible';
    const hasUnread = count > 0 && !isViewing;

    item.className = `dm-item ${activeDmTarget === conv.username ? 'active' : ''} ${hasUnread ? 'has-unread' : ''}`;
    item.dataset.username = conv.username;

    const avatarUrl = conv.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(conv.username)}`;

    item.innerHTML = `
      <div class="dm-item-avatar-wrap">
        <img src="${avatarUrl}" alt="${escapeHtml(conv.username)}" class="dm-item-avatar">
      </div>
      <div class="dm-item-info">
        <span class="dm-item-name">${escapeHtml(conv.username)}</span>
        <span class="dm-item-last">${escapeHtml(conv.lastMessage || '')}</span>
      </div>
      ${hasUnread ? `<span class="dm-unread-badge">${count > 99 ? '99+' : count}</span>` : ''}
    `;

    item.addEventListener('click', () => {
      openDirectChat(conv.username);
    });

    container.appendChild(item);
  });
}

export function openDirectChat(targetUsername) {
  if (!targetUsername) return;
  activeDmTarget = targetUsername;
  clearUnreadDm(targetUsername);

  // Atualiza classe ativa na lista de DMs
  const allItems = document.querySelectorAll('.dm-item');
  allItems.forEach(i => {
    if (i.dataset.username && i.dataset.username.toLowerCase() === targetUsername.toLowerCase()) {
      i.classList.add('active');
    } else {
      i.classList.remove('active');
    }
  });

  if (!activeSocket) return;

  activeSocket.emit('dm:history', { targetUser: targetUsername }, (res) => {
    if (res && res.success && typeof onOpenDmCallback === 'function') {
      onOpenDmCallback({
        targetUser: targetUsername,
        messages: res.messages || []
      });
    }
  });
}

export function getActiveDmTarget() {
  return activeDmTarget;
}

export function clearActiveDmTarget() {
  activeDmTarget = null;
}

export function startDirectMessage(targetUsername) {
  if (!targetUsername) return;
  const btnServerHome = document.getElementById('btn-server-home');
  if (btnServerHome) {
    btnServerHome.click();
  }
  openDirectChat(targetUsername);
}

window.startDirectMessage = startDirectMessage;
window.openDirectChat = openDirectChat;
window.getUnreadDmTotal = getUnreadDmTotal;
window.clearUnreadDm = clearUnreadDm;
window.updateDmBadgesUI = updateDmBadgesUI;

// Inicializa modal de nova DM
export function initNewDmModal() {
  const btnStartNewDm = document.getElementById('btn-start-new-dm');
  const modalNewDm = document.getElementById('new-dm-modal');
  const btnCloseNewDm = document.getElementById('btn-close-new-dm');
  const listContainer = document.getElementById('new-dm-members-list');

  if (btnStartNewDm && modalNewDm) {
    btnStartNewDm.addEventListener('click', () => {
      const currentUser = getCurrentUserFn();
      const onlineUsers = window.getAllOnlineUsers ? window.getAllOnlineUsers() : [];

      if (listContainer) {
        listContainer.innerHTML = '';
        const validUsers = onlineUsers.filter(u => !currentUser || u.name.toLowerCase() !== currentUser.name.toLowerCase());

        if (validUsers.length === 0) {
          listContainer.innerHTML = `
            <div style="color: #949ba4; font-size: 13px; text-align: center; padding: 24px 10px;">
              Nenhum outro membro online no momento.
            </div>
          `;
        } else {
          validUsers.forEach(u => {
            const item = document.createElement('div');
            item.className = 'dm-member-select-item';
            item.style.cssText = 'display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 4px; cursor: pointer; transition: background 0.15s ease;';
            item.innerHTML = `
              <img src="${u.avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
              <span style="color: #dbdee1; font-weight: 600; font-size: 14px;">${escapeHtml(u.name)}</span>
            `;
            item.onmouseenter = () => item.style.background = '#35373c';
            item.onmouseleave = () => item.style.background = 'transparent';
            item.onclick = () => {
              modalNewDm.style.display = 'none';
              startDirectMessage(u.name);
            };
            listContainer.appendChild(item);
          });
        }
      }

      modalNewDm.style.display = 'flex';
    });
  }

  if (btnCloseNewDm && modalNewDm) {
    btnCloseNewDm.addEventListener('click', () => {
      modalNewDm.style.display = 'none';
    });
  }
}

// Exibe popup / banner in-app estilo Discord para notificação de nova DM
export function showInAppDmToast(msg) {
  if (!msg) return;
  const currentUser = getCurrentUserFn();
  if (currentUser && currentUser.statusMode === 'dnd') return;

  let container = document.getElementById('dm-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'dm-toast-container';
    container.className = 'dm-toast-container';
    document.body.appendChild(container);
  }

  const avatarUrl = msg.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(msg.sender)}`;
  let snippet = msg.text || '';
  if (!snippet && msg.attachmentUrl) snippet = 'Enviou um anexo 📎';
  if (snippet.length > 80) snippet = snippet.substring(0, 77) + '...';

  const toast = document.createElement('div');
  toast.className = 'dm-notification-toast';
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <div class="dm-toast-avatar-box">
      <img src="${avatarUrl}" alt="${escapeHtml(msg.sender)}" class="dm-toast-avatar">
      <span class="dm-toast-icon-badge">💬</span>
    </div>
    <div class="dm-toast-content">
      <div class="dm-toast-header">
        <span class="dm-toast-sender">@${escapeHtml(msg.sender)}</span>
        <span class="dm-toast-time">agora</span>
      </div>
      <div class="dm-toast-text">${escapeHtml(snippet)}</div>
    </div>
    <button type="button" class="dm-toast-close" title="Fechar">&times;</button>
  `;

  // Clique no card abre imediatamente a conversa direta
  toast.addEventListener('click', (e) => {
    if (e.target.closest('.dm-toast-close')) return;
    startDirectMessage(msg.sender);
    toast.remove();
  });

  // Botão fechar
  const btnClose = toast.querySelector('.dm-toast-close');
  if (btnClose) {
    btnClose.addEventListener('click', (e) => {
      e.stopPropagation();
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 200);
    });
  }

  container.appendChild(toast);

  // Auto-remoção após 5.5s
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add('fade-out');
      setTimeout(() => {
        if (toast.parentNode) toast.remove();
      }, 250);
    }
  }, 5500);
}

function handleIncomingDm(msg) {
  const currentUser = getCurrentUserFn();
  if (!currentUser) return;

  const myName = currentUser.name.toLowerCase();
  const isSender = msg.sender.toLowerCase() === myName;
  const otherUser = isSender ? msg.receiver : msg.sender;
  const otherUserKey = otherUser.toLowerCase();

  const isAppFocused = document.hasFocus() && document.visibilityState === 'visible';
  const isViewingThisDm = activeDmTarget && activeDmTarget.toLowerCase() === otherUserKey && isAppFocused;

  if (isSender) {
    // Mensagem enviada pelo próprio usuário
    if (activeDmTarget && activeDmTarget.toLowerCase() === otherUserKey) {
      if (typeof window.appendDirectMessageToChat === 'function') {
        window.appendDirectMessageToChat(msg);
      }
    }
    loadConversations();
    return;
  }

  // Se for mensagem recebida de outro usuário:
  // 1. Som de notificação (respeitando status Não Perturbar)
  const isDnd = currentUser.statusMode === 'dnd';
  if (!isDnd) {
    if (window.sounds && typeof window.sounds.playMessage === 'function') {
      window.sounds.playMessage();
    }
  }

  // 2. Se a DM já está aberta na tela:
  if (activeDmTarget && activeDmTarget.toLowerCase() === otherUserKey) {
    if (typeof window.appendDirectMessageToChat === 'function') {
      window.appendDirectMessageToChat(msg);
    }
  }

  if (isViewingThisDm) {
    // Está olhando ativamente para a DM no momento: marca como lida no servidor
    if (activeSocket) {
      activeSocket.emit('dm:read', { targetUser: otherUser });
    }
  } else {
    // NÃO está olhando para esta DM (está em outro servidor, outro canal, ou app em segundo plano):
    const currentCount = unreadDmCounts.get(otherUserKey) || 0;
    unreadDmCounts.set(otherUserKey, currentCount + 1);

    updateDmBadgesUI();

    // Notificação nativa / desktop e flash na barra de tarefas
    if (typeof window.triggerDesktopNotification === 'function') {
      window.triggerDesktopNotification(`dm-${otherUser}`, {
        sender: msg.sender,
        text: msg.text,
        attachmentUrl: msg.attachmentUrl
      }, true);
    }

    // In-App Toast notification (banner flutuante)
    showInAppDmToast(msg);
  }

  // Recarrega a lista de conversas recentes com última mensagem atualizada
  loadConversations();
}
