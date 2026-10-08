// ==========================================================================
// FAKEDC - GERENCIAMENTO DE SERVIDORES / GUILDS (ESTILO DISCORD)
// ==========================================================================

import { escapeHtml } from './utils.js';

let activeSocket = null;
let activeGuildId = 'gamezeda';
let cachedGuilds = [];
let onGuildSelectedCallback = null;
let onHomeSelectedCallback = null;

export function initGuilds({ socket, onGuildSelected, onHomeSelected }) {
  activeSocket = socket;
  onGuildSelectedCallback = onGuildSelected;
  onHomeSelectedCallback = onHomeSelected;

  const btnServerHome = document.getElementById('btn-server-home');
  const btnCreateServerTrigger = document.getElementById('btn-create-server-trigger');
  const btnJoinServerTrigger = document.getElementById('btn-join-server-trigger');
  const btnMenuInvitePeople = document.getElementById('btn-menu-invite-people');

  // Modais
  const createServerModal = document.getElementById('create-server-modal');
  const btnCloseCreateServer = document.getElementById('btn-close-create-server');
  const btnCancelCreateServer = document.getElementById('btn-cancel-create-server');
  const createServerForm = document.getElementById('create-server-form');
  const serverIconUploadTrigger = document.getElementById('server-icon-upload-trigger');
  const createServerIconInput = document.getElementById('create-server-icon-input');
  const createServerPreviewImg = document.getElementById('create-server-preview-img');
  const createServerUploadPlaceholder = document.getElementById('create-server-upload-placeholder');
  const createServerNameInput = document.getElementById('create-server-name-input');

  const joinServerModal = document.getElementById('join-server-modal');
  const btnCloseJoinServer = document.getElementById('btn-close-join-server');
  const btnCancelJoinServer = document.getElementById('btn-cancel-join-server');
  const joinServerForm = document.getElementById('join-server-form');
  const joinServerCodeInput = document.getElementById('join-server-code-input');

  const inviteServerModal = document.getElementById('invite-server-modal');
  const btnCloseInviteServer = document.getElementById('btn-close-invite-server');
  const btnCopyInviteCode = document.getElementById('btn-copy-invite-code');
  const inviteServerCodeDisplay = document.getElementById('invite-server-code-display');
  const inviteCopyFeedback = document.getElementById('invite-copy-feedback');

  let uploadedServerIconUrl = null;

  // Botão Home (Mensagens Diretas)
  if (btnServerHome) {
    btnServerHome.addEventListener('click', () => {
      setActiveGuild(null);
      if (typeof onHomeSelectedCallback === 'function') {
        onHomeSelectedCallback();
      }
    });
  }

  // Abrir Modal Criar Servidor
  if (btnCreateServerTrigger) {
    btnCreateServerTrigger.addEventListener('click', () => {
      uploadedServerIconUrl = null;
      if (createServerPreviewImg) {
        createServerPreviewImg.style.display = 'none';
        createServerPreviewImg.src = '';
      }
      if (createServerUploadPlaceholder) {
        createServerUploadPlaceholder.style.display = 'flex';
      }
      if (createServerForm) createServerForm.reset();
      if (createServerModal) createServerModal.style.display = 'flex';
    });
  }

  // Fechar Modal Criar Servidor
  const closeCreateModal = () => {
    if (createServerModal) createServerModal.style.display = 'none';
  };
  if (btnCloseCreateServer) btnCloseCreateServer.addEventListener('click', closeCreateModal);
  if (btnCancelCreateServer) btnCancelCreateServer.addEventListener('click', closeCreateModal);

  // Upload de Ícone no Modal Criar Servidor
  if (serverIconUploadTrigger && createServerIconInput) {
    serverIconUploadTrigger.addEventListener('click', () => {
      createServerIconInput.click();
    });

    createServerIconInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('icon', file);

      try {
        const res = await fetch('/api/upload/server-icon', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.success && data.url) {
          uploadedServerIconUrl = data.url;
          if (createServerPreviewImg) {
            createServerPreviewImg.src = data.url;
            createServerPreviewImg.style.display = 'block';
          }
          if (createServerUploadPlaceholder) {
            createServerUploadPlaceholder.style.display = 'none';
          }
        } else {
          alert(data.error || 'Erro no upload da imagem.');
        }
      } catch (err) {
        alert('Falha na comunicação ao enviar foto do servidor.');
      }
    });
  }

  // Submissão do Formulário Criar Servidor
  if (createServerForm) {
    createServerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = createServerNameInput ? createServerNameInput.value.trim() : '';
      if (!name) return;

      if (!activeSocket) return;

      activeSocket.emit('guild:create', {
        name,
        iconUrl: uploadedServerIconUrl
      }, (res) => {
        if (res && res.success && res.guild) {
          closeCreateModal();
          selectGuild(res.guild.id);
        } else {
          alert((res && res.message) || 'Erro ao criar servidor.');
        }
      });
    });
  }

  // Abrir Modal Entrar em Servidor
  if (btnJoinServerTrigger) {
    btnJoinServerTrigger.addEventListener('click', () => {
      if (joinServerForm) joinServerForm.reset();
      if (joinServerModal) joinServerModal.style.display = 'flex';
    });
  }

  const closeJoinModal = () => {
    if (joinServerModal) joinServerModal.style.display = 'none';
  };
  if (btnCloseJoinServer) btnCloseJoinServer.addEventListener('click', closeJoinModal);
  if (btnCancelJoinServer) btnCancelJoinServer.addEventListener('click', closeJoinModal);

  // Submissão do Formulário Entrar em Servidor
  if (joinServerForm) {
    joinServerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = joinServerCodeInput ? joinServerCodeInput.value.trim() : '';
      if (!code) return;

      if (!activeSocket) return;

      activeSocket.emit('guild:join', { inviteCode: code }, (res) => {
        if (res && res.success && res.guild) {
          closeJoinModal();
          selectGuild(res.guild.id);
        } else {
          alert((res && res.message) || 'Código de convite inválido ou servidor não encontrado.');
        }
      });
    });
  }

  // Abrir Modal Convidar Amigos (do menu do servidor)
  if (btnMenuInvitePeople) {
    btnMenuInvitePeople.addEventListener('click', () => {
      const currentGuild = cachedGuilds.find(g => g.id === activeGuildId) || { inviteCode: 'fakedc', name: 'FakeDC' };
      if (inviteServerCodeDisplay) {
        inviteServerCodeDisplay.value = currentGuild.inviteCode || activeGuildId;
      }
      const titleEl = document.getElementById('invite-server-title');
      if (titleEl) {
        titleEl.textContent = `Convidar amigos para ${currentGuild.name}`;
      }
      if (inviteCopyFeedback) inviteCopyFeedback.style.display = 'none';
      if (inviteServerModal) inviteServerModal.style.display = 'flex';
    });
  }

  const closeInviteModal = () => {
    if (inviteServerModal) inviteServerModal.style.display = 'none';
  };
  if (btnCloseInviteServer) btnCloseInviteServer.addEventListener('click', closeInviteModal);

  // Copiar código de convite
  if (btnCopyInviteCode) {
    btnCopyInviteCode.addEventListener('click', async () => {
      if (!inviteServerCodeDisplay) return;
      try {
        await navigator.clipboard.writeText(inviteServerCodeDisplay.value);
        if (inviteCopyFeedback) {
          inviteCopyFeedback.style.display = 'block';
          setTimeout(() => {
            if (inviteCopyFeedback) inviteCopyFeedback.style.display = 'none';
          }, 3000);
        }
      } catch (e) {
        inviteServerCodeDisplay.select();
        document.execCommand('copy');
      }
    });
  }

  // Socket listener de atualização de servidores
  if (activeSocket) {
    activeSocket.on('guild:updated-list', (guilds) => {
      renderGuildsList(guilds);
    });
  }
}

