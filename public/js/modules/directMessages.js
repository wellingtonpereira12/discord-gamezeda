// ==========================================================================
// FAKEDC - MENSAGENS DIRETAS (DMs 1 A 1 ESTILO DISCORD)
// ==========================================================================

import { escapeHtml } from './utils.js';

let activeSocket = null;
let getCurrentUserFn = () => null;
let activeDmTarget = null;
let onOpenDmCallback = null;

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
    if (res && res.success) {
      renderConversationsList(res.conversations || []);
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
    item.className = `dm-item ${activeDmTarget === conv.username ? 'active' : ''}`;
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

  // Atualiza classe ativa na lista de DMs
  const allItems = document.querySelectorAll('.dm-item');
  allItems.forEach(i => {
    if (i.dataset.username === targetUsername) {
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

function handleIncomingDm(msg) {
  const currentUser = getCurrentUserFn();
  if (!currentUser) return;

  const myName = currentUser.name.toLowerCase();
  const isSender = msg.sender.toLowerCase() === myName;
  const otherUser = isSender ? msg.receiver : msg.sender;

  // Se a conversa aberta no momento for com esse usuário, adiciona no chat
  if (activeDmTarget && activeDmTarget.toLowerCase() === otherUser.toLowerCase()) {
    if (typeof window.appendDirectMessageToChat === 'function') {
      window.appendDirectMessageToChat(msg);
    }
  } else if (!isSender) {
    // Notificação desktop e som se a conversa não estiver em foco
    if (typeof window.triggerDesktopNotification === 'function') {
      window.triggerDesktopNotification(`dm-${otherUser}`, {
        sender: msg.sender,
        text: msg.text,
        attachmentUrl: msg.attachmentUrl
      }, true);
    }
    if (window.sounds && typeof window.sounds.playMessage === 'function' && currentUser.statusMode !== 'dnd') {
      window.sounds.playMessage();
    }
  }

  // Recarrega a lista de conversas recentes
  loadConversations();
}
