// ==========================================================================
// FAKEDC - GERENCIAMENTO DE SERVIDORES / GUILDS (ESTILO DISCORD)
// ==========================================================================

import { escapeHtml } from './utils.js';

let activeSocket = null;
let activeGuildId = 'gamezeda';
let cachedGuilds = [];
let currentGuildPermissions = { isOwner: false, isAdmin: false, isMod: false, roles: [] };
let onGuildSelectedCallback = null;
let onHomeSelectedCallback = null;

export function getCurrentGuildPermissions() {
  return currentGuildPermissions;
}

export function updateGuildHeaderPermissionsUI() {
  const btnMenuServerSettings = document.getElementById('btn-menu-server-settings');
  const btnMenuCreateChannel = document.getElementById('btn-menu-create-channel');
  const btnMenuCreateCategory = document.getElementById('btn-menu-create-category');
  const btnMenuDeleteServer = document.getElementById('btn-menu-delete-server');
  const serverMenuDeleteSeparator = document.getElementById('server-menu-delete-separator');
  const serverDangerZone = document.getElementById('server-danger-zone');

  const canAdmin = !!(currentGuildPermissions && (currentGuildPermissions.isAdmin || currentGuildPermissions.isOwner));
  const canMod = !!(currentGuildPermissions && (currentGuildPermissions.isMod || canAdmin));
  const isCustomGuild = activeGuildId && activeGuildId !== 'gamezeda';
  const isOwner = !!(currentGuildPermissions && currentGuildPermissions.isOwner && isCustomGuild);

  if (btnMenuServerSettings) {
    btnMenuServerSettings.style.display = canAdmin ? 'flex' : 'none';
  }
  if (btnMenuCreateChannel) {
    btnMenuCreateChannel.style.display = canMod ? 'flex' : 'none';
  }
  if (btnMenuCreateCategory) {
    btnMenuCreateCategory.style.display = canMod ? 'flex' : 'none';
  }
  if (btnMenuDeleteServer) {
    btnMenuDeleteServer.style.display = isOwner ? 'flex' : 'none';
  }
  if (serverMenuDeleteSeparator) {
    serverMenuDeleteSeparator.style.display = isOwner ? 'block' : 'none';
  }
  if (serverDangerZone) {
    serverDangerZone.style.display = isOwner ? 'flex' : 'none';
  }
}

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
      if (serverDropdownMenu) serverDropdownMenu.style.display = 'none';
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
      if (!isVisible) {
        updateDeleteServerVisibility();
        if (window.lucide) {
          window.lucide.createIcons();
        }
      }
    });

    window.addEventListener('click', (e) => {
      if (serverDropdownMenu && serverDropdownMenu.style.display === 'flex') {
        if (!serverDropdownMenu.contains(e.target) && !serverHeaderBtn.contains(e.target)) {
          serverDropdownMenu.style.display = 'none';
        }
      }
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

  // Excluir Servidor (apenas para servidores criados, não para o FakeDC principal)
  const btnMenuDeleteServer = document.getElementById('btn-menu-delete-server');
  const serverMenuDeleteSeparator = document.getElementById('server-menu-delete-separator');
  const btnDeleteServerTrigger = document.getElementById('btn-delete-server-trigger');
  const serverDangerZone = document.getElementById('server-danger-zone');

  function updateDeleteServerVisibility() {
    updateGuildHeaderPermissionsUI();
  }

  const handleDeleteServerClick = () => {
    if (serverDropdownMenu) serverDropdownMenu.style.display = 'none';
    if (!activeGuildId || activeGuildId === 'gamezeda') return;
    const currentGuild = cachedGuilds.find(g => g.id === activeGuildId) || { name: 'Servidor' };
    if (typeof window.openDeleteModal === 'function') {
      window.openDeleteModal('guild', activeGuildId, currentGuild.name);
    }
  };

  if (btnMenuDeleteServer) btnMenuDeleteServer.addEventListener('click', handleDeleteServerClick);
  if (btnDeleteServerTrigger) btnDeleteServerTrigger.addEventListener('click', handleDeleteServerClick);

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

  const tabBtnBans = document.getElementById('tab-btn-server-bans');
  const tabContentBans = document.getElementById('tab-content-server-bans');
  const btnRefreshServerBans = document.getElementById('btn-refresh-server-bans');

  function switchSettingsTab(tab) {
    const tabBtnOverview = document.getElementById('tab-btn-server-overview');
    const tabBtnRoles = document.getElementById('tab-btn-server-roles');
    const tabBtnMembers = document.getElementById('tab-btn-server-members');
    const tabBtnBans = document.getElementById('tab-btn-server-bans');

    const tabContentOverview = document.getElementById('tab-content-server-overview');
    const tabContentRoles = document.getElementById('tab-content-server-roles');
    const tabContentMembers = document.getElementById('tab-content-server-members');
    const tabContentBans = document.getElementById('tab-content-server-bans');

    [tabBtnOverview, tabBtnRoles, tabBtnMembers, tabBtnBans].forEach(b => {
      if (b) {
        b.style.background = 'transparent';
        b.style.color = '#949ba4';
      }
    });
    [tabContentOverview, tabContentRoles, tabContentMembers, tabContentBans].forEach(c => {
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
      setTimeout(() => {
        const inp = document.getElementById('new-role-name-input');
        if (inp) inp.focus();
      }, 50);
    } else if (tab === 'members') {
      if (tabBtnMembers) {
        tabBtnMembers.style.background = '#35373c';
        tabBtnMembers.style.color = '#fff';
      }
      if (tabContentMembers) tabContentMembers.style.display = 'flex';
      loadGuildMembers();
    } else if (tab === 'bans') {
      if (tabBtnBans) {
        tabBtnBans.style.background = '#35373c';
        tabBtnBans.style.color = '#fff';
      }
      if (tabContentBans) tabContentBans.style.display = 'flex';
      loadGuildBans();
    }
  }

  if (tabBtnOverview) tabBtnOverview.addEventListener('click', () => switchSettingsTab('overview'));
  if (tabBtnRoles) tabBtnRoles.addEventListener('click', () => switchSettingsTab('roles'));
  if (tabBtnMembers) tabBtnMembers.addEventListener('click', () => switchSettingsTab('members'));
  if (tabBtnBans) tabBtnBans.addEventListener('click', () => switchSettingsTab('bans'));
  if (btnRefreshServerBans) btnRefreshServerBans.addEventListener('click', () => loadGuildBans());

  function openServerSettingsModal(e) {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    const serverDropdownMenu = document.getElementById('server-dropdown-menu');
    if (serverDropdownMenu) serverDropdownMenu.style.display = 'none';

    if (!currentGuildPermissions.isAdmin && !currentGuildPermissions.isOwner) {
      alert('Você não tem permissão para acessar as configurações deste servidor.');
      return;
    }

    const curGuild = cachedGuilds.find(g => g && String(g.id) === String(activeGuildId)) || { name: 'FakeDC', iconUrl: '/assets/logo.png' };

    const titleEl = document.getElementById('server-settings-title');
    if (titleEl) titleEl.textContent = `Configurações: ${curGuild.name || 'Servidor'}`;

    const settingsNameInput = document.getElementById('server-settings-name-input');
    if (settingsNameInput) settingsNameInput.value = curGuild.name || '';

    const settingsPreviewImg = document.getElementById('server-settings-preview-img');
    if (settingsPreviewImg) settingsPreviewImg.src = curGuild.iconUrl || '/assets/logo.png';
    updatedServerIconUrl = curGuild.iconUrl || null;

    const settingsFeedback = document.getElementById('server-settings-feedback');
    if (settingsFeedback) settingsFeedback.style.display = 'none';

    switchSettingsTab('overview');
    updateDeleteServerVisibility();

    const serverSettingsModal = document.getElementById('server-settings-modal');
    if (serverSettingsModal) {
      serverSettingsModal.style.display = 'flex';
      if (window.lucide) window.lucide.createIcons();
    }
  }
  window.openServerSettingsModal = openServerSettingsModal;

  if (btnMenuServerSettings) {
    btnMenuServerSettings.addEventListener('click', (e) => {
      openServerSettingsModal(e);
    });
  }

  if (btnCloseServerSettings) {
    btnCloseServerSettings.addEventListener('click', () => {
      const serverSettingsModal = document.getElementById('server-settings-modal');
      if (serverSettingsModal) serverSettingsModal.style.display = 'none';
    });
  }

  if (serverSettingsModal) {
    serverSettingsModal.addEventListener('click', (e) => {
      if (e.target === serverSettingsModal) {
        serverSettingsModal.style.display = 'none';
      }
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
  const editingRoleIdInput = document.getElementById('editing-role-id');
  const roleFormTitle = document.getElementById('role-form-title');
  const rolePermAdmin = document.getElementById('role-perm-admin');
  const rolePermMod = document.getElementById('role-perm-mod');
  const rolesListContainer = document.getElementById('roles-list-container');

  function resetRoleForm() {
    if (editingRoleIdInput) editingRoleIdInput.value = '';
    if (roleFormTitle) roleFormTitle.textContent = 'CRIAR NOVO CARGO';
    if (newRoleNameInput) newRoleNameInput.value = '';
    if (newRoleColorInput) newRoleColorInput.value = '#5865F2';
    if (rolePermAdmin) rolePermAdmin.checked = false;
    if (rolePermMod) rolePermMod.checked = false;
    if (btnSubmitNewRole) btnSubmitNewRole.textContent = 'Salvar Cargo';
  }

  if (btnCreateRoleTrigger && newRolePanel) {
    btnCreateRoleTrigger.addEventListener('click', () => {
      newRolePanel.style.display = 'block';
      resetRoleForm();
      if (newRoleNameInput) newRoleNameInput.focus();
    });
  }

  if (btnCancelNewRole) {
    btnCancelNewRole.addEventListener('click', () => {
      resetRoleForm();
    });
  }

  if (newRoleNameInput) {
    newRoleNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (btnSubmitNewRole) btnSubmitNewRole.click();
      }
    });
  }

  if (btnSubmitNewRole) {
    btnSubmitNewRole.addEventListener('click', () => {
      const roleName = newRoleNameInput ? newRoleNameInput.value.trim() : '';
      const roleColor = newRoleColorInput ? newRoleColorInput.value : '#5865F2';
      const editingId = editingRoleIdInput ? editingRoleIdInput.value : '';
      if (!roleName) {
        if (newRoleNameInput) newRoleNameInput.focus();
        return;
      }

      const permissions = [];
      if (rolePermAdmin && rolePermAdmin.checked) permissions.push('admin');
      if (rolePermMod && rolePermMod.checked) permissions.push('mod');

      if (!activeSocket) return;

      btnSubmitNewRole.disabled = true;
      btnSubmitNewRole.textContent = 'Salvando...';

      if (editingId) {
        activeSocket.emit('guild:role:update', {
          guildId: activeGuildId,
          roleId: editingId,
          name: roleName,
          color: roleColor,
          permissions
        }, (res) => {
          btnSubmitNewRole.disabled = false;
          btnSubmitNewRole.textContent = 'Salvar Cargo';

          if (res && res.success) {
            resetRoleForm();
            loadGuildRoles();
            loadGuildMembers();
          } else {
            alert((res && res.message) || 'Erro ao editar cargo.');
          }
        });
      } else {
        activeSocket.emit('guild:role:create', {
          guildId: activeGuildId,
          name: roleName,
          color: roleColor,
          permissions
        }, (res) => {
          btnSubmitNewRole.disabled = false;
          btnSubmitNewRole.textContent = 'Salvar Cargo';

          if (res && res.success) {
            resetRoleForm();
            loadGuildRoles();
            loadGuildMembers();
          } else {
            alert((res && res.message) || 'Erro ao criar cargo.');
          }
        });
      }
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
          Nenhum cargo criado ainda. Preencha os campos acima para criar um cargo.
        </div>
      `;
      return;
    }

    const sortedRoles = [...roles].sort((a, b) => (a.position || 0) - (b.position || 0));

    sortedRoles.forEach((role, idx) => {
      const row = document.createElement('div');
      row.className = 'role-row-item';
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.justifyContent = 'space-between';
      row.style.padding = '8px 12px';
      row.style.background = '#2b2d31';
      row.style.borderRadius = '4px';
      row.style.border = '1px solid #383a40';

      const permsBadges = [];
      const p = role.permissions || [];
      if (p.includes('admin') || p === 'admin') {
        permsBadges.push(`<span style="background: rgba(237, 66, 69, 0.2); color: #ed4245; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">ADMIN</span>`);
      }
      if (p.includes('mod') || p === 'mod') {
        permsBadges.push(`<span style="background: rgba(88, 101, 242, 0.2); color: #5865F2; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">MOD</span>`);
      }

      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <button type="button" class="btn-subtle btn-role-up" title="Mover para cima" style="background: transparent; border: none; color: #949ba4; cursor: pointer; padding: 0 4px; line-height: 1; font-size: 10px;" ${idx === 0 ? 'disabled style="opacity: 0.3; cursor: default;"' : ''}>▲</button>
            <button type="button" class="btn-subtle btn-role-down" title="Mover para baixo" style="background: transparent; border: none; color: #949ba4; cursor: pointer; padding: 0 4px; line-height: 1; font-size: 10px;" ${idx === sortedRoles.length - 1 ? 'disabled style="opacity: 0.3; cursor: default;"' : ''}>▼</button>
          </div>
          <span class="role-color-dot" style="width: 12px; height: 12px; border-radius: 50%; background-color: ${role.color}; flex-shrink: 0;"></span>
          <span style="color: #f2f3f5; font-weight: 600; font-size: 14px;">${escapeHtml(role.name)}</span>
          <div style="display: flex; gap: 4px; margin-left: 6px;">
            ${permsBadges.join('')}
          </div>
        </div>
        <div style="display: flex; gap: 6px;">
          <button type="button" class="btn-subtle btn-role-edit" style="color: #5865F2; background: transparent; border: none; cursor: pointer; padding: 4px 8px; font-size: 12px; font-weight: 600;" title="Editar Cargo">
            Editar
          </button>
          <button type="button" class="btn-subtle btn-role-delete" style="color: #ed4245; background: transparent; border: none; cursor: pointer; padding: 4px 8px; font-size: 12px; font-weight: 600;" title="Excluir Cargo">
            Excluir
          </button>
        </div>
      `;

      // Evento de Editar
      const btnEdit = row.querySelector('.btn-role-edit');
      if (btnEdit) {
        btnEdit.addEventListener('click', () => {
          if (editingRoleIdInput) editingRoleIdInput.value = role.id;
          if (roleFormTitle) roleFormTitle.textContent = `EDITAR CARGO: ${role.name}`;
          if (newRoleNameInput) newRoleNameInput.value = role.name;
          if (newRoleColorInput) newRoleColorInput.value = role.color || '#5865F2';
          if (rolePermAdmin) rolePermAdmin.checked = !!(p.includes('admin') || p === 'admin');
          if (rolePermMod) rolePermMod.checked = !!(p.includes('mod') || p === 'mod');
          if (btnSubmitNewRole) btnSubmitNewRole.textContent = 'Salvar Alterações';
          if (newRolePanel) newRolePanel.style.display = 'block';
          if (newRoleNameInput) newRoleNameInput.focus();
        });
      }

      // Evento de Mover para Cima
      const btnUp = row.querySelector('.btn-role-up');
      if (btnUp && idx > 0) {
        btnUp.addEventListener('click', () => {
          const newOrder = [...sortedRoles];
          const temp = newOrder[idx - 1];
          newOrder[idx - 1] = newOrder[idx];
          newOrder[idx] = temp;
          activeSocket.emit('guild:role:reorder', {
            guildId: activeGuildId,
            orderedRoleIds: newOrder.map(r => r.id)
          }, () => {
            loadGuildRoles();
          });
        });
      }

      // Evento de Mover para Baixo
      const btnDown = row.querySelector('.btn-role-down');
      if (btnDown && idx < sortedRoles.length - 1) {
        btnDown.addEventListener('click', () => {
          const newOrder = [...sortedRoles];
          const temp = newOrder[idx + 1];
          newOrder[idx + 1] = newOrder[idx];
          newOrder[idx] = temp;
          activeSocket.emit('guild:role:reorder', {
            guildId: activeGuildId,
            orderedRoleIds: newOrder.map(r => r.id)
          }, () => {
            loadGuildRoles();
          });
        });
      }

      // Evento de Excluir
      const btnDel = row.querySelector('.btn-role-delete');
      if (btnDel) {
        btnDel.addEventListener('click', () => {
          if (confirm(`Tem certeza que deseja excluir o cargo "${role.name}"?`)) {
            activeSocket.emit('guild:role:delete', { guildId: activeGuildId, roleId: role.id }, (delRes) => {
              if (delRes && delRes.success) {
                if (editingRoleIdInput && editingRoleIdInput.value === role.id) {
                  resetRoleForm();
                }
                loadGuildRoles();
              } else {
                alert((delRes && delRes.message) || 'Erro ao excluir cargo.');
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

    const canAdmin = !!(currentGuildPermissions && (currentGuildPermissions.isAdmin || currentGuildPermissions.isOwner));
    const canMod = !!(currentGuildPermissions && (currentGuildPermissions.isMod || canAdmin));
    const isCustomGuild = activeGuildId && activeGuildId !== 'gamezeda';

    members.forEach(member => {
      const card = document.createElement('div');
      card.className = 'member-settings-card';
      card.style.display = 'flex';
      card.style.alignItems = 'center';
      card.style.justifyContent = 'space-between';
      card.style.padding = '10px 14px';
      card.style.background = '#2b2d31';
      card.style.borderRadius = '6px';
      card.style.border = '1px solid #383a40';

      const avatarUrl = member.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(member.username)}`;
      const isOwnerMember = member.baseRole === 'owner';
      const currentUserData = (typeof window.getCurrentUser === 'function') ? window.getCurrentUser() : null;
      const isSelf = member.username && currentUserData && member.username.toLowerCase() === currentUserData.name.toLowerCase();

      let rolesBadgesHtml = '';
      (member.roles || []).forEach(r => {
        rolesBadgesHtml += `
          <span class="role-badge" style="color: ${r.color}; border: 1px solid ${r.color}; padding: 2px 6px; border-radius: 4px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">
            ${escapeHtml(r.name)}
            ${canAdmin ? `<span class="role-badge-remove" data-role-id="${r.id}" style="cursor: pointer; font-weight: bold; margin-left: 2px;" title="Remover cargo">&times;</span>` : ''}
          </span>
        `;
      });

      const unassignedRoles = availableRoles.filter(ar => !(member.roles || []).some(mr => mr.id === ar.id));
      const roleSelectHtml = (canAdmin && unassignedRoles.length > 0)
        ? `<select class="member-role-select" style="background: #1e1f22; color: #dbdee1; border: 1px solid #383a40; border-radius: 4px; padding: 4px 8px; font-size: 12px; outline: none; cursor: pointer;">
            <option value="">+ Atribuir Cargo</option>
            ${unassignedRoles.map(ar => `<option value="${ar.id}">${escapeHtml(ar.name)}</option>`).join('')}
          </select>`
        : '';

      let moderationButtonsHtml = '';
      if (canMod && isCustomGuild && !isOwnerMember && !isSelf) {
        moderationButtonsHtml = `
          <div style="display: flex; gap: 6px; margin-left: 8px;">
            <button type="button" class="btn-subtle btn-member-kick" style="color: #f23f43; background: transparent; border: 1px solid rgba(242, 63, 67, 0.3); border-radius: 4px; cursor: pointer; padding: 3px 8px; font-size: 11px; font-weight: 600;" title="Expulsar do Servidor">
              Expulsar
            </button>
            <button type="button" class="btn-subtle btn-member-ban" style="color: #fff; background: #ed4245; border: none; border-radius: 4px; cursor: pointer; padding: 3px 8px; font-size: 11px; font-weight: 600;" title="Banir do Servidor">
              Banir
            </button>
          </div>
        `;
      }

      card.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${avatarUrl}" style="width: 34px; height: 34px; border-radius: 50%; object-fit: cover;">
          <div>
            <div style="color: #f2f3f5; font-weight: 600; font-size: 14px;">
              ${escapeHtml(member.username)}
              ${isOwnerMember ? '<span style="color: #f0b232; font-size: 11px; font-weight: 700; margin-left: 4px;">👑 Dono</span>' : ''}
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;">
              ${rolesBadgesHtml || '<span style="color: #949ba4; font-size: 11px;">Sem cargos</span>'}
            </div>
          </div>
        </div>
        <div style="display: flex; align-items: center;">
          ${roleSelectHtml}
          ${moderationButtonsHtml}
        </div>
      `;

      // Evento de remover cargo
      if (canAdmin) {
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
      }

      // Evento de expulsar
      const btnKick = card.querySelector('.btn-member-kick');
      if (btnKick) {
        btnKick.addEventListener('click', () => {
          if (confirm(`Tem certeza que deseja expulsar @${member.username} deste servidor?`)) {
            activeSocket.emit('guild:member:kick', { guildId: activeGuildId, username: member.username }, (res) => {
              if (res && res.success) {
                loadGuildMembers();
              } else {
                alert((res && res.message) || 'Erro ao expulsar membro.');
              }
            });
          }
        });
      }

      // Evento de banir
      const btnBan = card.querySelector('.btn-member-ban');
      if (btnBan) {
        btnBan.addEventListener('click', () => {
          const reason = prompt(`Motivo do banimento de @${member.username}:`, 'Violação das regras do servidor');
          if (reason !== null) {
            activeSocket.emit('guild:member:ban', { guildId: activeGuildId, username: member.username, reason }, (res) => {
              if (res && res.success) {
                loadGuildMembers();
              } else {
                alert((res && res.message) || 'Erro ao banir membro.');
              }
            });
          }
        });
      }

      membersListContainer.appendChild(card);
    });
  }

  function loadGuildBans() {
    const tableWrapper = document.getElementById('guild-bans-settings-table-wrapper');
    if (!tableWrapper || !activeSocket) return;

    tableWrapper.innerHTML = `
      <div style="padding: 24px; text-align: center; color: #949ba4; font-size: 13px;">
        <i data-lucide="loader" style="width: 20px; height: 20px; animation: spin 1s linear infinite;"></i>
        <div style="margin-top: 8px;">Carregando usuários expulsos...</div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();

    activeSocket.emit('guild:bans:list', { guildId: activeGuildId }, (res) => {
      if (!res || !res.success) {
        tableWrapper.innerHTML = `
          <div style="padding: 20px; background: rgba(242, 63, 67, 0.1); border: 1px solid rgba(242, 63, 67, 0.3); border-radius: 6px; color: #f23f43; font-size: 13px;">
            ${(res && res.message) || 'Erro ao carregar lista de usuários expulsos.'}
          </div>
        `;
        return;
      }

      const bans = res.bans || [];
      if (bans.length === 0) {
        tableWrapper.innerHTML = `
          <div style="padding: 40px 20px; text-align: center; color: #949ba4; background: #2b2d31; border-radius: 8px; border: 1px dashed #383a40;">
            <i data-lucide="shield-check" style="width: 36px; height: 36px; color: #23a55a; margin-bottom: 10px;"></i>
            <div style="color: #f2f3f5; font-weight: 700; font-size: 14px;">Nenhum usuário expulso</div>
            <div style="font-size: 12px; margin-top: 4px;">Este servidor não possui nenhum usuário na lista de expulsões ou banimentos.</div>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      let html = `
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; background: #2b2d31; border-radius: 6px; overflow: hidden; border: 1px solid #383a40;">
          <thead>
            <tr style="background: #1e1f22; border-bottom: 1px solid #383a40; color: #b5bac1; font-size: 11px; text-transform: uppercase; font-weight: 700;">
              <th style="padding: 10px 14px;">Usuário</th>
              <th style="padding: 10px 14px;">Expulso Por</th>
              <th style="padding: 10px 14px;">Motivo</th>
              <th style="padding: 10px 14px;">Data</th>
              <th style="padding: 10px 14px; text-align: right;">Ações</th>
            </tr>
          </thead>
          <tbody>
      `;

      bans.forEach(ban => {
        const avatarUrl = ban.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(ban.username)}`;
        let dateStr = 'Recentemente';
        if (ban.createdAt) {
          try {
            const d = new Date(ban.createdAt);
            dateStr = d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          } catch (e) {}
        }

        html += `
          <tr style="border-bottom: 1px solid #313338; transition: background 0.15s;" onmouseover="this.style.background='#35373c'" onmouseout="this.style.background='transparent'">
            <td style="padding: 10px 14px; display: flex; align-items: center; gap: 10px;">
              <img src="${avatarUrl}" alt="${escapeHtml(ban.username)}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0; background: #1e1f22;">
              <span style="color: #f2f3f5; font-weight: 600;">@${escapeHtml(ban.username)}</span>
            </td>
            <td style="padding: 10px 14px; color: #dbdee1;">
              @${escapeHtml(ban.bannedBy || 'Sistema')}
            </td>
            <td style="padding: 10px 14px; color: #949ba4; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(ban.reason || 'Sem motivo')}">
              ${escapeHtml(ban.reason || 'Expulso pelo moderador')}
            </td>
            <td style="padding: 10px 14px; color: #949ba4; font-size: 12px; white-space: nowrap;">
              ${dateStr}
            </td>
            <td style="padding: 10px 14px; text-align: right; white-space: nowrap;">
              <button type="button" class="btn-subtle btn-revoke-ban" data-username="${escapeHtml(ban.username)}" style="background: rgba(35, 165, 90, 0.15); color: #23a55a; border: 1px solid rgba(35, 165, 90, 0.3); padding: 5px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s;">
                Revogar Expulsão
              </button>
            </td>
          </tr>
        `;
      });

      html += `
          </tbody>
        </table>
      `;

      tableWrapper.innerHTML = html;

      // Adiciona eventos aos botões de revogar expulsão
      tableWrapper.querySelectorAll('.btn-revoke-ban').forEach(btn => {
        btn.addEventListener('click', () => {
          const uName = btn.dataset.username;
          if (!uName) return;
          if (confirm(`Deseja revogar a expulsão de @${uName}? O usuário poderá voltar a entrar neste servidor.`)) {
            btn.disabled = true;
            btn.textContent = 'Revogando...';
            activeSocket.emit('guild:member:unban', { guildId: activeGuildId, username: uName }, (unbanRes) => {
              if (unbanRes && unbanRes.success) {
                loadGuildBans();
                if (typeof window.showSoundToast === 'function') {
                  window.showSoundToast(`✅ Expulsão revogada para @${uName}.`);
                }
              } else {
                btn.disabled = false;
                btn.textContent = 'Revogar Expulsão';
                alert((unbanRes && unbanRes.message) || 'Erro ao revogar expulsão.');
              }
            });
          }
        });
      });

      if (window.lucide) window.lucide.createIcons();
    });
  }

  // Socket listeners de atualização
  if (activeSocket) {
    activeSocket.on('guild:bans:updated', ({ guildId }) => {
      if (guildId === activeGuildId) {
        const tabContentBans = document.getElementById('tab-content-server-bans');
        if (tabContentBans && tabContentBans.style.display !== 'none') {
          loadGuildBans();
        }
      }
    });
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
        loadGuildMembers();
      }
    });

    activeSocket.on('guild:members:roles-changed', ({ guildId }) => {
      if (guildId === activeGuildId) {
        loadGuildMembers();
      }
    });

    activeSocket.on('guild:permissions:update', ({ guildId, permissions }) => {
      if (guildId === activeGuildId) {
        currentGuildPermissions = permissions;
        updateGuildHeaderPermissionsUI();
        if (typeof window.onGuildPermissionsUpdated === 'function') {
          window.onGuildPermissionsUpdated(permissions);
        }
      }
    });

    activeSocket.on('guild:kicked', ({ guildId }) => {
      if (activeGuildId === guildId) {
        alert('Você foi expulso deste servidor.');
        selectGuild('gamezeda');
      }
    });

    activeSocket.on('guild:banned', ({ guildId, reason }) => {
      if (activeGuildId === guildId) {
        alert(`Você foi banido deste servidor. Motivo: ${reason || 'Não informado'}`);
        selectGuild('gamezeda');
      }
    });

    activeSocket.on('guild:deleted', ({ guildId }) => {
      cachedGuilds = cachedGuilds.filter(g => g.id !== guildId);
      renderGuildsList(cachedGuilds);
      if (activeGuildId === guildId) {
        selectGuild('gamezeda');
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

  updateGuildHeaderPermissionsUI();

  if (!activeSocket) return;

  activeSocket.emit('guild:select', { guildId }, (res) => {
    if (res && res.success) {
      if (res.guild) {
        if (headerName) headerName.textContent = res.guild.name;
        if (headerIcon) headerIcon.src = res.guild.iconUrl || '/assets/logo.png';
      }
      currentGuildPermissions = res.permissions || { isOwner: false, isAdmin: false, isMod: false, roles: [] };
      updateGuildHeaderPermissionsUI();
      if (typeof window.onGuildPermissionsUpdated === 'function') {
        window.onGuildPermissionsUpdated(currentGuildPermissions);
      }
      if (typeof onGuildSelectedCallback === 'function') {
        onGuildSelectedCallback(res);
      }
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
window.selectGuild = selectGuild;