export function renderGuildsList(guilds = []) {
  cachedGuilds = guilds || [];
  const container = document.getElementById('guilds-scroll-container');
  if (!container) return;

  container.innerHTML = '';

  cachedGuilds.forEach(guild => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `guild-icon-btn ${guild.id === activeGuildId ? 'active' : ''}`;
    btn.title = guild.name;
    btn.setAttribute('aria-label', guild.name);
    btn.dataset.guildId = guild.id;

    // Iniciais do nome caso não tenha foto
    const initials = guild.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

    btn.innerHTML = `
      <div class="guild-pill"></div>
      <div class="guild-avatar">
        ${guild.iconUrl 
          ? `<img src="${escapeHtml(guild.iconUrl)}" alt="${escapeHtml(guild.name)}" class="guild-img">` 
          : `<span>${escapeHtml(initials || 'DC')}</span>`}
      </div>
    `;

    btn.addEventListener('click', () => {
      selectGuild(guild.id);
    });

    container.appendChild(btn);
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

export function selectGuild(guildId) {
  setActiveGuild(guildId);
  const targetGuild = cachedGuilds.find(g => g.id === guildId) || { id: guildId, name: 'Servidor', iconUrl: '/assets/logo.png' };

  // Atualiza o cabeçalho do servidor na barra de canais
  const headerName = document.getElementById('server-header-name');
  const headerIcon = document.getElementById('server-header-icon');
  if (headerName) headerName.textContent = targetGuild.name;
  if (headerIcon) headerIcon.src = targetGuild.iconUrl || '/assets/logo.png';

  if (!activeSocket) return;

  activeSocket.emit('guild:select', { guildId }, (res) => {
    if (res && res.success && typeof onGuildSelectedCallback === 'function') {
      onGuildSelectedCallback(res);
    }
  });
}

export function setActiveGuild(guildId) {
  activeGuildId = guildId;

  const btnServerHome = document.getElementById('btn-server-home');
  if (btnServerHome) {
    if (!guildId) {
      btnServerHome.classList.add('active');
    } else {
      btnServerHome.classList.remove('active');
    }
  }

  const allBtns = document.querySelectorAll('#guilds-scroll-container .guild-icon-btn');
  allBtns.forEach(b => {
    if (b.dataset.guildId === guildId) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });
}

export function getActiveGuildId() {
  return activeGuildId;
}
