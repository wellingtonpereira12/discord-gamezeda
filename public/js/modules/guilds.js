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

  // Dropdown do cabeçalho do servidor
  const serverHeaderBtn = document.getElementById('server-header-btn');
  const serverDropdownMenu = document.getElementById('server-dropdown-menu');
  const btnMenuServerSettings = document.getElementById('btn-menu-server-settings');
  const btnMenuCreateChannel = document.getElementById('btn-menu-create-channel');
  const btnMenuCreateCategory = document.getElementById('btn-menu-create-category');

  if (serverHeaderBtn && serverDropdownMenu) {
    serverHeaderBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = serverDropdownMenu.style.display === 'flex';
      serverDropdownMenu.style.display = isVisible ? 'none' : 'flex';
    });

    window.addEventListener('click', () => {
      if (serverDropdownMenu) serverDropdownMenu.style.display = 'none';
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && serverDropdownMenu) {
        serverDropdownMenu.style.display = 'none';
      }
    });
  }

  if (btnMenuCreateChannel) {
    btnMenuCreateChannel.addEventListener('click', () => {
      if (serverDropdownMenu) serverDropdownMenu.style.display = 'none';
      if (typeof window.openCreateChannelModal === 'function') {
        window.openCreateChannelModal();
      }
    });
  }

  if (btnMenuCreateCategory) {
    btnMenuCreateCategory.addEventListener('click', () => {
      if (serverDropdownMenu) serverDropdownMenu.style.display = 'none';
      if (typeof window.openCreateCategoryModal === 'function') {
        window.openCreateCategoryModal();
      }
    });
  }

  // Modal de Configurações do Servidor
  const serverSettingsModal = document.getElementById('server-settings-modal');
  const btnCloseServerSettings = document.getElementById('btn-close-server-settings');
  const tabBtnOverview = document.getElementById('tab-btn-server-overview');
  const tabBtnRoles = document.getElementById('tab-btn-server-roles');
  const tabBtnMembers = document.getElementById('tab-btn-server-members');

  const tabContentOverview = document.getElementById('tab-content-server-overview');
  const tabContentRoles = document.getElementById('tab-content-server-roles');
  const tabContentMembers = document.getElementById('tab-content-server-members');

  const settingsNameInput = document.getElementById('server-settings-name-input');
  const settingsPreviewImg = document.getElementById('server-settings-preview-img');
  const settingsIconTrigger = document.getElementById('server-settings-icon-trigger');
  const btnChangeServerIcon = document.getElementById('btn-change-server-icon');
  const settingsIconInput = document.getElementById('server-settings-icon-input');
  const btnSaveOverview = document.getElementById('btn-save-server-overview');
  const settingsFeedback = document.getElementById('server-settings-feedback');

  let updatedServerIconUrl = null;

  function switchSettingsTab(tab) {
    [tabBtnOverview, tabBtnRoles, tabBtnMembers].forEach(b => {
      if (b) {
        b.style.background = 'transparent';
        b.style.color = '#949ba4';
      }
    });
    [tabContentOverview, tabContentRoles, tabContentMembers].forEach(c => {
      if (c) c.style.display = 'none';
    });

    if (tab === 'overview') {
      if (tabBtnOverview) {
        tabBtnOverview.style.background = '#35373c';
        tabBtnOverview.style.color = '#fff';
      }
      if (tabContentOverview) tabContentOverview.style.display = 'flex';
    } else if (tab === 'roles') {
      if (tabBtnRoles) {
        tabBtnRoles.style.background = '#35373c';
        tabBtnRoles.style.color = '#fff';
      }
      if (tabContentRoles) tabContentRoles.style.display = 'flex';
      loadGuildRoles();
    } else if (tab === 'members') {
      if (tabBtnMembers) {
        tabBtnMembers.style.background = '#35373c';
        tabBtnMembers.style.color = '#fff';
      }
      if (tabContentMembers) tabContentMembers.style.display = 'flex';
      loadGuildMembers();
    }
  }

  if (tabBtnOverview) tabBtnOverview.addEventListener('click', () => switchSettingsTab('overview'));
  if (tabBtnRoles) tabBtnRoles.addEventListener('click', () => switchSettingsTab('roles'));
  if (tabBtnMembers) tabBtnMembers.addEventListener('click', () => switchSettingsTab('members'));

  if (btnMenuServerSettings) {
    btnMenuServerSettings.addEventListener('click', () => {
      if (serverDropdownMenu) serverDropdownMenu.style.display = 'none';
      const curGuild = cachedGuilds.find(g => g.id === activeGuildId) || { name: 'FakeDC', iconUrl: '/assets/logo.png' };

      const titleEl = document.getElementById('server-settings-title');
      if (titleEl) titleEl.textContent = `Configurações: ${curGuild.name}`;

      if (settingsNameInput) settingsNameInput.value = curGuild.name || '';
      if (settingsPreviewImg) settingsPreviewImg.src = curGuild.iconUrl || '/assets/logo.png';
      updatedServerIconUrl = curGuild.iconUrl || null;

      if (settingsFeedback) settingsFeedback.style.display = 'none';

      switchSettingsTab('overview');
      if (serverSettingsModal) serverSettingsModal.style.display = 'flex';
    });
  }

  if (btnCloseServerSettings && serverSettingsModal) {
    btnCloseServerSettings.addEventListener('click', () => {
      serverSettingsModal.style.display = 'none';
    });
  }

  // Upload de ícone nas configurações
  const triggerIconUpload = () => {
    if (settingsIconInput) settingsIconInput.click();
  };
  if (settingsIconTrigger) settingsIconTrigger.addEventListener('click', triggerIconUpload);
  if (btnChangeServerIcon) btnChangeServerIcon.addEventListener('click', triggerIconUpload);

  if (settingsIconInput) {
    settingsIconInput.addEventListener('change', async (e) => {
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
          updatedServerIconUrl = data.url;
          if (settingsPreviewImg) settingsPreviewImg.src = data.url;
        } else {
          alert(data.error || 'Erro no upload da imagem.');
        }
      } catch (err) {
        alert('Falha ao enviar imagem do servidor.');
      }
    });
  }

  // Salvar Visão Geral
  if (btnSaveOverview) {
    btnSaveOverview.addEventListener('click', () => {
      const newName = settingsNameInput ? settingsNameInput.value.trim() : '';
      if (!newName) return;

      if (!activeSocket) return;

      btnSaveOverview.disabled = true;
      btnSaveOverview.textContent = 'Salvando...';

      activeSocket.emit('guild:update', {
        guildId: activeGuildId,
        name: newName,
        iconUrl: updatedServerIconUrl
      }, (res) => {
        btnSaveOverview.disabled = false;
        btnSaveOverview.textContent = 'Salvar Alterações';

        if (res && res.success) {
          if (settingsFeedback) {
            settingsFeedback.style.display = 'inline';
            setTimeout(() => {
              if (settingsFeedback) settingsFeedback.style.display = 'none';
            }, 3000);
          }
        } else {
          alert((res && res.message) || 'Erro ao salvar alterações.');
        }
      });
    });
  }

  // Gerenciamento de Cargos (Roles)
  const btnCreateRoleTrigger = document.getElementById('btn-create-role-trigger');
  const newRolePanel = document.getElementById('new-role-form-panel');
  const btnCancelNewRole = document.getElementById('btn-cancel-new-role');
  const btnSubmitNewRole = document.getElementById('btn-submit-new-role');
  const newRoleNameInput = document.getElementById('new-role-name-input');
  const newRoleColorInput = document.getElementById('new-role-color-input');
  const rolesListContainer = document.getElementById('roles-list-container');

  if (btnCreateRoleTrigger && newRolePanel) {
    btnCreateRoleTrigger.addEventListener('click', () => {
      newRolePanel.style.display = 'block';
      if (newRoleNameInput) {
        newRoleNameInput.value = '';
        newRoleNameInput.focus();
      }
    });
  }

  if (btnCancelNewRole && newRolePanel) {
    btnCancelNewRole.addEventListener('click', () => {
      newRolePanel.style.display = 'none';
    });
  }

  if (btnSubmitNewRole) {
    btnSubmitNewRole.addEventListener('click', () => {
      const roleName = newRoleNameInput ? newRoleNameInput.value.trim() : '';
      const roleColor = newRoleColorInput ? newRoleColorInput.value : '#5865F2';
      if (!roleName) return;

      if (!activeSocket) return;

      activeSocket.emit('guild:role:create', {
        guildId: activeGuildId,
        name: roleName,
        color: roleColor
      }, (res) => {
        if (res && res.success) {
          if (newRolePanel) newRolePanel.style.display = 'none';
          loadGuildRoles();
        } else {
          alert((res && res.message) || 'Erro ao criar cargo.');
        }
      });
    });
  }

  function loadGuildRoles() {
    if (!activeSocket || !rolesListContainer) return;
    activeSocket.emit('guild:roles:list', { guildId: activeGuildId }, (res) => {
      if (!res || !res.success) return;
      renderRolesList(res.roles || []);
    });
  }

  function renderRolesList(roles = []) {
    if (!rolesListContainer) return;
    rolesListContainer.innerHTML = '';

    if (roles.length === 0) {
      rolesListContainer.innerHTML = `
        <div style="color: #949ba4; font-size: 13px; text-align: center; padding: 18px;">
          Nenhum cargo criado ainda. Clique em "+ Criar Cargo" acima.
        </div>
      `;
      return;
    }

    roles.forEach(role => {
      const row = document.createElement('div');
      row.className = 'role-row-item';
      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="role-color-dot" style="background-color: ${role.color};"></span>
          <span style="color: #f2f3f5; font-weight: 600; font-size: 14px;">${escapeHtml(role.name)}</span>
        </div>
        <button type="button" class="btn-subtle" style="color: #ed4245; background: transparent; border: none; cursor: pointer; padding: 4px 8px; font-size: 12px; font-weight: 600;" title="Excluir Cargo">
          Excluir
        </button>
      `;

      const btnDel = row.querySelector('button');
      if (btnDel) {
        btnDel.addEventListener('click', () => {
          if (confirm(`Tem certeza que deseja excluir o cargo "${role.name}"?`)) {
            activeSocket.emit('guild:role:delete', { guildId: activeGuildId, roleId: role.id }, (delRes) => {
              if (delRes && delRes.success) {
                loadGuildRoles();
              }
            });
          }
        });
      }

      rolesListContainer.appendChild(row);
    });
  }

  // Gerenciamento de Membros
  const membersListContainer = document.getElementById('guild-members-settings-list');

  function loadGuildMembers() {
    if (!activeSocket || !membersListContainer) return;
    activeSocket.emit('guild:members:list', { guildId: activeGuildId }, (res) => {
      if (!res || !res.success) return;
      activeSocket.emit('guild:roles:list', { guildId: activeGuildId }, (rolesRes) => {
        const availableRoles = (rolesRes && rolesRes.roles) || [];
        renderMembersSettingsList(res.members || [], availableRoles);
      });
    });
  }

  function renderMembersSettingsList(members = [], availableRoles = []) {
    if (!membersListContainer) return;
    membersListContainer.innerHTML = '';

    if (members.length === 0) {
      membersListContainer.innerHTML = `
        <div style="color: #949ba4; font-size: 13px; text-align: center; padding: 18px;">
          Nenhum membro encontrado.
        </div>
      `;
      return;
    }

    members.forEach(member => {
      const card = document.createElement('div');
      card.className = 'member-settings-card';

      const avatarUrl = member.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(member.username)}`;

      let rolesBadgesHtml = '';
      (member.roles || []).forEach(r => {
        rolesBadgesHtml += `
          <span class="role-badge" style="color: ${r.color}; border-color: ${r.color};">
            ${escapeHtml(r.name)}
            <span class="role-badge-remove" data-role-id="${r.id}" title="Remover cargo">&times;</span>
          </span>
        `;
      });

      card.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${avatarUrl}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
          <div>
            <div style="color: #f2f3f5; font-weight: 600; font-size: 14px;">${escapeHtml(member.username)}</div>
            <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;">
              ${rolesBadgesHtml || '<span style="color: #949ba4; font-size: 11px;">Sem cargos</span>'}
            </div>
          </div>
        </div>
        <div>
          <select class="member-role-select" style="background: #1e1f22; color: #dbdee1; border: 1px solid #383a40; border-radius: 4px; padding: 4px 8px; font-size: 12px; outline: none; cursor: pointer;">
            <option value="">+ Atribuir Cargo</option>
            ${availableRoles.map(ar => `<option value="${ar.id}">${escapeHtml(ar.name)}</option>`).join('')}
          </select>
        </div>
      `;

      // Evento de remover cargo
      card.querySelectorAll('.role-badge-remove').forEach(rmBtn => {
        rmBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const rId = rmBtn.dataset.roleId;
          activeSocket.emit('guild:member:role:remove', { guildId: activeGuildId, username: member.username, roleId: rId }, () => {
            loadGuildMembers();
          });
        });
      });

      // Evento de atribuir cargo
      const selectRole = card.querySelector('.member-role-select');
      if (selectRole) {
        selectRole.addEventListener('change', (e) => {
          const selectedRoleId = e.target.value;
          if (!selectedRoleId) return;
          activeSocket.emit('guild:member:role:assign', { guildId: activeGuildId, username: member.username, roleId: selectedRoleId }, () => {
            loadGuildMembers();
          });
        });
      }

      membersListContainer.appendChild(card);
    });
  }

  // Socket listener de atualização de servidores
  if (activeSocket) {
    activeSocket.on('guild:updated-list', (guilds) => {
      renderGuildsList(guilds);
    });

    activeSocket.on('guild:updated', (updated) => {
      const idx = cachedGuilds.findIndex(g => g.id === updated.id);
      if (idx >= 0) {
        cachedGuilds[idx] = { ...cachedGuilds[idx], ...updated };
      }
      renderGuildsList(cachedGuilds);
      if (updated.id === activeGuildId) {
        const headerName = document.getElementById('server-header-name');
        const headerIcon = document.getElementById('server-header-icon');
        if (headerName) headerName.textContent = updated.name;
        if (headerIcon && updated.iconUrl) headerIcon.src = updated.iconUrl;
      }
    });

    activeSocket.on('guild:roles:updated', ({ guildId }) => {
      if (guildId === activeGuildId) {
        loadGuildRoles();
      }
    });

    activeSocket.on('guild:members:roles-changed', ({ guildId }) => {
      if (guildId === activeGuildId) {
        loadGuildMembers();
      }
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

window.getActiveGuildId = getActiveGuildId;
