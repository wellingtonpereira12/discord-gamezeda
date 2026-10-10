// ==========================================================================
// FAKEDC - SOUNDBOARD DO SERVIDOR (POPOVER & UPLOAD ESTILO DISCORD)
// ==========================================================================

import { escapeHtml } from './utils.js';
import { EMOJI_CATEGORIES } from './emojiData.js';

let activeSocket = null;
let activeWebrtc = null;
let getInVoiceFn = () => false;
let getCurrentUserFn = () => null;

let availableSounds = [];
let editingSoundId = null;
let currentImportMode = 'url';

export function setSoundImportMode(mode) {
  currentImportMode = mode;
  const btnModeUrl = document.getElementById('btn-mode-url');
  const btnModeFile = document.getElementById('btn-mode-file');
  const soundUrlGroup = document.getElementById('sound-url-group');
  const soundFileGroup = document.getElementById('sound-file-group');
  const soundFileInput = document.getElementById('sound-file-input');

  if (mode === 'url') {
    if (btnModeUrl) {
      btnModeUrl.style.background = '#5865F2';
      btnModeUrl.style.borderColor = '#5865F2';
      btnModeUrl.style.color = '#fff';
    }
    if (btnModeFile) {
      btnModeFile.style.background = '#2b2d31';
      btnModeFile.style.borderColor = '#3f4147';
      btnModeFile.style.color = '#b5bac1';
    }
    if (soundUrlGroup) soundUrlGroup.style.display = 'block';
    if (soundFileGroup) soundFileGroup.style.display = 'none';
    if (soundFileInput) soundFileInput.required = false;
  } else {
    if (btnModeFile) {
      btnModeFile.style.background = '#5865F2';
      btnModeFile.style.borderColor = '#5865F2';
      btnModeFile.style.color = '#fff';
    }
    if (btnModeUrl) {
      btnModeUrl.style.background = '#2b2d31';
      btnModeUrl.style.borderColor = '#3f4147';
      btnModeUrl.style.color = '#b5bac1';
    }
    if (soundFileGroup) soundFileGroup.style.display = 'block';
    if (soundUrlGroup) soundUrlGroup.style.display = 'none';
    if (soundFileInput) soundFileInput.required = !editingSoundId;
  }
}

export function autoExtractSoundNameFromUrl(url) {
  try {
    const clean = url.trim().split('?')[0].split('#')[0];
    const parts = clean.split('/').filter(Boolean);
    const last = parts[parts.length - 1] || '';
    const withoutExt = last.replace(/\.[a-zA-Z0-9]+$/, '');
    const cleanSlug = withoutExt.replace(/-\d+$/, '').replace(/[-_]+/g, ' ');
    if (cleanSlug && cleanSlug.length > 1) {
      return cleanSlug.charAt(0).toUpperCase() + cleanSlug.slice(1);
    }
  } catch (e) {}
  return '';
}

export function showSoundToast(msg) {
  const soundToast = document.getElementById('sound-toast');
  if (!soundToast) return;
  soundToast.textContent = msg;
  soundToast.style.display = 'flex';
  setTimeout(() => {
    soundToast.style.display = 'none';
  }, 2500);
}

export function playSoundLocally(url) {
  const audio = new Audio(url);
  if (activeWebrtc && typeof activeWebrtc.applyOutputDeviceToElement === 'function') {
    activeWebrtc.applyOutputDeviceToElement(audio);
  }
  audio.play().catch(e => console.warn('Erro ao tocar som:', e));
}

export function getCurrentSoundboardGuildId() {
  if (typeof window.getActiveGuildId === 'function') {
    return window.getActiveGuildId() || 'gamezeda';
  }
  return 'gamezeda';
}

export async function loadSoundboardSounds() {
  const soundboardGrid = document.getElementById('soundboard-grid');
  const soundboardSearchInput = document.getElementById('soundboard-search-input');
  if (!soundboardGrid) return;

  soundboardGrid.innerHTML = '<div style="color: #949ba4; padding: 20px; text-align: center; grid-column: 1 / -1;">Carregando sons...</div>';
  try {
    const guildId = getCurrentSoundboardGuildId();
    const res = await fetch(`/api/soundboard?guildId=${encodeURIComponent(guildId)}`);
    const data = await res.json();
    if (data.success) {
      availableSounds = data.sounds || [];
      renderSoundboardGrid(soundboardSearchInput ? soundboardSearchInput.value.trim() : '');
    }
  } catch (err) {
    soundboardGrid.innerHTML = '<div style="color: #ed4245; padding: 20px; text-align: center; grid-column: 1 / -1;">Erro ao carregar sons.</div>';
  }
}

