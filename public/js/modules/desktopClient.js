// ==========================================================================
// FAKEDC - CLIENTE DESKTOP ELECTRON (CONTROLE DE JANELA, TELAS & ATIVIDADE)
// ==========================================================================

import { formatGameDuration } from './utils.js';

export function setupDesktopClient(deps = {}) {
  if (!window.electronAPI || !window.electronAPI.isElectron) {
    return;
  }

  const {
    socket,
    webrtc,
    getInVoice = () => false,
    getAllChannels = () => [],
    getCurrentUser = () => null,
    connectToVoiceChannel = async () => {},
    registerStream = () => {},
    showSoundToast = (msg) => console.log(msg),
    updateMyUserStatus = () => {},
    renderMembersSidebar = () => {},
    renderVoiceStageCards = () => {},
    getMyGameActivity = () => null,
    setMyGameActivity = () => {}
  } = deps;

  document.body.classList.add('is-electron');

  const desktopTitlebar = document.getElementById('desktop-titlebar');
  const btnWinMinimize = document.getElementById('btn-desktop-minimize');
  const btnWinMaximize = document.getElementById('btn-desktop-maximize');
  const btnWinClose = document.getElementById('btn-desktop-close');
  const iconWinMaximize = document.getElementById('desktop-icon-maximize');
  const btnDownloadDesktop = document.getElementById('btn-download-desktop');

  if (btnDownloadDesktop) {
    btnDownloadDesktop.style.display = 'none';
  }

  if (desktopTitlebar) {
    desktopTitlebar.style.display = 'flex';
    const dragArea = desktopTitlebar.querySelector('.desktop-titlebar-drag');
    if (dragArea) {
      dragArea.addEventListener('dblclick', () => {
        window.electronAPI.maximizeWindow();
      });
    }
  }

  function updateMaximizeIcon(isMax) {
    if (!iconWinMaximize) return;
    if (isMax) {
      iconWinMaximize.innerHTML = `
        <rect width="7" height="7" x="3.5" y="1.5" fill="none" stroke="currentColor" stroke-width="1.1"></rect>
        <path d="M1.5 3.5v7h7" fill="none" stroke="currentColor" stroke-width="1.1"></path>
      `;
      if (btnWinMaximize) btnWinMaximize.title = 'Restaurar';
    } else {
      iconWinMaximize.innerHTML = `
        <rect width="9" height="9" x="1.5" y="1.5" fill="none" stroke="currentColor" stroke-width="1.1"></rect>
      `;
      if (btnWinMaximize) btnWinMaximize.title = 'Maximizar';
    }
  }

  if (btnWinMinimize) {
    btnWinMinimize.addEventListener('click', () => {
      window.electronAPI.minimizeWindow();
    });
  }

  if (btnWinMaximize) {
    btnWinMaximize.addEventListener('click', () => {
      window.electronAPI.maximizeWindow();
    });
  }

  if (btnWinClose) {
    btnWinClose.addEventListener('click', () => {
      window.electronAPI.closeWindow();
    });
  }

  if (window.electronAPI.onMaximizedChange) {
    window.electronAPI.onMaximizedChange((isMax) => {
      updateMaximizeIcon(isMax);
    });
  }

  if (window.electronAPI.isMaximized) {
    window.electronAPI.isMaximized().then(isMax => {
      updateMaximizeIcon(isMax);
    }).catch(() => {});
  }

  // ==========================================
  // SELETOR DE TELAS E JANELAS (ELECTRON SCREEN SHARE HD)
  // ==========================================
  let activeSources = [];
  let selectedSourceId = null;
  let activeTab = 'screens'; // 'screens' | 'windows'

  const modalScreenPicker = document.getElementById('modal-screen-picker');
  const gridScreenPicker = document.getElementById('screen-picker-grid');
  const btnCloseScreenPicker = document.getElementById('btn-close-screen-picker');
  const btnCancelScreenPicker = document.getElementById('btn-cancel-screen-picker');
  const btnConfirmScreenPicker = document.getElementById('btn-confirm-screen-picker');
  const tabScreens = document.getElementById('tab-picker-screens');
  const tabWindows = document.getElementById('tab-picker-windows');
  const badgeScreens = document.getElementById('badge-picker-screens');
  const badgeWindows = document.getElementById('badge-picker-windows');
  const btnStageScreen = document.getElementById('btn-stage-screen');
  const btnStageScreenText = document.getElementById('btn-stage-screen-text');

  function renderScreenPickerGrid() {
    if (!gridScreenPicker) return;
    gridScreenPicker.innerHTML = '';

    const filtered = activeSources.filter(s => activeTab === 'screens' ? s.isScreen : !s.isScreen);

    if (filtered.length === 0) {
      gridScreenPicker.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; color: #949ba4; font-size: 13.5px;">
          Nenhuma ${activeTab === 'screens' ? 'tela' : 'janela de aplicativo'} detectada no sistema.
        </div>
      `;
      if (btnConfirmScreenPicker) btnConfirmScreenPicker.disabled = true;
      return;
    }

    filtered.forEach(source => {
      const card = document.createElement('div');
      card.className = `screen-picker-card ${selectedSourceId === source.id ? 'selected' : ''}`;
      card.dataset.id = source.id;

      const thumbDiv = document.createElement('div');
      thumbDiv.className = 'screen-picker-thumb';

      if (source.thumbnail && source.thumbnail.length > 30) {
        const img = document.createElement('img');
        img.src = source.thumbnail;
        img.alt = source.name;
        img.loading = 'lazy';
        thumbDiv.appendChild(img);
      } else {
        const placeholder = document.createElement('div');
        placeholder.style.fontSize = '34px';
        placeholder.style.color = '#949ba4';
        placeholder.textContent = source.isScreen ? '🖥️' : '🪟';
        thumbDiv.appendChild(placeholder);
      }

      const infoDiv = document.createElement('div');
      infoDiv.className = 'screen-picker-info';

      if (source.appIcon) {
        const icon = document.createElement('img');
        icon.className = 'screen-picker-icon';
        icon.src = source.appIcon;
        icon.alt = '';
        infoDiv.appendChild(icon);
      } else {
        const iconSpan = document.createElement('span');
        iconSpan.innerHTML = source.isScreen ? '🖥️' : '🪟';
        iconSpan.style.fontSize = '14px';
        infoDiv.appendChild(iconSpan);
      }

      const titleSpan = document.createElement('span');
      titleSpan.className = 'screen-picker-title';
      titleSpan.textContent = source.name;
      titleSpan.title = source.name;
      infoDiv.appendChild(titleSpan);

      card.appendChild(thumbDiv);
      card.appendChild(infoDiv);

      card.addEventListener('click', () => {
        selectedSourceId = source.id;
        const allCards = gridScreenPicker.querySelectorAll('.screen-picker-card');
        allCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        if (btnConfirmScreenPicker) btnConfirmScreenPicker.disabled = false;
      });

      card.addEventListener('dblclick', () => {
        selectedSourceId = source.id;
        confirmScreenSelection();
      });

      gridScreenPicker.appendChild(card);
    });

    const isCurrentSelectedVisible = filtered.some(s => s.id === selectedSourceId);
    if (!isCurrentSelectedVisible) {
      if (filtered.length > 0) {
        selectedSourceId = filtered[0].id;
        const firstCard = gridScreenPicker.querySelector(`[data-id="${selectedSourceId}"]`);
        if (firstCard) firstCard.classList.add('selected');
        if (btnConfirmScreenPicker) btnConfirmScreenPicker.disabled = false;
      } else {
        selectedSourceId = null;
        if (btnConfirmScreenPicker) btnConfirmScreenPicker.disabled = true;
      }
    } else {
      if (btnConfirmScreenPicker) btnConfirmScreenPicker.disabled = false;
    }
  }

  async function confirmScreenSelection() {
    if (!selectedSourceId) return;
    const sourceIdToShare = selectedSourceId;
    if (modalScreenPicker) modalScreenPicker.style.display = 'none';

    if (window.electronAPI && window.electronAPI.selectScreenSource) {
      window.electronAPI.selectScreenSource(sourceIdToShare);
    }

    if (typeof webrtc !== 'undefined' && typeof webrtc.startScreenShareWithDesktopSource === 'function' && window.electronAPI && typeof window.electronAPI.getScreenSources === 'function') {
      try {
        const inVoice = getInVoice();
        if (!inVoice) {
          const allChannels = getAllChannels();
          const firstVoice = allChannels.find(c => c.type === 'voice') || { id: 'gamezeda', name: 'Gamezeda' };
          await connectToVoiceChannel(firstVoice.id, firstVoice.name);
        }

        const stream = await webrtc.startScreenShareWithDesktopSource(sourceIdToShare);
        if (stream) {
          const currentUser = getCurrentUser();
          registerStream('local', stream, `${currentUser ? currentUser.name : 'Você'} (Sua Tela HD)`, currentUser ? currentUser.avatar : '', true);
          if (btnStageScreen) btnStageScreen.classList.add('active-stream');
          if (btnStageScreenText) btnStageScreenText.textContent = 'Parar Tela';
          const hasAudio = stream.getAudioTracks && stream.getAudioTracks().length > 0;
          if (hasAudio) {
            showSoundToast('🔊 Transmitindo tela com som do sistema!');
          } else {
            showSoundToast('📺 Transmitindo tela em HD (1080p60fps)!');
          }
        }
      } catch (err) {
        console.error('Erro ao compartilhar tela selecionada:', err);
        showSoundToast('❌ Erro ao compartilhar tela: ' + (err.message || 'Erro'));
      }
    }
  }

  function cancelScreenSelection() {
    if (modalScreenPicker) modalScreenPicker.style.display = 'none';
    if (window.electronAPI && window.electronAPI.cancelScreenPicker) {
      window.electronAPI.cancelScreenPicker();
    }
  }

  window.openElectronScreenPickerModal = async function(preloadedSources = null) {
    if (!modalScreenPicker) return;

    modalScreenPicker.style.display = 'flex';
    if (gridScreenPicker) {
      gridScreenPicker.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; color: #949ba4;">
          <div class="spinner" style="display: inline-block; width: 22px; height: 22px; border: 3px solid rgba(255,255,255,0.15); border-top-color: #5865F2; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 8px;"></div>
          <div>Buscando telas e janelas ativas...</div>
        </div>
      `;
    }

    try {
      let sources = preloadedSources;

      if (!sources && window.electronAPI && typeof window.electronAPI.getScreenSources === 'function') {
        try {
          sources = await window.electronAPI.getScreenSources();
        } catch (e) {
          console.warn('[ScreenShare] Erro em getScreenSources:', e);
        }
      }

      if ((!sources || sources.length === 0) && (!window.electronAPI || typeof window.electronAPI.getScreenSources !== 'function')) {
        try {
          navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }).catch(err => {
            console.warn('[ScreenShare] Fallback getDisplayMedia:', err.message);
          });
        } catch (e) {}
        return;
      }

      if (!sources || sources.length === 0) {
        sources = [
          { id: 'screen:0:0', name: 'Tela Inteira (Monitor Principal)', thumbnail: '', isScreen: true }
        ];
      }

      activeSources = sources;
      const screenCount = activeSources.filter(s => s.isScreen).length;
      const windowCount = activeSources.filter(s => !s.isScreen).length;

      if (badgeScreens) badgeScreens.textContent = screenCount;
      if (badgeWindows) badgeWindows.textContent = windowCount;

      activeTab = screenCount > 0 ? 'screens' : 'windows';
      if (tabScreens && tabWindows) {
        if (activeTab === 'screens') {
          tabScreens.classList.add('active');
          tabWindows.classList.remove('active');
        } else {
          tabScreens.classList.remove('active');
          tabWindows.classList.add('active');
        }
      }

      const initial = activeSources.find(s => activeTab === 'screens' ? s.isScreen : !s.isScreen) || activeSources[0];
      selectedSourceId = initial ? initial.id : null;

      renderScreenPickerGrid();
      if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (err) {
      console.error('Erro ao abrir seletor de telas:', err);
      activeSources = [{ id: 'screen:0:0', name: 'Tela Inteira (Monitor Principal)', thumbnail: '', isScreen: true }];
      selectedSourceId = 'screen:0:0';
      renderScreenPickerGrid();
    }
  };

  if (window.electronAPI.onOpenScreenPicker) {
    window.electronAPI.onOpenScreenPicker((sources) => {
      window.openElectronScreenPickerModal(sources);
    });
  }

  if (tabScreens) {
    tabScreens.addEventListener('click', () => {
      activeTab = 'screens';
      tabScreens.classList.add('active');
      if (tabWindows) tabWindows.classList.remove('active');
      renderScreenPickerGrid();
    });
  }

  if (tabWindows) {
    tabWindows.addEventListener('click', () => {
      activeTab = 'windows';
      tabWindows.classList.add('active');
      if (tabScreens) tabScreens.classList.remove('active');
      renderScreenPickerGrid();
    });
  }

  if (btnConfirmScreenPicker) btnConfirmScreenPicker.addEventListener('click', confirmScreenSelection);
  if (btnCloseScreenPicker) btnCloseScreenPicker.addEventListener('click', cancelScreenSelection);
  if (btnCancelScreenPicker) btnCancelScreenPicker.addEventListener('click', cancelScreenSelection);

  if (modalScreenPicker) {
    modalScreenPicker.addEventListener('click', (e) => {
      if (e.target === modalScreenPicker) {
        cancelScreenSelection();
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalScreenPicker && modalScreenPicker.style.display === 'flex') {
      cancelScreenSelection();
    }
  });

  // Detecção Automática de Jogos em Execução no Windows (Discord Game Activity)
  if (typeof window.electronAPI.onGameActivity === 'function') {
    window.electronAPI.onGameActivity((activity) => {
      setMyGameActivity(activity);
      if (socket && socket.connected) {
        socket.emit('user:activity-update', activity);
      }
      updateMyUserStatus();
      renderMembersSidebar();
      renderVoiceStageCards();
    });

    if (typeof window.electronAPI.getGameActivity === 'function') {
      window.electronAPI.getGameActivity().then((activity) => {
        if (activity) {
          setMyGameActivity(activity);
          if (socket && socket.connected) {
            socket.emit('user:activity-update', activity);
          }
          updateMyUserStatus();
          renderMembersSidebar();
          renderVoiceStageCards();
        }
      }).catch(() => {});
    }
  }

  // Atualiza periodicamente o tempo decorrido do jogo ativo
  setInterval(() => {
    document.querySelectorAll('[data-game-started]').forEach((el) => {
      const started = Number(el.getAttribute('data-game-started'));
      if (started) {
        el.textContent = formatGameDuration(started);
      }
    });
    updateMyUserStatus();
  }, 25000);

  if (socket) {
    socket.on('connect', () => {
      const myGameActivity = getMyGameActivity();
      if (myGameActivity && socket && socket.connected) {
        socket.emit('user:activity-update', myGameActivity);
      }
    });
  }
}