export function renderSoundboardGrid(filterText = '') {
  const soundboardGrid = document.getElementById('soundboard-grid');
  if (!soundboardGrid) return;
  soundboardGrid.innerHTML = '';
  let filtered = availableSounds;
  if (filterText) {
    const q = filterText.toLowerCase();
    filtered = filtered.filter(s => s.name.toLowerCase().includes(q) || (s.emoji && s.emoji.includes(q)));
  }

  filtered.forEach(sound => {
    const tile = document.createElement('div');
    tile.className = 'soundboard-tile';
    tile.setAttribute('data-sound-id', sound.id);

    tile.innerHTML = `
      <div class="soundboard-tile-main" title="Tocar na chamada: ${escapeHtml(sound.name)}">
        <span class="soundboard-tile-emoji">${sound.emoji || '🔊'}</span>
        <span class="soundboard-tile-name">${escapeHtml(sound.name)}</span>
      </div>
      <div class="soundboard-tile-actions">
        <button type="button" class="soundboard-tile-action-btn soundboard-tile-edit" title="Editar som (nome, emoji ou áudio)">
          <i data-lucide="pencil" style="width: 13px; height: 13px;"></i>
        </button>
        <button type="button" class="soundboard-tile-action-btn soundboard-tile-delete" title="Excluir som deste servidor">
          <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>
        </button>
        <button type="button" class="soundboard-tile-action-btn soundboard-tile-preview" title="Ouvir prévia (somente para você)">
          <i data-lucide="volume-2" style="width: 14px; height: 14px;"></i>
        </button>
      </div>
    `;

    // Clicar em cima (na área principal) -> toca na chamada (play geral)
    tile.querySelector('.soundboard-tile-main').addEventListener('click', () => {
      playSoundLocally(sound.file_url);
      const inVoice = getInVoiceFn();
      if (inVoice && activeSocket) {
        activeSocket.emit('soundboard:play', {
          soundId: sound.id,
          soundUrl: sound.file_url,
          soundName: sound.name,
          emoji: sound.emoji
        });
        showSoundToast(`Você tocou: ${sound.emoji} ${sound.name}`);
      } else {
        showSoundToast(`Som: ${sound.emoji} ${sound.name} (conecte-se à voz para os outros ouvirem)`);
      }
    });

    // Clicar no botão de editar -> abre modal de edição com dados preenchidos
    const btnEdit = tile.querySelector('.soundboard-tile-edit');
    if (btnEdit) {
      btnEdit.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditSoundModal(sound);
      });
    }

    // Clicar no botão de excluir -> confirma e remove o som
    const btnDelete = tile.querySelector('.soundboard-tile-delete');
    if (btnDelete) {
      btnDelete.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm(`Deseja realmente excluir o som "${sound.name}" deste servidor?`)) return;
        try {
          const res = await fetch(`/api/soundboard/${sound.id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            showSoundToast(`Som "${sound.name}" excluído.`);
            await loadSoundboardSounds();
          } else {
            alert(data.error || 'Erro ao excluir som.');
          }
        } catch (err) {
          alert('Erro na comunicação com o servidor ao excluir som.');
        }
      });
    }

    // Clicar no botão de prévia -> ouve apenas a prévia local!
    const btnPreview = tile.querySelector('.soundboard-tile-preview');
    if (btnPreview) {
      btnPreview.addEventListener('click', (e) => {
        e.stopPropagation();
        playSoundLocally(sound.file_url);
        showSoundToast(`Prévia: ${sound.emoji} ${sound.name}`);
      });
    }

    soundboardGrid.appendChild(tile);
  });

  // Botão "+ Adicionar som" estilo quadradinho no final da grade
  const addTile = document.createElement('div');
  addTile.className = 'soundboard-tile soundboard-add-tile';
  addTile.title = 'Adicionar novo som ao servidor';
  addTile.innerHTML = `
    <i data-lucide="plus" style="width: 15px; height: 15px;"></i>
    <span class="soundboard-tile-name">Adicionar som</span>
  `;
  addTile.addEventListener('click', (e) => {
    e.stopPropagation();
    openAddSoundModal();
  });
  soundboardGrid.appendChild(addTile);

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

window.loadSoundboardSounds = loadSoundboardSounds;

export async function openSoundboardModal(e) {
  if (e) e.stopPropagation();
  const soundboardModal = document.getElementById('soundboard-modal');
  const soundboardSearchInput = document.getElementById('soundboard-search-input');
  if (!soundboardModal) return;

  if (soundboardModal.style.display === 'flex') {
    closeSoundboardModal();
    return;
  }

  soundboardModal.style.display = 'flex';
  if (soundboardSearchInput) {
    soundboardSearchInput.value = '';
    setTimeout(() => soundboardSearchInput.focus(), 60);
  }
  await loadSoundboardSounds();
}

export function closeSoundboardModal() {
  const soundboardModal = document.getElementById('soundboard-modal');
  if (soundboardModal) soundboardModal.style.display = 'none';
}

function setSoundEmojiValue(emojiChar) {
  const clean = emojiChar || '🔊';
  const soundEmojiInput = document.getElementById('sound-emoji-input');
  const soundEmojiDisplay = document.getElementById('sound-emoji-display');
  if (soundEmojiInput) soundEmojiInput.value = clean;
  if (soundEmojiDisplay) soundEmojiDisplay.textContent = clean;
}

export function openAddSoundModal() {
  editingSoundId = null;
  const addSoundModal = document.getElementById('add-sound-modal');
  const addSoundModalTitle = document.getElementById('add-sound-modal-title');
  const soundEditIdInput = document.getElementById('sound-edit-id');
  const btnSubmitSound = document.getElementById('btn-submit-sound');
  const soundFileLabel = document.getElementById('sound-file-label');
  const soundFileHelp = document.getElementById('sound-file-help');
  const soundFileInput = document.getElementById('sound-file-input');
  const soundNameInput = document.getElementById('sound-name-input');
  const soundUrlInput = document.getElementById('sound-url-input');
  const modeSwitch = document.getElementById('sound-import-mode-switch');

  if (soundEditIdInput) soundEditIdInput.value = '';
  if (addSoundModalTitle) addSoundModalTitle.textContent = 'Cadastrar Efeito Sonoro';
  if (btnSubmitSound) btnSubmitSound.textContent = 'Salvar e Enviar Som';
  if (soundFileLabel) soundFileLabel.textContent = 'Arquivo de Áudio (MP3, WAV, OGG máx 5MB)';
  if (soundFileHelp) soundFileHelp.style.display = 'none';
  if (soundFileInput) {
    soundFileInput.value = '';
    soundFileInput.required = false;
  }
  if (soundUrlInput) soundUrlInput.value = '';
  if (soundNameInput) soundNameInput.value = '';
  if (modeSwitch) modeSwitch.style.display = 'flex';
  setSoundImportMode('url');
  setSoundEmojiValue('🔊');
  closeSoundEmojiPopover();
  if (addSoundModal) addSoundModal.style.display = 'flex';
  if (soundUrlInput) soundUrlInput.focus();
}

export function openEditSoundModal(sound) {
  if (!sound) return;
  editingSoundId = sound.id;
  const addSoundModal = document.getElementById('add-sound-modal');
  const soundEditIdInput = document.getElementById('sound-edit-id');
  const addSoundModalTitle = document.getElementById('add-sound-modal-title');
  const btnSubmitSound = document.getElementById('btn-submit-sound');
  const soundFileLabel = document.getElementById('sound-file-label');
  const soundFileHelp = document.getElementById('sound-file-help');
  const soundFileInput = document.getElementById('sound-file-input');
  const soundNameInput = document.getElementById('sound-name-input');
  const modeSwitch = document.getElementById('sound-import-mode-switch');
  const soundUrlGroup = document.getElementById('sound-url-group');
  const soundFileGroup = document.getElementById('sound-file-group');

  if (soundEditIdInput) soundEditIdInput.value = sound.id;
  if (addSoundModalTitle) addSoundModalTitle.textContent = 'Editar Efeito Sonoro';
  if (btnSubmitSound) btnSubmitSound.textContent = 'Salvar Alterações';
  if (soundFileLabel) soundFileLabel.textContent = 'Substituir Áudio (Opcional)';
  if (soundFileHelp) soundFileHelp.style.display = 'block';
  if (modeSwitch) modeSwitch.style.display = 'none';
  if (soundUrlGroup) soundUrlGroup.style.display = 'none';
  if (soundFileGroup) soundFileGroup.style.display = 'block';
  if (soundFileInput) {
    soundFileInput.value = '';
    soundFileInput.required = false;
  }
  if (soundNameInput) soundNameInput.value = sound.name || '';
  setSoundEmojiValue(sound.emoji || '🔊');
  closeSoundEmojiPopover();
  if (addSoundModal) addSoundModal.style.display = 'flex';
  if (soundNameInput) soundNameInput.focus();
}

function renderSoundEmojiPopover(filterQuery = '') {
  const soundEmojiPopoverGrid = document.getElementById('sound-emoji-popover-grid');
  if (!soundEmojiPopoverGrid) return;
  soundEmojiPopoverGrid.innerHTML = '';
  const cleanFilter = (filterQuery || '').trim().toLowerCase();

  let count = 0;
  for (const cat of EMOJI_CATEGORIES) {
    for (const item of cat.emojis) {
      if (cleanFilter && !item.keywords.includes(cleanFilter) && !item.char.includes(cleanFilter)) {
        continue;
      }
      count++;
      const opt = document.createElement('button');
      opt.type = 'button';
      opt.className = 'sound-emoji-opt-btn';
      opt.textContent = item.char;
      opt.title = item.keywords.split(' ')[0] || item.char;
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        setSoundEmojiValue(item.char);
        closeSoundEmojiPopover();
      });
      soundEmojiPopoverGrid.appendChild(opt);
    }
  }

  if (count === 0) {
    soundEmojiPopoverGrid.innerHTML = `
      <div style="grid-column: 1 / -1; color: #949ba4; font-size: 12px; padding: 16px; text-align: center;">
        Nenhum emoji encontrado para "${escapeHtml(cleanFilter)}".
      </div>
    `;
  }
}

function toggleSoundEmojiPopover() {
  const soundEmojiPopover = document.getElementById('sound-emoji-popover');
  const soundEmojiSearchInput = document.getElementById('sound-emoji-search-input');
  if (!soundEmojiPopover) return;
  const isHidden = soundEmojiPopover.style.display === 'none';
  if (isHidden) {
    soundEmojiPopover.style.display = 'flex';
    if (soundEmojiSearchInput) soundEmojiSearchInput.value = '';
    renderSoundEmojiPopover('');
    if (soundEmojiSearchInput) soundEmojiSearchInput.focus();
  } else {
    closeSoundEmojiPopover();
  }
}

function closeSoundEmojiPopover() {
  const soundEmojiPopover = document.getElementById('sound-emoji-popover');
  if (soundEmojiPopover) soundEmojiPopover.style.display = 'none';
}

export function initSoundboard({ socket, webrtc, getInVoice, getCurrentUser }) {
  activeSocket = socket;
  activeWebrtc = webrtc;
  if (typeof getInVoice === 'function') getInVoiceFn = getInVoice;
  if (typeof getCurrentUser === 'function') getCurrentUserFn = getCurrentUser;

  const btnCloseSoundboard = document.getElementById('btn-close-soundboard');
  const soundboardSearchInput = document.getElementById('soundboard-search-input');
  const btnVoiceSoundboard = document.getElementById('btn-voice-soundboard');
  const btnStageSoundboard = document.getElementById('btn-stage-soundboard');
  const btnOpenSoundboardHeader = document.getElementById('btn-open-soundboard-header');
  const btnSoundEmojiTrigger = document.getElementById('btn-sound-emoji-trigger');
  const soundEmojiSearchInput = document.getElementById('sound-emoji-search-input');
  const soundEmojiPopover = document.getElementById('sound-emoji-popover');
  const btnOpenAddSoundModalEl = document.getElementById('btn-open-add-sound-modal');
  const btnCloseAddSound = document.getElementById('btn-close-add-sound');
  const addSoundModal = document.getElementById('add-sound-modal');
  const addSoundForm = document.getElementById('add-sound-form');
  const soundFileInput = document.getElementById('sound-file-input');
  const soundNameInput = document.getElementById('sound-name-input');
  const soundEmojiInput = document.getElementById('sound-emoji-input');
  const btnSubmitSound = document.getElementById('btn-submit-sound');

  if (btnCloseSoundboard) btnCloseSoundboard.addEventListener('click', closeSoundboardModal);
  if (btnVoiceSoundboard) btnVoiceSoundboard.addEventListener('click', openSoundboardModal);
  if (btnStageSoundboard) btnStageSoundboard.addEventListener('click', openSoundboardModal);
  if (btnOpenSoundboardHeader) btnOpenSoundboardHeader.addEventListener('click', openSoundboardModal);

  if (soundboardSearchInput) {
    soundboardSearchInput.addEventListener('input', (e) => {
      renderSoundboardGrid(e.target.value.trim());
    });
  }

  if (btnSoundEmojiTrigger) {
    btnSoundEmojiTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSoundEmojiPopover();
    });
  }

  if (soundEmojiSearchInput) {
    soundEmojiSearchInput.addEventListener('input', (e) => {
      renderSoundEmojiPopover(e.target.value);
    });
  }

  document.addEventListener('click', (e) => {
    if (soundEmojiPopover && soundEmojiPopover.style.display === 'flex') {
      const clickedInside = soundEmojiPopover.contains(e.target);
      const clickedTrigger = btnSoundEmojiTrigger && btnSoundEmojiTrigger.contains(e.target);
      if (!clickedInside && !clickedTrigger) {
        closeSoundEmojiPopover();
      }
    }
  });

  if (btnOpenAddSoundModalEl) btnOpenAddSoundModalEl.addEventListener('click', openAddSoundModal);
  if (btnCloseAddSound && addSoundModal) {
    btnCloseAddSound.addEventListener('click', () => {
      addSoundModal.style.display = 'none';
      closeSoundEmojiPopover();
    });
  }

  // Modo de importação: URL vs Arquivo
  const btnModeUrl = document.getElementById('btn-mode-url');
  const btnModeFile = document.getElementById('btn-mode-file');
  const soundUrlInput = document.getElementById('sound-url-input');
  const btnPreviewUrl = document.getElementById('btn-preview-url');

  if (btnModeUrl) btnModeUrl.addEventListener('click', () => setSoundImportMode('url'));
  if (btnModeFile) btnModeFile.addEventListener('click', () => setSoundImportMode('file'));

  if (btnPreviewUrl) {
    btnPreviewUrl.addEventListener('click', async () => {
      const raw = soundUrlInput ? soundUrlInput.value.trim() : '';
      if (!raw) {
        showSoundToast('Cole um link de som primeiro para testar!');
        return;
      }

      btnPreviewUrl.disabled = true;
      btnPreviewUrl.textContent = '⏳ Buscando...';

      try {
        const res = await fetch(`/api/soundboard/resolve-url?url=${encodeURIComponent(raw)}`);
        const data = await res.json();
        if (data.success && data.audioUrl) {
          if (!soundNameInput.value.trim() && data.title) {
            soundNameInput.value = data.title;
          }
          playSoundLocally(data.audioUrl);
          showSoundToast(`▶️ Tocando: ${data.title || 'Prévia do áudio'}`);
        } else {
          showSoundToast('⚠️ Não foi possível localizar o áudio desse link.');
        }
      } catch (err) {
        showSoundToast('Erro ao testar link de áudio.');
      } finally {
        btnPreviewUrl.disabled = false;
        btnPreviewUrl.textContent = '▶️ Testar';
      }
    });
  }

  if (soundUrlInput) {
    soundUrlInput.addEventListener('change', async () => {
      const raw = soundUrlInput.value.trim();
      if (raw && !soundNameInput.value.trim()) {
        try {
          const res = await fetch(`/api/soundboard/resolve-url?url=${encodeURIComponent(raw)}`);
          const data = await res.json();
          if (data.success && data.title && !soundNameInput.value.trim()) {
            soundNameInput.value = data.title;
          }
        } catch (e) {
          const suggested = autoExtractSoundNameFromUrl(raw);
          if (suggested && !soundNameInput.value.trim()) soundNameInput.value = suggested;
        }
      }
    });
  }

  if (addSoundForm) {
    addSoundForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const isEditing = Boolean(editingSoundId);

      if (!isEditing && currentImportMode === 'file' && (!soundFileInput.files || !soundFileInput.files[0])) {
        alert('Selecione um arquivo de áudio para cadastrar o som.');
        return;
      }

      if (!isEditing && currentImportMode === 'url') {
        const urlVal = soundUrlInput ? soundUrlInput.value.trim() : '';
        if (!urlVal) {
          alert('Cole o link do som para importar.');
          return;
        }
      }

      const currentUser = getCurrentUserFn();
      const currentGuildId = getCurrentSoundboardGuildId();
      const cleanName = (soundNameInput.value.trim() || 'Efeito Sonoro').substring(0, 40);
      const cleanEmoji = soundEmojiInput.value.trim() || '🔊';
      const creatorName = currentUser ? currentUser.name : 'Anônimo';

      try {
        if (btnSubmitSound) {
          btnSubmitSound.disabled = true;
          btnSubmitSound.textContent = isEditing ? 'Salvando alterações...' : 'Baixando e salvando som...';
        }

        let res, data;
        if (isEditing) {
          const formData = new FormData();
          if (soundFileInput.files && soundFileInput.files[0]) {
            formData.append('audio', soundFileInput.files[0]);
          }
          formData.append('name', cleanName);
          formData.append('emoji', cleanEmoji);
          formData.append('created_by', creatorName);
          formData.append('guild_id', currentGuildId);
          res = await fetch(`/api/soundboard/${editingSoundId}/edit`, {
            method: 'POST',
            body: formData
          });
          data = await res.json();
        } else if (currentImportMode === 'url') {
          res = await fetch('/api/soundboard/import-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: soundUrlInput.value.trim(),
              name: cleanName,
              emoji: cleanEmoji,
              created_by: creatorName,
              guild_id: currentGuildId
            })
          });
          data = await res.json();
        } else {
          const formData = new FormData();
          if (soundFileInput.files && soundFileInput.files[0]) {
            formData.append('audio', soundFileInput.files[0]);
          }
          formData.append('name', cleanName);
          formData.append('emoji', cleanEmoji);
          formData.append('created_by', creatorName);
          formData.append('guild_id', currentGuildId);
          res = await fetch('/api/soundboard', {
            method: 'POST',
            body: formData
          });
          data = await res.json();
        }

        if (data.success) {
          if (addSoundModal) addSoundModal.style.display = 'none';
          closeSoundEmojiPopover();
          addSoundForm.reset();
          editingSoundId = null;
          await loadSoundboardSounds();
          showSoundToast(isEditing ? `Som "${cleanName}" atualizado!` : `Som "${cleanEmoji} ${cleanName}" cadastrado no servidor!`);
        } else {
          alert(data.error || 'Erro ao processar som.');
        }
      } catch (err) {
        alert('Erro na comunicação com o servidor.');
      } finally {
        if (btnSubmitSound) {
          btnSubmitSound.disabled = false;
          btnSubmitSound.textContent = isEditing ? 'Salvar Alterações' : 'Salvar e Enviar Som';
        }
      }
    });
  }

  // Socket listeners
  if (activeSocket) {
    activeSocket.on('soundboard:played', ({ soundUrl, soundName, emoji, playedBy, playedById }) => {
      if (playedById !== activeSocket.id) {
        playSoundLocally(soundUrl);
        showSoundToast(`🎵 ${playedBy} tocou: ${emoji} ${soundName}`);
      }
    });

    activeSocket.on('soundboard:added', (payload) => {
      const gId = payload && payload.guildId ? payload.guildId : null;
      if (!gId || gId === getCurrentSoundboardGuildId()) {
        loadSoundboardSounds();
      }
    });

    activeSocket.on('soundboard:updated', (payload) => {
      const gId = payload && payload.guildId ? payload.guildId : null;
      if (!gId || gId === getCurrentSoundboardGuildId()) {
        loadSoundboardSounds();
      }
    });

    activeSocket.on('soundboard:deleted', (payload) => {
      const gId = payload && payload.guildId ? payload.guildId : null;
      if (!gId || gId === getCurrentSoundboardGuildId()) {
        loadSoundboardSounds();
      }
    });
  }
}
