import { sounds } from './sounds.js?v=20261004_v6';
import { WebRTCManager } from './webrtc.js?v=20261004_v6';

if (window.lucide) {
  window.lucide.createIcons();
}

const socket = io();

// Telemetria de erros do cliente enviada ao console do servidor para diagnóstico imediato
window.addEventListener('error', (e) => {
  try {
    socket.emit('client:error', {
      type: 'uncaught_error',
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      stack: e.error ? e.error.stack : null
    });
  } catch(err) {}
});

window.addEventListener('unhandledrejection', (e) => {
  try {
    socket.emit('client:error', {
      type: 'unhandled_rejection',
      message: e.reason ? (e.reason.message || String(e.reason)) : 'unknown',
      stack: e.reason ? e.reason.stack : null
    });
  } catch(err) {}
});

// Identificador persistente deste dispositivo/navegador no cliente
function getOrCreateDeviceId() {
  let devId = localStorage.getItem('gamezeda_device_id');
  if (!devId) {
    devId = 'dev_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
    localStorage.setItem('gamezeda_device_id', devId);
  }
  return devId;
}
let localDeviceId = getOrCreateDeviceId();

function regenerateDeviceId() {
  const newDeviceId = 'dev_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
  localStorage.setItem('gamezeda_device_id', newDeviceId);
  localDeviceId = newDeviceId;
  return newDeviceId;
}

// ==========================================
// ELEMENTOS DO DOM
// ==========================================
// Modal de Login
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username-input');
const avatarPreview = document.getElementById('avatar-preview');
const loginStepUsername = document.getElementById('login-step-username');
const loginStepPassword = document.getElementById('login-step-password');
const loginPasswordInput = document.getElementById('login-password-input');
const btnLoginConfirmPassword = document.getElementById('btn-login-confirm-password');
const btnLoginBackUsername = document.getElementById('btn-login-back-username');
const loginAuthAlert = document.getElementById('login-auth-alert');
const btnLoginSubmit = document.getElementById('btn-login-submit');

// Perfil Local
const myAvatarImg = document.getElementById('my-avatar');
const myUsernameEl = document.getElementById('my-username');
const myUserStatusEl = document.getElementById('my-userstatus');
const cardMyAvatar = document.getElementById('card-my-avatar');
const cardMyName = document.getElementById('card-my-name');
const cardLocalUser = document.getElementById('card-local-user');

// Popover de Perfil / Logout
const btnCurrentUserProfile = document.getElementById('btn-current-user-profile');
const userProfilePopover = document.getElementById('user-profile-popover');
const popoverAvatar = document.getElementById('popover-avatar');
const popoverName = document.getElementById('popover-name');
const btnPopoverLogout = document.getElementById('btn-popover-logout');

// Status de Voz e Ações Rápidas
const voiceStatusBox = document.getElementById('voice-status-box');
const quickDisconnectBtn = document.getElementById('quick-disconnect-btn');
const quickScreenShareBtn = document.getElementById('quick-screenshare-btn');
const btnVoiceSoundboard = document.getElementById('btn-voice-soundboard');

// Controles do Usuário
const btnToggleMic = document.getElementById('btn-toggle-mic');
const btnToggleDeaf = document.getElementById('btn-toggle-deaf');
const btnUserSettings = document.getElementById('btn-user-settings');

// Canais, Servidor e Modais
const serverHeaderBtn = document.getElementById('server-header-btn');
const serverDropdownMenu = document.getElementById('server-dropdown-menu');
const btnMenuCreateChannel = document.getElementById('btn-menu-create-channel');
const btnMenuCreateCategory = document.getElementById('btn-menu-create-category');
const channelsScrollContainer = document.getElementById('channels-scroll-container');

// Modais de Criação e Exclusão
const modalCreateChannel = document.getElementById('modal-create-channel');
const optionTypeText = document.getElementById('option-type-text');
const optionTypeVoice = document.getElementById('option-type-voice');
const inputNewChannelName = document.getElementById('input-new-channel-name');
const channelNamePrefix = document.getElementById('channel-name-prefix');
const channelNameHelp = document.getElementById('channel-name-help');
const selectChannelCategory = document.getElementById('select-channel-category');
const createChannelAlert = document.getElementById('create-channel-alert');
const btnCancelCreateChannel = document.getElementById('btn-cancel-create-channel');
const btnConfirmCreateChannel = document.getElementById('btn-confirm-create-channel');

const modalCreateCategory = document.getElementById('modal-create-category');
const inputNewCategoryName = document.getElementById('input-new-category-name');
const createCategoryAlert = document.getElementById('create-category-alert');
const btnCancelCreateCategory = document.getElementById('btn-cancel-create-category');
const btnConfirmCreateCategory = document.getElementById('btn-confirm-create-category');

const modalConfirmDelete = document.getElementById('modal-confirm-delete');
const deleteModalTitle = document.getElementById('delete-modal-title');
const deleteModalDesc = document.getElementById('delete-modal-desc');
const deleteModalAlert = document.getElementById('delete-modal-alert');
const btnCancelDelete = document.getElementById('btn-cancel-delete');
const btnConfirmDelete = document.getElementById('btn-confirm-delete');

// Membros e Palco
const membersListContent = document.getElementById('members-list-content');
const dynamicVoiceCards = document.getElementById('dynamic-voice-cards');
const membersSidebar = document.getElementById('members-sidebar');
const btnToggleMembersSidebar = document.getElementById('btn-toggle-members-sidebar');

// Palco de Vídeo / Telas
const videoStage = document.getElementById('video-stage');
const streamSwitcherBar = document.getElementById('stream-switcher-bar');
const mainScreenTile = document.getElementById('main-screen-tile');
const sharedScreenVideo = document.getElementById('shared-screen-video');
const screenSharerName = document.getElementById('screen-sharer-name');
const btnFullscreenScreen = document.getElementById('btn-fullscreen-screen');
const btnStopScreenTile = document.getElementById('btn-stop-screen-tile');
const btnToggleScreenSound = document.getElementById('btn-toggle-screen-sound');
const screenSoundIcon = document.getElementById('screen-sound-icon');
const screenAudioMeter = document.getElementById('screen-audio-meter');

// Controles do Palco
const btnStageScreen = document.getElementById('btn-stage-screen');
const btnStageScreenText = document.getElementById('btn-stage-screen-text');
const btnStageSoundboard = document.getElementById('btn-stage-soundboard');
const btnStageMic = document.getElementById('btn-stage-mic');
const btnStageDisconnect = document.getElementById('btn-stage-disconnect');

// Chat
const messagesContainer = document.getElementById('messages-container');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const currentChannelNameEl = document.getElementById('current-channel-name');
const chatSearchInput = document.getElementById('chat-search-input');
const btnAttachFile = document.getElementById('btn-attach-file');
const chatFileInput = document.getElementById('chat-file-input');
const btnEmojiTrigger = document.getElementById('btn-emoji-trigger');

// Menu de Contexto do Usuário
const userContextMenu = document.getElementById('user-context-menu');
const ctxVolumeSlider = document.getElementById('ctx-volume-slider');
const ctxVolumeVal = document.getElementById('ctx-volume-val');
const ctxItemMute = document.getElementById('ctx-item-mute');
const ctxCheckMute = document.getElementById('ctx-check-mute');
const ctxItemSfx = document.getElementById('ctx-item-sfx');
const ctxCheckSfx = document.getElementById('ctx-check-sfx');
const ctxItemVideo = document.getElementById('ctx-item-video');
const ctxCheckVideo = document.getElementById('ctx-check-video');

// Modal de Configurações
const settingsModal = document.getElementById('settings-modal');
const btnCloseSettings = document.getElementById('btn-close-settings');
const btnSaveSettings = document.getElementById('btn-save-settings');
const settingAudioInput = document.getElementById('setting-audio-input');
const settingAudioOutput = document.getElementById('setting-audio-output');
const micTestMeter = document.getElementById('mic-test-meter');
const btnTestOutputSound = document.getElementById('btn-test-output-sound');
const settingNoiseSuppressionToggle = document.getElementById('setting-noise-suppression-toggle');
const settingNoiseThresholdSlider = document.getElementById('setting-noise-threshold-slider');
const settingNoiseThreshVal = document.getElementById('setting-noise-thresh-val');

// Configurações - Abas e Cadastro
const tabBtnVoice = document.getElementById('tab-btn-voice');
const tabBtnAccount = document.getElementById('tab-btn-account');
const tabContentVoice = document.getElementById('tab-content-voice');
const tabContentAccount = document.getElementById('tab-content-account');
const accountAvatarImg = document.getElementById('account-avatar-img');
const accountUsernameText = document.getElementById('account-username-text');
const accountStatusBadge = document.getElementById('account-status-badge');
const accountInfoText = document.getElementById('account-info-text');
const accountPasswordForm = document.getElementById('account-password-form');
const accountNewPassword = document.getElementById('account-new-password');
const accountConfirmPassword = document.getElementById('account-confirm-password');
const accountFormAlert = document.getElementById('account-form-alert');
const btnSaveAccountPassword = document.getElementById('btn-save-account-password');

// Modal de Soundboard
const soundboardModal = document.getElementById('soundboard-modal');
const btnCloseSoundboard = document.getElementById('btn-close-soundboard');
const btnOpenSoundboardHeader = document.getElementById('btn-open-soundboard-header');
const soundboardSearchInput = document.getElementById('soundboard-search-input');
const soundboardGrid = document.getElementById('soundboard-grid');
const btnOpenAddSoundModal = document.getElementById('btn-open-add-sound-modal');
const addSoundModal = document.getElementById('add-sound-modal');
const btnCloseAddSound = document.getElementById('btn-close-add-sound');
const addSoundForm = document.getElementById('add-sound-form');
const soundToast = document.getElementById('sound-toast');

// ==========================================
// ESTADO LOCAL
// ==========================================
let currentUser = null;
let currentTextChannel = 'geral';
let inVoice = false;
let isMuted = false;
let isDeafened = false;
let isScreenSharing = false;

const userConfigs = new Map();
let currentContextPeerId = null;

function getUserConfig(peerId) {
  if (!userConfigs.has(peerId)) {
    userConfigs.set(peerId, {
      volume: 100,
      muted: false,
      sfxMuted: false,
      videoDisabled: false
    });
  }
  return userConfigs.get(peerId);
}

// Transmissões simultâneas
const activeStreams = new Map();
let currentViewedStreamId = null;

const channelMessagesStore = {};
let allOnlineUsers = [];
let allVoiceUsers = [];
let allVoiceRoomsState = { 'gamezeda': [] };
let availableSounds = [];

let allCategories = [
  { id: 'cat-text', name: 'Canais de Texto', position: 0 },
  { id: 'cat-voice', name: 'Canais de Voz', position: 1 }
];

let allChannels = [
  { id: 'geral', name: 'geral', type: 'text', categoryId: 'cat-text', position: 0 },
  { id: 'links', name: 'links', type: 'text', categoryId: 'cat-text', position: 1 },
  { id: 'meme-imagem-videos', name: 'meme-imagem-videos', type: 'text', categoryId: 'cat-text', position: 2 },
  { id: 'musicas', name: 'musicas', type: 'text', categoryId: 'cat-text', position: 3 },
  { id: 'novo-video-youtube', name: 'novo-video-youtube', type: 'text', categoryId: 'cat-text', position: 4 },
  { id: 'clips-twitch', name: 'clips twitch', type: 'text', categoryId: 'cat-text', position: 5 },
  { id: 'blogger', name: 'blogger', type: 'text', categoryId: 'cat-text', position: 6 },
  { id: 'informacoes-eventos-regras', name: 'informações-eventos-regras', type: 'text', categoryId: 'cat-text', position: 7 },
  { id: 'nova-live', name: 'nova-live', type: 'text', categoryId: 'cat-text', position: 8 },
  { id: 'vendo-mousepad', name: 'vendo-mousepad', type: 'text', categoryId: 'cat-text', position: 9 },
  { id: 'to-sem-mic', name: 'to-sem-mic', type: 'text', categoryId: 'cat-text', position: 10 },
  { id: 'gamezeda', name: 'Gamezeda', type: 'voice', categoryId: 'cat-voice', position: 0 }
];

let collapsedCategories = new Set(JSON.parse(localStorage.getItem('discord_collapsed_cats') || '[]'));
let currentVoiceChannelId = null;
let currentVoiceChannelName = 'Gamezeda';
let deleteTarget = null; // { type: 'channel' | 'category', id, name }

// ==========================================
// GERENCIADOR WEBRTC HD
// ==========================================
const webrtc = new WebRTCManager(
  socket,
  (peerId, stream, track) => {
    const peer = allOnlineUsers.find(u => u.id === peerId);
    const name = peer ? peer.name : `Participante ${peerId.substring(0, 4)}`;
    const avatar = peer ? peer.avatar : `https://api.dicebear.com/7.x/bottts/svg?seed=${peerId}`;
    registerStream(peerId, stream, name, avatar, false);
  },
  (peerId, type) => {
    if (type === 'video' || !type) {
      unregisterStream(peerId);
    }
  },
  (isSpeaking) => {
    socket.emit('voice:speaking', { isSpeaking });
    if (cardLocalUser) cardLocalUser.classList.toggle('speaking', isSpeaking);
    const localPill = document.querySelector(`.voice-user-pill[data-user-id="${socket.id}"]`);
    if (localPill) localPill.classList.toggle('speaking', isSpeaking);
  },
  (peerId, isSpeaking) => {
    const card = document.getElementById(`voice-card-${peerId}`);
    if (card) card.classList.toggle('speaking', isSpeaking);
    const pill = document.querySelector(`.voice-user-pill[data-user-id="${peerId}"]`);
    if (pill) pill.classList.toggle('speaking', isSpeaking);
  }
);

webrtc.onRemoteScreenAudio = (peerId, stream, track) => {
  console.log(`[WebRTC 🔊] Áudio de tela recebido de ${peerId}`);
  if (currentViewedStreamId === peerId) {
    const liveIndicatorEl = mainScreenTile.querySelector('.live-indicator');
    if (liveIndicatorEl) {
      liveIndicatorEl.textContent = 'AO VIVO 1080p60 • 🔊 COM SOM';
    }
    updateScreenAudioMeter(stream);
    updateScreenSoundButtonState();
  }
};

// Medidor de teste de microfone no modal de configurações
setInterval(() => {
  if (settingsModal.style.display !== 'none' && webrtc.analyser) {
    const buffer = new Uint8Array(webrtc.analyser.frequencyBinCount);
    webrtc.analyser.getByteFrequencyData(buffer);
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) sum += buffer[i];
    const avg = sum / buffer.length;
    const pct = Math.min(100, Math.round((avg / 60) * 100));
    if (micTestMeter) micTestMeter.style.width = `${pct}%`;
  }
}, 60);

// ==========================================
// TRANSMISSÕES SIMULTÂNEAS
// ==========================================
function registerStream(id, stream, name, avatar, isLocal) {
  activeStreams.set(id, { id, name, avatar, stream, isLocal });

  // Se for a tela local do usuário, OU se não houver tela ativa em exibição, abre imediatamente no palco
  if (isLocal || !currentViewedStreamId || !activeStreams.has(currentViewedStreamId)) {
    viewStream(id);
  } else {
    renderStreamSwitcherBar();
    renderVoiceStageCards();
    renderVoiceChannelUsers();
  }
}

function unregisterStream(id) {
  activeStreams.delete(id);

  if (currentViewedStreamId === id) {
    const remaining = Array.from(activeStreams.keys());
    if (remaining.length > 0) {
      viewStream(remaining[0]);
    } else {
      currentViewedStreamId = null;
      mainScreenTile.style.display = 'none';
      sharedScreenVideo.srcObject = null;
      if (streamSwitcherBar) streamSwitcherBar.style.display = 'none';
    }
  }

  renderStreamSwitcherBar();
  renderVoiceStageCards();
  renderVoiceChannelUsers();
}

let screenAudioMeterTimer = null;
let screenAudioCtx = null;

function updateScreenAudioMeter(stream) {
  if (screenAudioMeterTimer) {
    clearInterval(screenAudioMeterTimer);
    screenAudioMeterTimer = null;
  }
  if (!stream || !screenAudioMeter) return;

  const audioTracks = stream.getAudioTracks ? stream.getAudioTracks() : [];
  if (audioTracks.length === 0) {
    screenAudioMeter.style.display = 'none';
    return;
  }

  screenAudioMeter.style.display = 'inline-block';
  screenAudioMeter.textContent = '[ · · · ]';

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!screenAudioCtx) {
      screenAudioCtx = new AudioCtx();
    }
    if (screenAudioCtx.state === 'suspended') {
      screenAudioCtx.resume().catch(() => {});
    }

    const src = screenAudioCtx.createMediaStreamSource(stream);
    const analyser = screenAudioCtx.createAnalyser();
    analyser.fftSize = 128;
    src.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    screenAudioMeterTimer = setInterval(() => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      const avg = sum / data.length;

      let bars = '· · ·';
      if (avg > 30) bars = ' ▂▃▅▆▇';
      else if (avg > 20) bars = ' ▂▃▅▆';
      else if (avg > 12) bars = ' ▂▃▅';
      else if (avg > 6) bars = ' ▂▃';
      else if (avg > 2) bars = ' ▂';

      screenAudioMeter.textContent = `[ ${bars} ]`;
      screenAudioMeter.style.color = avg > 2 ? '#23a55a' : '#949ba4';
    }, 100);
  } catch (e) {
    console.warn('Screen VU meter error:', e);
  }
}

function updateScreenSoundButtonState() {
  if (!btnToggleScreenSound) return;
  let isMuted = false;
  if (!currentViewedStreamId) {
    isMuted = true;
  } else {
    const streamData = activeStreams.get(currentViewedStreamId);
    if (streamData && streamData.isLocal) {
      isMuted = sharedScreenVideo.muted;
    } else if (currentViewedStreamId) {
      isMuted = webrtc.isPeerScreenAudioMuted(currentViewedStreamId);
    }
  }

  btnToggleScreenSound.title = isMuted ? "Ativar som da tela" : "Silenciar som da tela";
  btnToggleScreenSound.innerHTML = isMuted
    ? `<i data-lucide="volume-x" style="width: 16px; height: 16px; color: #ed4245;"></i>`
    : `<i data-lucide="volume-2" style="width: 16px; height: 16px; color: #23a55a;"></i>`;
  if (window.lucide) window.lucide.createIcons();
}

if (btnToggleScreenSound) {
  btnToggleScreenSound.addEventListener('click', () => {
    if (!currentViewedStreamId) return;

    const streamData = activeStreams.get(currentViewedStreamId);
    if (!streamData) return;

    const hasAudio = streamData.stream && streamData.stream.getAudioTracks && streamData.stream.getAudioTracks().length > 0;
    if (!hasAudio && !streamData.isLocal) {
      showSoundToast('ℹ️ Esta transmissão não possui áudio do sistema.');
      return;
    }

    if (streamData.isLocal) {
      sharedScreenVideo.muted = !sharedScreenVideo.muted;
      updateScreenSoundButtonState();
      showSoundToast(sharedScreenVideo.muted ? '🔇 Preview do som desativado' : '🔊 Ouvindo preview do som no fone!');
    } else {
      const isMuted = webrtc.togglePeerScreenAudio(currentViewedStreamId);
      const config = getUserConfig(currentViewedStreamId);
      config.sfxMuted = isMuted;
      updateScreenSoundButtonState();
      showSoundToast(isMuted ? '🔇 Som da transmissão silenciado' : '🔊 Som da transmissão ativado!');
    }
  });
}

function viewStream(id) {
  const streamData = activeStreams.get(id);
  if (!streamData) return;

  currentViewedStreamId = id;
  sharedScreenVideo.srcObject = streamData.stream;
  const config = getUserConfig(id);
  sharedScreenVideo.style.display = config.videoDisabled ? 'none' : 'block';

  // sharedScreenVideo fica sempre muted por padrão:
  // O áudio da transmissão remota é reproduzido nativamente pelo WebRTC Manager
  // evitando duplicidade/eco e funcionando mesmo ao trocar de canais.
  sharedScreenVideo.muted = true;

  updateScreenSoundButtonState();

  const playPromise = sharedScreenVideo.play();
  if (playPromise !== undefined) {
    playPromise.catch(e => {
      console.warn('Video play blocked:', e);
    });
  }

  screenSharerName.textContent = streamData.name;
  const liveIndicatorEl = mainScreenTile.querySelector('.live-indicator');
  if (liveIndicatorEl) {
    liveIndicatorEl.textContent = 'AO VIVO 1080p60 • 🔊 COM SOM';
  }

  updateScreenAudioMeter(streamData.stream);

  mainScreenTile.style.display = 'flex';
  videoStage.style.display = 'flex';
  messagesContainer.style.display = 'none';
  document.querySelector('.chat-input-wrapper').style.display = 'none';

  renderStreamSwitcherBar();
  renderVoiceStageCards();
  renderVoiceChannelUsers();
}

function renderStreamSwitcherBar() {
  if (!streamSwitcherBar) return;

  if (activeStreams.size >= 2) {
    streamSwitcherBar.style.display = 'flex';
    streamSwitcherBar.innerHTML = '';

    const label = document.createElement('span');
    label.style.color = '#949ba4';
    label.style.fontSize = '12px';
    label.style.fontWeight = '700';
    label.style.textTransform = 'uppercase';
    label.style.marginRight = '8px';
    label.textContent = 'Transmissões HD:';
    streamSwitcherBar.appendChild(label);

    activeStreams.forEach(streamItem => {
      const pill = document.createElement('button');
      pill.className = `stream-switcher-pill ${streamItem.id === currentViewedStreamId ? 'active' : ''}`;
      pill.innerHTML = `
        <img src="${streamItem.avatar}" alt="${streamItem.name}">
        <span>🔴 ${escapeHtml(streamItem.name)}</span>
      `;
      pill.onclick = () => viewStream(streamItem.id);
      if (!streamItem.isLocal) {
        pill.oncontextmenu = (e) => openContextMenu(e, streamItem.id, streamItem.name);
      }
      streamSwitcherBar.appendChild(pill);
    });
  } else {
    streamSwitcherBar.style.display = 'none';
  }
}

// ==========================================
// LOGIN & SOCKET INITIALIZATION
// ==========================================
let pendingLoginName = '';

function showLoginAlert(msg, isError = true) {
  if (!loginAuthAlert) return;
  loginAuthAlert.textContent = msg;
  loginAuthAlert.style.display = 'block';
  loginAuthAlert.style.borderColor = isError ? '#ed4245' : '#23a55a';
  loginAuthAlert.style.color = isError ? '#f38688' : '#57f287';
  loginAuthAlert.style.background = isError ? 'rgba(237, 66, 69, 0.1)' : 'rgba(35, 165, 90, 0.1)';
}

function hideLoginAlert() {
  if (loginAuthAlert) {
    loginAuthAlert.style.display = 'none';
  }
}

function enterServer(name) {
  const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`;
  currentUser = { name, avatar };

  // Memoriza o usuário nesta máquina para pular o login nas próximas visitas
  localStorage.setItem('gamezeda_saved_username', name);

  myAvatarImg.src = avatar;
  myUsernameEl.textContent = name;
  cardMyAvatar.src = avatar;
  cardMyName.textContent = `${name} (Você)`;
  if (popoverAvatar) popoverAvatar.src = avatar;
  if (popoverName) popoverName.textContent = name;

  socket.emit('join:server', { name, deviceId: localDeviceId });
  loginModal.style.display = 'none';
  sounds.playJoin();
}

let isAutoLoginAttempt = false;
let hasAttemptedAutoLogin = false;

function tryAutoLogin() {
  if (hasAttemptedAutoLogin || currentUser) return;
  const savedName = (localStorage.getItem('gamezeda_saved_username') || '').trim();
  if (!savedName) {
    if (loginModal) loginModal.style.display = 'flex';
    return;
  }

  hasAttemptedAutoLogin = true;
  if (loginModal) loginModal.style.display = 'none';
  pendingLoginName = savedName;
  isAutoLoginAttempt = true;

  socket.emit('auth:check-user', { name: savedName, deviceId: localDeviceId });
}

socket.on('connect', () => {
  if (currentUser) {
    socket.emit('join:server', { name: currentUser.name, deviceId: localDeviceId });
  } else {
    tryAutoLogin();
  }
});

if (socket.connected) {
  if (currentUser) {
    socket.emit('join:server', { name: currentUser.name, deviceId: localDeviceId });
  } else {
    tryAutoLogin();
  }
}

usernameInput.addEventListener('input', (e) => {
  const val = e.target.value.trim();
  avatarPreview.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(val || 'Gamezeda')}`;
  hideLoginAlert();
});

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = usernameInput.value.trim();
  if (!name) return;

  hideLoginAlert();
  pendingLoginName = name;
  if (btnLoginSubmit) {
    btnLoginSubmit.disabled = true;
    btnLoginSubmit.textContent = 'Verificando...';
  }

  socket.emit('auth:check-user', { name, deviceId: localDeviceId });
});

socket.on('auth:check-result', ({ status, message, hasPassword }) => {
  if (btnLoginSubmit) {
    btnLoginSubmit.disabled = false;
    btnLoginSubmit.textContent = 'Entrar no Servidor';
  }

  if (status === 'ALLOWED') {
    isAutoLoginAttempt = false;
    enterServer(pendingLoginName);
  } else if (status === 'PASSWORD_REQUIRED') {
    isAutoLoginAttempt = false;
    if (usernameInput) usernameInput.value = pendingLoginName;
    if (avatarPreview) avatarPreview.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(pendingLoginName)}`;
    if (loginStepUsername) loginStepUsername.style.display = 'none';
    if (loginStepPassword) loginStepPassword.style.display = 'block';
    if (loginPasswordInput) {
      loginPasswordInput.value = '';
      loginPasswordInput.focus();
    }
    if (loginModal) loginModal.style.display = 'flex';
    showLoginAlert(message || 'Este nick possui cadastro com senha. Digite sua senha para entrar neste computador:', false);
  } else if (status === 'NAME_IN_USE') {
    if (isAutoLoginAttempt && usernameInput) {
      usernameInput.value = pendingLoginName;
    }
    isAutoLoginAttempt = false;
    if (loginModal) loginModal.style.display = 'flex';
    showLoginAlert(message || 'Já existe alguém conectado com este nome no servidor no momento.', true);
  } else {
    isAutoLoginAttempt = false;
    if (loginModal) loginModal.style.display = 'flex';
    showLoginAlert(message || 'Erro ao validar cadastro. Tente novamente.', true);
  }
});

if (btnLoginConfirmPassword) {
  btnLoginConfirmPassword.addEventListener('click', () => {
    const password = loginPasswordInput ? loginPasswordInput.value : '';
    if (!password) {
      showLoginAlert('Por favor, digite a sua senha.', true);
      return;
    }

    btnLoginConfirmPassword.disabled = true;
    btnLoginConfirmPassword.textContent = 'Autenticando...';
    socket.emit('auth:verify-password', {
      name: pendingLoginName,
      password,
      deviceId: localDeviceId
    });
  });
}

if (loginPasswordInput) {
  loginPasswordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (btnLoginConfirmPassword) btnLoginConfirmPassword.click();
    }
  });
}

if (btnLoginBackUsername) {
  btnLoginBackUsername.addEventListener('click', () => {
    if (loginStepPassword) loginStepPassword.style.display = 'none';
    if (loginStepUsername) loginStepUsername.style.display = 'block';
    if (loginPasswordInput) loginPasswordInput.value = '';
    hideLoginAlert();
    usernameInput.focus();
  });
}

socket.on('auth:verify-result', ({ success, message }) => {
  if (btnLoginConfirmPassword) {
    btnLoginConfirmPassword.disabled = false;
    btnLoginConfirmPassword.textContent = 'Confirmar Senha e Entrar';
  }

  if (success) {
    enterServer(pendingLoginName);
  } else {
    showLoginAlert(message || 'Senha incorreta. Verifique e tente novamente.', true);
    if (loginPasswordInput) loginPasswordInput.focus();
  }
});

socket.on('init:state', (data) => {
  if (data.chatMessages) {
    Object.assign(channelMessagesStore, data.chatMessages);
  }
  allOnlineUsers = data.onlineUsers || [];
  allVoiceUsers = data.voiceUsers || [];
  allVoiceRoomsState = data.voiceRooms || { 'gamezeda': allVoiceUsers };
  if (data.categories && data.categories.length > 0) {
    allCategories = data.categories;
  }
  if (data.channels && data.channels.length > 0) {
    allChannels = data.channels;
  }
  renderSidebarChannels();
  renderMembersSidebar();
  renderVoiceStageCards();
  renderCurrentChannelMessages();
});

socket.on('members:update', (usersList) => {
  allOnlineUsers = usersList;
  if (!inVoice && currentUser) {
    const myId = socket ? socket.id : null;
    const myName = currentUser.name.toLowerCase();
    allOnlineUsers.forEach(u => {
      if ((myId && u.id === myId) || (u.name && u.name.toLowerCase() === myName)) {
        u.inVoice = false;
        u.currentVoiceRoom = null;
      }
    });
  }
  renderMembersSidebar();
});

socket.on('voice:update', (data = {}) => {
  if (data.rooms) {
    allVoiceRoomsState = data.rooms;
  }
  allVoiceUsers = data.users || (currentVoiceChannelId && allVoiceRoomsState[currentVoiceChannelId]) || [];

  if (!inVoice) {
    const myId = socket ? socket.id : null;
    const myName = currentUser ? currentUser.name.toLowerCase() : null;
    for (const rId in allVoiceRoomsState) {
      if (Array.isArray(allVoiceRoomsState[rId])) {
        allVoiceRoomsState[rId] = allVoiceRoomsState[rId].filter(u => {
          if (myId && u.id === myId) return false;
          if (myName && u.name && u.name.toLowerCase() === myName) return false;
          return true;
        });
      }
    }
    allVoiceUsers = allVoiceUsers.filter(u => {
      if (myId && u.id === myId) return false;
      if (myName && u.name && u.name.toLowerCase() === myName) return false;
      return true;
    });
  }

  renderSidebarChannels();
  renderVoiceStageCards();
  renderMembersSidebar();
});

socket.on('channel:created', (newChannel) => {
  const existingIdx = allChannels.findIndex(c => c.id === newChannel.id);
  if (existingIdx >= 0) allChannels[existingIdx] = newChannel;
  else allChannels.push(newChannel);
  renderSidebarChannels();
});

socket.on('channel:deleted', ({ channelId }) => {
  allChannels = allChannels.filter(c => c.id !== channelId);
  delete channelMessagesStore[channelId];

  if (currentTextChannel === channelId) {
    switchTextChannel('geral');
  }
  if (currentVoiceChannelId === channelId) {
    leaveVoice(true);
    showSoundToast('O canal de voz foi excluído.');
  }

  renderSidebarChannels();
});

socket.on('category:created', (newCat) => {
  const existingIdx = allCategories.findIndex(c => c.id === newCat.id);
  if (existingIdx >= 0) allCategories[existingIdx] = newCat;
  else allCategories.push(newCat);
  renderSidebarChannels();
});

socket.on('category:deleted', ({ categoryId }) => {
  allCategories = allCategories.filter(c => c.id !== categoryId);
  allChannels.forEach(ch => {
    if (ch.categoryId === categoryId) ch.categoryId = 'cat-text';
  });
  renderSidebarChannels();
});

socket.on('voice:channel-deleted', ({ channelId }) => {
  if (currentVoiceChannelId === channelId) {
    leaveVoice(true);
    showSoundToast('O canal de voz em que você estava foi excluído.');
  }
});

socket.on('chat:channel-history', ({ channelId, messages }) => {
  channelMessagesStore[channelId] = messages;
  if (channelId === currentTextChannel) {
    renderCurrentChannelMessages();
  }
});

socket.on('voice:peer-speaking', ({ peerId, isSpeaking }) => {
  const card = document.getElementById(`voice-card-${peerId}`);
  if (card) card.classList.toggle('speaking', isSpeaking);
  const pill = document.querySelector(`.voice-user-pill[data-user-id="${peerId}"]`);
  if (pill) pill.classList.toggle('speaking', isSpeaking);
});

socket.on('voice:peer-screen-status', ({ peerId, isSharing }) => {
  if (!isSharing) unregisterStream(peerId);
});

socket.on('session:replaced', ({ message }) => {
  if (inVoice) {
    leaveVoice();
  }
  currentUser = null;
  localStorage.removeItem('gamezeda_saved_username');
  regenerateDeviceId();
  if (loginStepPassword) loginStepPassword.style.display = 'none';
  if (loginStepUsername) loginStepUsername.style.display = 'block';
  if (loginModal) loginModal.style.display = 'flex';
  showLoginAlert(message || 'Você foi desconectado pois sua conta entrou em outro local.', true);
});

// ==========================================
// RENDERIZAÇÃO DE MEMBROS
// ==========================================
function renderMembersSidebar() {
  if (!membersListContent) return;
  membersListContent.innerHTML = '';

  const seenMemberNames = new Set();
  const voiceMembers = [];
  const otherMembers = [];

  allOnlineUsers.forEach(user => {
    const lower = (user.name || '').toLowerCase();
    if (seenMemberNames.has(lower)) return;
    seenMemberNames.add(lower);

    if (user.inVoice) voiceMembers.push(user);
    else otherMembers.push(user);
  });

  if (voiceMembers.length > 0) {
    const catVoice = document.createElement('div');
    catVoice.className = 'member-category';
    catVoice.textContent = `EM VOZ — ${voiceMembers.length}`;
    membersListContent.appendChild(catVoice);

    voiceMembers.forEach(user => {
      membersListContent.appendChild(createMemberItem(user, true));
    });
  }

  const catOnline = document.createElement('div');
  catOnline.className = 'member-category';
  catOnline.style.marginTop = '12px';
  catOnline.textContent = `ONLINE — ${otherMembers.length}`;
  membersListContent.appendChild(catOnline);

  otherMembers.forEach(user => {
    membersListContent.appendChild(createMemberItem(user, false));
  });
}

function createMemberItem(user, isVoice) {
  const div = document.createElement('div');
  div.className = 'member-item';
  div.setAttribute('data-member-id', user.id);

  div.innerHTML = `
    <div class="member-avatar-wrap">
      <img class="member-avatar" src="${user.avatar}" alt="${user.name}">
      <div class="status-dot"></div>
    </div>
    <div class="member-info">
      <span class="member-name">${escapeHtml(user.name)}${user.id === socket.id ? ' (Você)' : ''}</span>
      <span class="member-activity" style="${isVoice ? 'color: #23a55a;' : ''}">
        ${isVoice ? '🔊 Em voz' : 'Online'}
      </span>
    </div>
  `;

  if (user.id !== socket.id) {
    div.addEventListener('contextmenu', (e) => openContextMenu(e, user.id, user.name));
  }
  return div;
}

// ==========================================
// RENDERIZAÇÃO DINÂMICA DE CANAIS & CATEGORIAS (ESTILO DISCORD)
// ==========================================
function renderSidebarChannels() {
  if (!channelsScrollContainer) return;
  channelsScrollContainer.innerHTML = '';

  allCategories.forEach(category => {
    const isCollapsed = collapsedCategories.has(category.id);
    const catChannels = allChannels.filter(c => c.categoryId === category.id);

    // Cabeçalho da Categoria
    const catHeader = document.createElement('div');
    catHeader.className = `channel-category ${isCollapsed ? 'collapsed' : ''}`;
    catHeader.setAttribute('data-category-id', category.id);

    const isCoreCategory = category.id === 'cat-text' || category.id === 'cat-voice';

    catHeader.innerHTML = `
      <div class="category-header-left">
        <i data-lucide="chevron-down" class="category-chevron"></i>
        <span>${escapeHtml(category.name)}</span>
      </div>
      <div class="category-actions">
        <button type="button" class="btn-cat-action btn-add-channel-cat" title="Criar Canal" data-cat-id="${category.id}">
          <i data-lucide="plus" style="width: 14px; height: 14px;"></i>
        </button>
        ${!isCoreCategory ? `
          <button type="button" class="btn-cat-action btn-delete-cat" title="Excluir Categoria" data-cat-id="${category.id}" data-cat-name="${escapeHtml(category.name)}">
            <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>
          </button>
        ` : ''}
      </div>
    `;

    // Toggle de colapso
    catHeader.addEventListener('click', (e) => {
      if (e.target.closest('.category-actions')) return;
      if (collapsedCategories.has(category.id)) {
        collapsedCategories.delete(category.id);
      } else {
        collapsedCategories.add(category.id);
      }
      localStorage.setItem('discord_collapsed_cats', JSON.stringify(Array.from(collapsedCategories)));
      renderSidebarChannels();
    });

    // Botão "+" na categoria
    const btnAddCh = catHeader.querySelector('.btn-add-channel-cat');
    if (btnAddCh) {
      btnAddCh.addEventListener('click', (e) => {
        e.stopPropagation();
        openCreateChannelModal(category.id);
      });
    }

    // Botão de exclusão da categoria
    const btnDelCat = catHeader.querySelector('.btn-delete-cat');
    if (btnDelCat) {
      btnDelCat.addEventListener('click', (e) => {
        e.stopPropagation();
        openDeleteModal('category', category.id, category.name);
      });
    }

    channelsScrollContainer.appendChild(catHeader);

    // Se a categoria estiver recolhida, não exibe os canais filhos
    if (isCollapsed) return;

    // Canais da categoria
    catChannels.forEach(channel => {
      const isVoice = channel.type === 'voice';

      if (!isVoice) {
        // Canal de Texto
        const item = document.createElement('div');
        item.className = `channel-item ${currentTextChannel === channel.id ? 'active' : ''}`;
        item.setAttribute('data-channel', channel.id);

        item.innerHTML = `
          <div class="channel-item-left">
            <span class="channel-icon">#</span>
            <span class="channel-item-name">${escapeHtml(channel.name)}</span>
          </div>
          <div class="channel-item-actions">
            ${channel.id !== 'geral' ? `
              <button type="button" class="btn-channel-delete" title="Excluir Canal" data-channel-id="${channel.id}" data-channel-name="${escapeHtml(channel.name)}">
                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
              </button>
            ` : ''}
          </div>
        `;

        item.addEventListener('click', (e) => {
          if (e.target.closest('.btn-channel-delete')) return;
          switchTextChannel(channel.id);
        });

        const btnDel = item.querySelector('.btn-channel-delete');
        if (btnDel) {
          btnDel.addEventListener('click', (e) => {
            e.stopPropagation();
            openDeleteModal('channel', channel.id, channel.name);
          });
        }

        channelsScrollContainer.appendChild(item);
      } else {
        // Canal de Voz
        const isCurrentVoiceRoom = inVoice && currentVoiceChannelId === channel.id;
        const voiceUsers = (allVoiceRoomsState && allVoiceRoomsState[channel.id]) || [];

        const item = document.createElement('div');
        item.className = `channel-item ${isCurrentVoiceRoom ? 'active' : ''}`;
        item.setAttribute('data-voice', channel.id);
        if (isCurrentVoiceRoom) {
          item.style.fontWeight = '700';
          item.style.color = '#fff';
        }

        item.innerHTML = `
          <div class="channel-item-left">
            <i data-lucide="volume-2" class="channel-icon" style="color: ${isCurrentVoiceRoom ? '#23a55a' : '#949ba4'};"></i>
            <span class="channel-item-name">${escapeHtml(channel.name)}</span>
          </div>
          <div class="channel-voice-meta" style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 11px; color: ${isCurrentVoiceRoom ? '#23a55a' : '#949ba4'}; font-family: monospace;">
              ${isCurrentVoiceRoom ? 'Conectado' : (voiceUsers.length > 0 ? `${voiceUsers.length} online` : 'Conectar')}
            </span>
            <div class="channel-item-actions">
              ${channel.id !== 'gamezeda' ? `
                <button type="button" class="btn-channel-delete" title="Excluir Canal de Voz" data-channel-id="${channel.id}" data-channel-name="${escapeHtml(channel.name)}">
                  <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                </button>
              ` : ''}
            </div>
          </div>
        `;

        item.addEventListener('click', (e) => {
          if (e.target.closest('.btn-channel-delete')) return;
          connectToVoiceChannel(channel.id, channel.name);
        });

        const btnDel = item.querySelector('.btn-channel-delete');
        if (btnDel) {
          btnDel.addEventListener('click', (e) => {
            e.stopPropagation();
            openDeleteModal('channel', channel.id, channel.name);
          });
        }

        channelsScrollContainer.appendChild(item);

        // Lista de participantes conectados nesta sala de voz
        if (voiceUsers.length > 0) {
          const usersListEl = document.createElement('div');
          usersListEl.className = 'voice-users-list';
          usersListEl.id = `voice-users-${channel.id}`;

          voiceUsers.forEach(user => {
            const isLocal = user.id === socket.id;
            const streamKey = isLocal ? 'local' : user.id;
            const isSharing = user.isScreenSharing || activeStreams.has(streamKey);

            const pill = document.createElement('div');
            pill.className = 'voice-user-pill';
            pill.setAttribute('data-user-id', user.id);
            pill.innerHTML = `
              <img src="${user.avatar}" alt="${user.name}">
              <span class="pill-name" style="flex: 1;">${escapeHtml(user.name)}${isLocal ? ' (Você)' : ''}</span>
              ${isSharing ? '<span class="live-indicator" style="font-size: 10px; margin-left: 6px; padding: 2px 5px; cursor: pointer;">🔴 AO VIVO</span>' : ''}
            `;

            pill.addEventListener('click', (e) => {
              e.stopPropagation();
              if (activeStreams.has(streamKey)) {
                viewStream(streamKey);
              } else {
                connectToVoiceChannel(channel.id, channel.name);
              }
            });

            if (!isLocal) {
              pill.addEventListener('contextmenu', (e) => openContextMenu(e, user.id, user.name));
            }

            usersListEl.appendChild(pill);
          });

          channelsScrollContainer.appendChild(usersListEl);
        }
      }
    });
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function renderVoiceStageCards() {
  if (!dynamicVoiceCards) return;
  dynamicVoiceCards.innerHTML = '';

  if (cardLocalUser) {
    const hasLocalStream = activeStreams.has('local');
    cardLocalUser.classList.toggle('has-stream', hasLocalStream);
    cardLocalUser.onclick = () => {
      if (activeStreams.has('local')) viewStream('local');
    };
  }

  // Participantes da sala de voz em que estamos
  const currentRoomUsers = currentVoiceChannelId && allVoiceRoomsState[currentVoiceChannelId]
    ? allVoiceRoomsState[currentVoiceChannelId]
    : allVoiceUsers;

  const otherVoiceUsers = currentRoomUsers.filter(u => u.id !== socket.id);
  otherVoiceUsers.forEach(user => {
    const hasStream = activeStreams.has(user.id);
    const card = document.createElement('div');
    card.className = `user-voice-card ${hasStream ? 'has-stream' : ''}`;
    card.id = `voice-card-${user.id}`;
    card.innerHTML = `
      <img src="${user.avatar}" alt="${user.name}">
      <div class="card-name">${escapeHtml(user.name)}</div>
    `;

    card.addEventListener('click', () => {
      if (activeStreams.has(user.id)) viewStream(user.id);
    });

    card.addEventListener('contextmenu', (e) => openContextMenu(e, user.id, user.name));
    dynamicVoiceCards.appendChild(card);
  });
}

function switchTextChannel(chName) {
  currentTextChannel = chName;

  document.querySelectorAll('[data-channel]').forEach(c => {
    c.classList.toggle('active', c.getAttribute('data-channel') === chName);
  });
  document.querySelectorAll('[data-voice]').forEach(c => {
    c.classList.remove('active');
  });

  currentChannelNameEl.textContent = chName;
  chatInput.placeholder = `Conversar em #${chName}`;

  if (videoStage.style.display === 'flex') {
    videoStage.style.display = 'none';
    messagesContainer.style.display = 'flex';
    document.querySelector('.chat-input-wrapper').style.display = 'block';
  }

  if (!channelMessagesStore[chName]) {
    socket.emit('chat:get-channel', { channelId: chName });
  }

  renderCurrentChannelMessages();
}

function renderCurrentChannelMessages(filterText = '') {
  messagesContainer.innerHTML = '';
  let messages = channelMessagesStore[currentTextChannel] || [];

  if (filterText) {
    const query = filterText.toLowerCase();
    messages = messages.filter(m => (m.text && m.text.toLowerCase().includes(query)) || (m.sender && m.sender.toLowerCase().includes(query)));
  }

  if (messages.length === 0) {
    const emptyBanner = document.createElement('div');
    emptyBanner.style.padding = '32px 16px';
    emptyBanner.innerHTML = `
      <div style="width: 64px; height: 64px; border-radius: 50%; background: #404249; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 700; color: #fff; margin-bottom: 12px;">#</div>
      <h2 style="color: #fff; font-size: 28px; font-weight: 700; margin-bottom: 8px;">Bem-vindo a #${currentTextChannel}!</h2>
      <p style="color: #949ba4; font-size: 14px;">Este é o início do canal #${currentTextChannel}. Envie a primeira mensagem!</p>
    `;
    messagesContainer.appendChild(emptyBanner);
    return;
  }

  messages.forEach(msg => appendMessageToContainer(msg));
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  socket.emit('chat:send', {
    channelId: currentTextChannel,
    text: text
  });

  chatInput.value = '';
});

socket.on('chat:new-message', ({ channelId, message }) => {
  if (!channelMessagesStore[channelId]) {
    channelMessagesStore[channelId] = [];
  }
  channelMessagesStore[channelId].push(message);

  if (channelId === currentTextChannel) {
    appendMessageToContainer(message);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    if (message.sender !== (currentUser && currentUser.name)) {
      sounds.playMessage();
    }
  } else {
    const chEl = document.querySelector(`[data-channel="${channelId}"]`);
    if (chEl) chEl.style.fontWeight = '700';
  }
});

function appendMessageToContainer(msg) {
  if (msg.isSystem) {
    const sysDiv = document.createElement('div');
    sysDiv.className = 'system-message';
    sysDiv.innerHTML = `
      <span style="color: #23a55a; margin-right: 8px;">➜</span>
      <span>${escapeHtml(msg.text)} <span style="font-size: 11px; opacity: 0.6;">${msg.timestamp}</span></span>
    `;
    messagesContainer.appendChild(sysDiv);
    return;
  }

  const div = document.createElement('div');
  div.className = 'message-item';

  let attachmentHtml = '';
  if (msg.attachmentUrl) {
    const isImg = /\.(png|jpe?g|gif|webp|svg)$/i.test(msg.attachmentUrl);
    const isAudio = /\.(mp3|wav|ogg|m4a)$/i.test(msg.attachmentUrl);
    if (isImg) {
      attachmentHtml = `<div class="message-attachment"><img src="${msg.attachmentUrl}" alt="Anexo" loading="lazy"></div>`;
    } else if (isAudio) {
      attachmentHtml = `<div class="message-attachment"><audio controls src="${msg.attachmentUrl}"></audio></div>`;
    } else {
      attachmentHtml = `<div class="message-attachment"><a href="${msg.attachmentUrl}" target="_blank" style="color: #5865F2; text-decoration: underline;">📁 Baixar Anexo</a></div>`;
    }
  }

  div.innerHTML = `
    <img class="message-avatar" src="${msg.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(msg.sender)}" alt="${msg.sender}">
    <div class="message-content">
      <div class="message-header">
        <span class="message-author" style="color: #5865F2;">${escapeHtml(msg.sender)}</span>
        <span class="message-time">${msg.timestamp}</span>
      </div>
      <div class="message-text">${escapeHtml(msg.text)}</div>
      ${attachmentHtml}
    </div>
  `;
  messagesContainer.appendChild(div);
}

// Upload de anexo de arquivo no chat
btnAttachFile.addEventListener('click', () => chatFileInput.click());
chatFileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/chat-file', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      socket.emit('chat:send', {
        channelId: currentTextChannel,
        text: `Enviou um arquivo: ${file.name}`,
        attachmentUrl: data.url
      });
    }
  } catch (err) {
    alert('Erro ao enviar arquivo.');
  }
  chatFileInput.value = '';
});

// Busca no Chat
chatSearchInput.addEventListener('input', (e) => {
  renderCurrentChannelMessages(e.target.value.trim());
});

// Toggle da barra lateral de membros
btnToggleMembersSidebar.addEventListener('click', () => {
  if (membersSidebar) {
    const isHidden = membersSidebar.style.display === 'none';
    membersSidebar.style.display = isHidden ? 'flex' : 'none';
  }
});

// Emoji trigger
btnEmojiTrigger.addEventListener('click', () => {
  const emojis = ['😀', '😂', '🔥', '🎉', '👍', '🎮', '💀', '💩'];
  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
  chatInput.value += ` ${randomEmoji} `;
  chatInput.focus();
});

// ==========================================
// CONEXÃO DE VOZ & TELA HD (MULTI-SALA)
// ==========================================
async function connectToVoiceChannel(roomId = 'gamezeda', roomName = 'Gamezeda') {
  if (inVoice && currentVoiceChannelId === roomId) {
    videoStage.style.display = 'flex';
    messagesContainer.style.display = 'none';
    const wrapper = document.querySelector('.chat-input-wrapper');
    if (wrapper) wrapper.style.display = 'none';

    // Destaque visual: marca o canal de voz como ativo e remove dos canais de texto
    document.querySelectorAll('[data-channel]').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('[data-voice]').forEach(c => {
      c.classList.toggle('active', c.getAttribute('data-voice') === roomId);
    });
    return;
  }

  if (inVoice) {
    leaveVoice(false);
  }

  currentVoiceChannelId = roomId;
  currentVoiceChannelName = roomName;
  inVoice = true;

  isMuted = false;
  btnToggleMic.classList.remove('active-muted');
  btnStageMic.classList.remove('active-muted');

  // Atualização visual imediata
  voiceStatusBox.style.display = 'flex';
  const voiceSubEl = voiceStatusBox.querySelector('.voice-status-sub');
  if (voiceSubEl) {
    voiceSubEl.textContent = `${roomName} / Jogos Bolados`;
  }

  videoStage.style.display = 'flex';
  messagesContainer.style.display = 'none';
  const wrapper = document.querySelector('.chat-input-wrapper');
  if (wrapper) wrapper.style.display = 'none';
  myUserStatusEl.textContent = '🔊 Em voz';

  // Atualiza classe active nos canais
  document.querySelectorAll('[data-channel]').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('[data-voice]').forEach(c => {
    c.classList.toggle('active', c.getAttribute('data-voice') === roomId);
  });

  // Atualização otimista imediata na lista de participantes para feedback instantâneo no 1º clique
  if (currentUser) {
    if (!allVoiceRoomsState[roomId]) allVoiceRoomsState[roomId] = [];
    const myId = socket ? socket.id : null;
    const exists = allVoiceRoomsState[roomId].some(u => (myId && u.id === myId) || (u.name && u.name.toLowerCase() === currentUser.name.toLowerCase()));
    if (!exists) {
      allVoiceRoomsState[roomId].push({
        id: myId || 'me',
        name: currentUser.name,
        avatar: currentUser.avatar,
        inVoice: true,
        currentVoiceRoom: roomId
      });
    }
  }

  renderSidebarChannels();
  renderVoiceStageCards();

  // Emite entrada no socket IMEDIATAMENTE (sem esperar microfone)
  socket.emit('voice:join', { roomId });

  webrtc.ensureAudioContext();
  sounds.playJoin();

  // Conecta o microfone em paralelo sem travar a interface nem exigir segundo clique
  webrtc.startAudio().catch(err => {
    console.warn('[WebRTC] Aviso ao inicializar áudio:', err);
  });
}

function leaveVoice(playAudio = true) {
  if (playAudio && inVoice) sounds.playLeave();
  if (webrtc) webrtc.leaveVoice();

  inVoice = false;
  isScreenSharing = false;
  currentVoiceChannelId = null;

  unregisterStream('local');

  if (voiceStatusBox) voiceStatusBox.style.display = 'none';
  if (videoStage) videoStage.style.display = 'none';
  if (messagesContainer) messagesContainer.style.display = 'flex';
  const wrapper = document.querySelector('.chat-input-wrapper');
  if (wrapper) wrapper.style.display = 'block';

  if (btnStageScreen) btnStageScreen.classList.remove('active-stream');
  if (btnStageScreenText) btnStageScreenText.textContent = 'Compartilhar Tela HD';

  if (myUserStatusEl) myUserStatusEl.textContent = 'Online';

  // 1. Remove imediatamente o usuário local de todas as salas de voz no estado do cliente
  const myId = socket ? socket.id : null;
  const myName = currentUser ? currentUser.name.toLowerCase() : null;

  for (const roomId in allVoiceRoomsState) {
    if (Array.isArray(allVoiceRoomsState[roomId])) {
      allVoiceRoomsState[roomId] = allVoiceRoomsState[roomId].filter(u => {
        if (myId && u.id === myId) return false;
        if (myName && u.name && u.name.toLowerCase() === myName) return false;
        return true;
      });
    }
  }

  allVoiceUsers = allVoiceUsers.filter(u => {
    if (myId && u.id === myId) return false;
    if (myName && u.name && u.name.toLowerCase() === myName) return false;
    return true;
  });

  // 2. Atualiza imediatamente o status do usuário local na lista de membros (barra da direita)
  if (currentUser) {
    allOnlineUsers.forEach(u => {
      if ((myId && u.id === myId) || (myName && u.name && u.name.toLowerCase() === myName)) {
        u.inVoice = false;
        u.currentVoiceRoom = null;
      }
    });
  }

  // 3. Notifica o servidor
  if (socket && socket.connected) {
    socket.emit('voice:leave');
  }

  // 4. Re-renderiza IMEDIATAMENTE a interface completa (canais, membros, cards)
  renderSidebarChannels();
  renderMembersSidebar();
  renderVoiceStageCards();
}

quickDisconnectBtn.addEventListener('click', () => leaveVoice(true));
btnStageDisconnect.addEventListener('click', () => leaveVoice(true));

// Compartilhar Tela em HD
async function toggleScreenShare(forceVideoOnly = false) {
  if (!inVoice) {
    const firstVoice = allChannels.find(c => c.type === 'voice') || { id: 'gamezeda', name: 'Gamezeda' };
    await connectToVoiceChannel(firstVoice.id, firstVoice.name);
  }

  if (isScreenSharing) {
    webrtc.stopScreenShare();
    unregisterStream('local');
    isScreenSharing = false;
    btnStageScreen.classList.remove('active-stream');
    btnStageScreenText.textContent = 'Compartilhar Tela HD';
  } else {
    try {
      const stream = await webrtc.startScreenShare(forceVideoOnly);
      if (stream) {
        isScreenSharing = true;
        registerStream('local', stream, `${currentUser ? currentUser.name : 'Você'} (Sua Tela HD)`, currentUser ? currentUser.avatar : '', true);
        btnStageScreen.classList.add('active-stream');
        btnStageScreenText.textContent = 'Parar Tela';
        const hasAudio = stream.getAudioTracks && stream.getAudioTracks().length > 0;
        if (hasAudio) {
          showSoundToast('🔊 Transmitindo tela com som do sistema!');
        } else {
          showSoundToast('📺 Transmitindo tela em HD (1080p60fps)!');
        }
      }
    } catch (err) {
      console.error('Erro em toggleScreenShare:', err);
      if (err.isAudioDriverBlock || err.name === 'AudioDriverBlockedError') {
        showAudioDriverFallbackModal();
      } else if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
        console.log('Compartilhamento cancelado pelo usuário.');
      } else {
        showSoundToast('❌ Falha ao iniciar transmissão: ' + (err.message || 'Erro'));
      }
    }
  }
}

quickScreenShareBtn.addEventListener('click', () => toggleScreenShare(false));
btnStageScreen.addEventListener('click', () => toggleScreenShare(false));
btnStopScreenTile.addEventListener('click', () => toggleScreenShare(false));

const audioFallbackModal = document.getElementById('audio-fallback-modal');
const btnFallbackShareScreen = document.getElementById('btn-fallback-share-screen');
const btnCloseAudioFallback = document.getElementById('btn-close-audio-fallback');

function showAudioDriverFallbackModal() {
  if (audioFallbackModal) {
    audioFallbackModal.style.display = 'flex';
  }
}

function closeAudioDriverFallbackModal() {
  if (audioFallbackModal) {
    audioFallbackModal.style.display = 'none';
  }
}

if (btnFallbackShareScreen) {
  btnFallbackShareScreen.addEventListener('click', () => {
    closeAudioDriverFallbackModal();
    toggleScreenShare(true);
  });
}

if (btnCloseAudioFallback) {
  btnCloseAudioFallback.addEventListener('click', closeAudioDriverFallbackModal);
}

btnFullscreenScreen.addEventListener('click', () => {
  if (sharedScreenVideo.requestFullscreen) {
    sharedScreenVideo.requestFullscreen();
  } else if (sharedScreenVideo.webkitRequestFullscreen) {
    sharedScreenVideo.webkitRequestFullscreen();
  }
});

btnToggleMic.addEventListener('click', () => {
  isMuted = webrtc.toggleMute();
  if (isMuted) {
    sounds.playMute();
    btnToggleMic.classList.add('active-muted');
    btnStageMic.classList.add('active-muted');
  } else {
    sounds.playUnmute();
    btnToggleMic.classList.remove('active-muted');
    btnStageMic.classList.remove('active-muted');
  }
});
btnStageMic.addEventListener('click', () => btnToggleMic.click());

btnToggleDeaf.addEventListener('click', () => {
  isDeafened = !isDeafened;
  btnToggleDeaf.classList.toggle('active-muted', isDeafened);
  document.querySelectorAll('audio').forEach(a => {
    a.muted = isDeafened;
  });
});

// ==========================================
// MODAL DE CONFIGURAÇÕES DE DISPOSITIVOS E CADASTRO
// ==========================================
function switchSettingsTab(tabName) {
  if (tabName === 'voice') {
    if (tabBtnVoice) tabBtnVoice.classList.add('active');
    if (tabBtnAccount) tabBtnAccount.classList.remove('active');
    if (tabContentVoice) tabContentVoice.style.display = 'block';
    if (tabContentAccount) tabContentAccount.style.display = 'none';
  } else if (tabName === 'account') {
    if (tabBtnAccount) tabBtnAccount.classList.add('active');
    if (tabBtnVoice) tabBtnVoice.classList.remove('active');
    if (tabContentVoice) tabContentVoice.style.display = 'none';
    if (tabContentAccount) tabContentAccount.style.display = 'block';
    if (accountFormAlert) accountFormAlert.style.display = 'none';

    if (currentUser) {
      if (accountUsernameText) accountUsernameText.textContent = currentUser.name;
      if (accountAvatarImg) accountAvatarImg.src = currentUser.avatar;
    }
    socket.emit('auth:get-status');
  }
}

if (tabBtnVoice) {
  tabBtnVoice.addEventListener('click', () => switchSettingsTab('voice'));
}

if (tabBtnAccount) {
  tabBtnAccount.addEventListener('click', () => switchSettingsTab('account'));
}

socket.on('auth:status', ({ username, hasPassword }) => {
  if (accountUsernameText && username) {
    accountUsernameText.textContent = username;
  }
  if (accountAvatarImg && currentUser) {
    accountAvatarImg.src = currentUser.avatar;
  }

  if (hasPassword) {
    if (accountStatusBadge) {
      accountStatusBadge.className = 'account-status-badge verified';
      accountStatusBadge.innerHTML = '<span>✓ Cadastro Finalizado (Nick Protegido)</span>';
    }
    if (accountInfoText) {
      accountInfoText.innerHTML = 'Seu nick está <strong>protegido com senha</strong>! Você já pode utilizá-lo em qualquer dispositivo ou computador digitando essa senha. Caso deseje alterar sua senha, preencha os campos abaixo:';
    }
    if (btnSaveAccountPassword) {
      btnSaveAccountPassword.innerHTML = '<i data-lucide="shield-check" style="width: 16px; height: 16px;"></i><span>Atualizar Senha</span>';
    }
  } else {
    if (accountStatusBadge) {
      accountStatusBadge.className = 'account-status-badge pending';
      accountStatusBadge.innerHTML = '<span>⚠️ Cadastro Pendente (Sem Senha)</span>';
    }
    if (accountInfoText) {
      accountInfoText.innerHTML = 'Cadastre uma senha abaixo para <strong>finalizar seu cadastro</strong>. Ao finalizar, seu nick fica protegido e você poderá utilizá-lo para se conectar em outros computadores ou celulares digitando essa senha.';
    }
    if (btnSaveAccountPassword) {
      btnSaveAccountPassword.innerHTML = '<i data-lucide="shield-check" style="width: 16px; height: 16px;"></i><span>Finalizar Cadastro</span>';
    }
  }
  if (window.lucide) window.lucide.createIcons();
});

function showAccountAlert(msg, isError = true) {
  if (!accountFormAlert) return;
  accountFormAlert.textContent = msg;
  accountFormAlert.style.display = 'block';
  accountFormAlert.className = `account-alert ${isError ? 'error' : 'success'}`;
}

if (accountPasswordForm) {
  accountPasswordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const p1 = accountNewPassword ? accountNewPassword.value.trim() : '';
    const p2 = accountConfirmPassword ? accountConfirmPassword.value.trim() : '';

    if (!p1 || p1.length < 4) {
      showAccountAlert('A senha deve conter no mínimo 4 caracteres.', true);
      return;
    }

    if (p1 !== p2) {
      showAccountAlert('As senhas digitadas não coincidem. Digite novamente.', true);
      return;
    }

    if (btnSaveAccountPassword) {
      btnSaveAccountPassword.disabled = true;
      btnSaveAccountPassword.textContent = 'Salvando...';
    }

    socket.emit('auth:set-password', {
      password: p1,
      deviceId: localDeviceId
    });
  });
}

socket.on('auth:set-password-result', ({ success, message }) => {
  if (btnSaveAccountPassword) {
    btnSaveAccountPassword.disabled = false;
  }

  showAccountAlert(message, !success);

  if (success) {
    if (accountNewPassword) accountNewPassword.value = '';
    if (accountConfirmPassword) accountConfirmPassword.value = '';
    socket.emit('auth:get-status');
  }
});

async function openSettingsModal() {
  settingsModal.style.display = 'flex';
  switchSettingsTab('voice');
  await populateDeviceSelectors();

  // Sincroniza toggle e slider de supressão de ruído
  settingNoiseSuppressionToggle.checked = webrtc.noiseSuppressionEnabled;
  settingNoiseThresholdSlider.value = webrtc.noiseGateThreshold;
  settingNoiseThreshVal.textContent = webrtc.noiseGateThreshold;
}

function closeSettingsModal() {
  settingsModal.style.display = 'none';
}

async function populateDeviceSelectors() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter(d => d.kind === 'audioinput');
    const audioOutputs = devices.filter(d => d.kind === 'audiooutput');

    settingAudioInput.innerHTML = '';
    audioInputs.forEach((device, index) => {
      const opt = document.createElement('option');
      opt.value = device.deviceId;
      opt.textContent = device.label || `Microfone ${index + 1}`;
      if (device.deviceId === webrtc.selectedInputDeviceId) opt.selected = true;
      settingAudioInput.appendChild(opt);
    });

    settingAudioOutput.innerHTML = '';
    audioOutputs.forEach((device, index) => {
      const opt = document.createElement('option');
      opt.value = device.deviceId;
      opt.textContent = device.label || `Alto-falante / Fone ${index + 1}`;
      if (device.deviceId === webrtc.selectedOutputDeviceId) opt.selected = true;
      settingAudioOutput.appendChild(opt);
    });
  } catch (err) {
    console.warn('Erro ao listar dispositivos:', err);
  }
}

btnUserSettings.addEventListener('click', openSettingsModal);
btnCloseSettings.addEventListener('click', closeSettingsModal);
btnSaveSettings.addEventListener('click', closeSettingsModal);

settingAudioInput.addEventListener('change', (e) => {
  webrtc.setInputDevice(e.target.value);
});

settingAudioOutput.addEventListener('change', (e) => {
  webrtc.setOutputDevice(e.target.value);
});

btnTestOutputSound.addEventListener('click', () => {
  sounds.playJoin();
});

settingNoiseSuppressionToggle.addEventListener('change', (e) => {
  webrtc.setNoiseSuppression(e.target.checked);
});

settingNoiseThresholdSlider.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  settingNoiseThreshVal.textContent = val;
  webrtc.setNoiseSuppression(settingNoiseSuppressionToggle.checked, val);
});

// ==========================================
// SOUNDBOARD DO SERVIDOR (POPOVER ESTILO DISCORD)
// ==========================================
async function openSoundboardModal(e) {
  if (e) e.stopPropagation();
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

function closeSoundboardModal() {
  if (soundboardModal) soundboardModal.style.display = 'none';
}

async function loadSoundboardSounds() {
  if (!soundboardGrid) return;
  soundboardGrid.innerHTML = '<div style="color: #949ba4; padding: 20px; text-align: center; grid-column: 1 / -1;">Carregando sons...</div>';
  try {
    const res = await fetch('/api/soundboard');
    const data = await res.json();
    if (data.success) {
      availableSounds = data.sounds || [];
      renderSoundboardGrid(soundboardSearchInput ? soundboardSearchInput.value.trim() : '');
    }
  } catch (err) {
    soundboardGrid.innerHTML = '<div style="color: #ed4245; padding: 20px; text-align: center; grid-column: 1 / -1;">Erro ao carregar sons.</div>';
  }
}

function renderSoundboardGrid(filterText = '') {
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
      <button type="button" class="soundboard-tile-preview" title="Ouvir prévia (somente para você)">
        <i data-lucide="volume-2" style="width: 14px; height: 14px;"></i>
      </button>
    `;

    // Clicar em cima (na área principal) -> toca na chamada (play geral)
    tile.querySelector('.soundboard-tile-main').addEventListener('click', () => {
      playSoundLocally(sound.file_url);
      if (inVoice) {
        socket.emit('soundboard:play', {
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

    // Clicar no botão do lado -> ouve apenas a prévia local!
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
    addSoundModal.style.display = 'flex';
  });
  soundboardGrid.appendChild(addTile);

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function playSoundLocally(url) {
  const audio = new Audio(url);
  webrtc.applyOutputDeviceToElement(audio);
  audio.play().catch(e => console.warn('Erro ao tocar som:', e));
}

function showSoundToast(msg) {
  if (!soundToast) return;
  soundToast.textContent = msg;
  soundToast.style.display = 'flex';
  setTimeout(() => {
    soundToast.style.display = 'none';
  }, 2500);
}

socket.on('soundboard:played', ({ soundUrl, soundName, emoji, playedBy, playedById }) => {
  if (playedById !== socket.id) {
    playSoundLocally(soundUrl);
    showSoundToast(`🎵 ${playedBy} tocou: ${emoji} ${soundName}`);
  }
});

if (btnVoiceSoundboard) btnVoiceSoundboard.addEventListener('click', openSoundboardModal);
if (btnStageSoundboard) btnStageSoundboard.addEventListener('click', openSoundboardModal);
if (btnOpenSoundboardHeader) btnOpenSoundboardHeader.addEventListener('click', openSoundboardModal);
if (btnCloseSoundboard) btnCloseSoundboard.addEventListener('click', (e) => {
  e.stopPropagation();
  closeSoundboardModal();
});

if (soundboardSearchInput) {
  soundboardSearchInput.addEventListener('input', (e) => {
    renderSoundboardGrid(e.target.value.trim());
  });
}

// Adicionar Som (Upload)
btnOpenAddSoundModal.addEventListener('click', () => {
  addSoundModal.style.display = 'flex';
});

btnCloseAddSound.addEventListener('click', () => {
  addSoundModal.style.display = 'none';
});

addSoundForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fileInput = document.getElementById('sound-file-input');
  const nameInput = document.getElementById('sound-name-input');
  const emojiInput = document.getElementById('sound-emoji-input');

  if (!fileInput.files[0]) return;

  const formData = new FormData();
  formData.append('audio', fileInput.files[0]);
  formData.append('name', nameInput.value.trim());
  formData.append('emoji', emojiInput.value.trim() || '🔊');
  formData.append('created_by', currentUser ? currentUser.name : 'Anônimo');

  try {
    const btnSubmit = document.getElementById('btn-submit-sound');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Enviando...';

    const res = await fetch('/api/soundboard', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    if (data.success) {
      addSoundModal.style.display = 'none';
      addSoundForm.reset();
      await loadSoundboardSounds();
      showSoundToast('Novo som cadastrado com sucesso!');
    } else {
      alert(data.error || 'Erro ao cadastrar som.');
    }
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Salvar e Enviar Som';
  } catch (err) {
    alert('Erro na comunicação com o servidor.');
  }
});

// ==========================================
// MENU DE CONTEXTO (DISCORD BOTÃO DIREITO)
// ==========================================
function updateSliderBackground(slider, val, max = 200) {
  const pct = (val / max) * 100;
  slider.style.background = `linear-gradient(to right, #5865F2 0%, #5865F2 ${pct}%, #4e5058 ${pct}%, #4e5058 100%)`;
}

function openContextMenu(e, peerId, peerName) {
  if (peerId === socket.id || peerId === 'local') return;

  e.preventDefault();
  e.stopPropagation();

  currentContextPeerId = peerId;
  const config = getUserConfig(peerId);

  ctxVolumeSlider.value = config.volume;
  ctxVolumeVal.textContent = `${config.volume}%`;
  updateSliderBackground(ctxVolumeSlider, config.volume, 200);

  ctxCheckMute.classList.toggle('checked', config.muted);
  ctxCheckSfx.classList.toggle('checked', config.sfxMuted);
  ctxCheckVideo.classList.toggle('checked', config.videoDisabled);

  userContextMenu.style.display = 'flex';
  const menuWidth = 230;
  const menuHeight = 175;
  let posX = e.clientX;
  let posY = e.clientY;

  if (posX + menuWidth > window.innerWidth) {
    posX = Math.max(10, window.innerWidth - menuWidth - 10);
  }
  if (posY + menuHeight > window.innerHeight) {
    posY = Math.max(10, window.innerHeight - menuHeight - 10);
  }

  userContextMenu.style.left = `${posX}px`;
  userContextMenu.style.top = `${posY}px`;
}

// ==========================================
// POPOVER DO USUÁRIO & LOGOUT
// ==========================================
function toggleUserPopover(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (!currentUser) return;

  const isVisible = userProfilePopover && userProfilePopover.style.display === 'flex';
  if (isVisible) {
    closeUserPopover();
  } else {
    openUserPopover();
  }
}

function openUserPopover() {
  if (!userProfilePopover || !currentUser) return;
  if (popoverAvatar) popoverAvatar.src = currentUser.avatar;
  if (popoverName) popoverName.textContent = currentUser.name;
  userProfilePopover.style.display = 'flex';
  if (window.lucide) window.lucide.createIcons();
}

function closeUserPopover() {
  if (userProfilePopover) {
    userProfilePopover.style.display = 'none';
  }
}

function performLogout() {
  if (inVoice) {
    leaveVoice();
  }

  // Remove o apelido salvo para não fazer auto-login e voltar à tela inicial
  localStorage.removeItem('gamezeda_saved_username');
  hasAttemptedAutoLogin = false;
  isAutoLoginAttempt = false;

  const oldDeviceId = localDeviceId;
  regenerateDeviceId();

  socket.emit('logout', { deviceId: oldDeviceId });

  closeUserPopover();
  closeSettingsModal();
  closeSoundboardModal();
  closeAudioDriverFallbackModal();

  currentUser = null;

  if (loginStepPassword) loginStepPassword.style.display = 'none';
  if (loginStepUsername) loginStepUsername.style.display = 'block';
  if (loginPasswordInput) loginPasswordInput.value = '';
  if (usernameInput) {
    usernameInput.value = '';
    avatarPreview.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=Gamezeda';
  }
  hideLoginAlert();

  loginModal.style.display = 'flex';
  setTimeout(() => {
    if (usernameInput) usernameInput.focus();
  }, 100);
}

if (btnCurrentUserProfile) {
  btnCurrentUserProfile.addEventListener('click', toggleUserPopover);
}

if (btnPopoverLogout) {
  btnPopoverLogout.addEventListener('click', performLogout);
}

document.addEventListener('click', (e) => {
  if (userContextMenu && !userContextMenu.contains(e.target)) closeContextMenu();
  if (userProfilePopover && userProfilePopover.style.display === 'flex') {
    if (!userProfilePopover.contains(e.target) && !btnCurrentUserProfile.contains(e.target)) {
      closeUserPopover();
    }
  }
  if (serverDropdownMenu && serverDropdownMenu.style.display === 'flex') {
    if (!serverDropdownMenu.contains(e.target) && !serverHeaderBtn.contains(e.target)) {
      closeServerDropdown();
    }
  }
  if (soundboardModal && soundboardModal.style.display === 'flex') {
    const clickedInsideSoundboard = soundboardModal.contains(e.target);
    const clickedVoiceBtn = btnVoiceSoundboard && btnVoiceSoundboard.contains(e.target);
    const clickedStageBtn = btnStageSoundboard && btnStageSoundboard.contains(e.target);
    const clickedHeaderBtn = btnOpenSoundboardHeader && btnOpenSoundboardHeader.contains(e.target);
    const clickedAddModal = addSoundModal && addSoundModal.contains(e.target);

    if (!clickedInsideSoundboard && !clickedVoiceBtn && !clickedStageBtn && !clickedHeaderBtn && !clickedAddModal) {
      closeSoundboardModal();
    }
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeContextMenu();
    closeUserPopover();
    closeServerDropdown();
    closeSettingsModal();
    closeSoundboardModal();
    closeAudioDriverFallbackModal();
    closeCreateChannelModal();
    closeCreateCategoryModal();
    closeDeleteModal();
    addSoundModal.style.display = 'none';
  }
});

ctxVolumeSlider.addEventListener('input', (e) => {
  const vol = parseInt(e.target.value, 10);
  ctxVolumeVal.textContent = `${vol}%`;
  updateSliderBackground(ctxVolumeSlider, vol, 200);

  if (currentContextPeerId) {
    const config = getUserConfig(currentContextPeerId);
    config.volume = vol;
    webrtc.setUserVolume(currentContextPeerId, vol);
  }
});
ctxVolumeSlider.addEventListener('click', (e) => e.stopPropagation());

ctxItemMute.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!currentContextPeerId) return;
  const config = getUserConfig(currentContextPeerId);
  config.muted = !config.muted;
  ctxCheckMute.classList.toggle('checked', config.muted);
  webrtc.setUserMuted(currentContextPeerId, config.muted);
});

ctxItemSfx.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!currentContextPeerId) return;
  const config = getUserConfig(currentContextPeerId);
  config.sfxMuted = !config.sfxMuted;
  ctxCheckSfx.classList.toggle('checked', config.sfxMuted);
  webrtc.setUserScreenAudioMuted(currentContextPeerId, config.sfxMuted);
});

ctxItemVideo.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!currentContextPeerId) return;
  const config = getUserConfig(currentContextPeerId);
  config.videoDisabled = !config.videoDisabled;
  ctxCheckVideo.classList.toggle('checked', config.videoDisabled);

  if (currentViewedStreamId === currentContextPeerId) {
    sharedScreenVideo.style.display = config.videoDisabled ? 'none' : 'block';
  }
});

if (mainScreenTile) {
  mainScreenTile.addEventListener('contextmenu', (e) => {
    if (currentViewedStreamId && currentViewedStreamId !== 'local' && currentViewedStreamId !== socket.id) {
      const peer = allOnlineUsers.find(u => u.id === currentViewedStreamId);
      openContextMenu(e, currentViewedStreamId, peer ? peer.name : 'Participante');
    }
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==========================================
// CONTROLE DE MENUS E MODAIS DE CANAIS/CATEGORIAS
// ==========================================
function closeServerDropdown() {
  if (serverDropdownMenu) {
    serverDropdownMenu.style.display = 'none';
  }
}

if (serverHeaderBtn) {
  serverHeaderBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (serverDropdownMenu) {
      const isVisible = serverDropdownMenu.style.display === 'flex';
      serverDropdownMenu.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible && window.lucide) window.lucide.createIcons();
    }
  });
}

if (btnMenuCreateChannel) {
  btnMenuCreateChannel.addEventListener('click', () => {
    closeServerDropdown();
    openCreateChannelModal();
  });
}

if (btnMenuCreateCategory) {
  btnMenuCreateCategory.addEventListener('click', () => {
    closeServerDropdown();
    openCreateCategoryModal();
  });
}

// Modal Criar Canal
function openCreateChannelModal(preselectedCatId = null) {
  if (!modalCreateChannel) return;
  if (inputNewChannelName) inputNewChannelName.value = '';
  hideCreateChannelAlert();

  setChannelTypeSelection('text');

  if (selectChannelCategory) {
    selectChannelCategory.innerHTML = '';
    allCategories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      if (preselectedCatId && cat.id === preselectedCatId) {
        opt.selected = true;
      }
      selectChannelCategory.appendChild(opt);
    });
  }

  modalCreateChannel.style.display = 'flex';
  setTimeout(() => {
    if (inputNewChannelName) inputNewChannelName.focus();
  }, 50);
}

function closeCreateChannelModal() {
  if (modalCreateChannel) modalCreateChannel.style.display = 'none';
  hideCreateChannelAlert();
}

function showCreateChannelAlert(msg) {
  if (createChannelAlert) {
    createChannelAlert.textContent = msg;
    createChannelAlert.style.display = 'block';
  }
}

function hideCreateChannelAlert() {
  if (createChannelAlert) {
    createChannelAlert.style.display = 'none';
  }
}

function setChannelTypeSelection(type) {
  const isVoice = type === 'voice';
  if (optionTypeText) optionTypeText.classList.toggle('active', !isVoice);
  if (optionTypeVoice) optionTypeVoice.classList.toggle('active', isVoice);

  if (channelNamePrefix) {
    channelNamePrefix.textContent = isVoice ? '🔊' : '#';
  }
  if (channelNameHelp) {
    channelNameHelp.textContent = isVoice
      ? 'No Discord, canais de voz podem ter espaços e letras maiúsculas.'
      : 'No Discord, canais de texto usam letras minúsculas e traços.';
  }
  if (inputNewChannelName) {
    inputNewChannelName.placeholder = isVoice ? 'Sala de Jogos' : 'novo-canal';
  }
}

if (optionTypeText) {
  optionTypeText.addEventListener('click', () => setChannelTypeSelection('text'));
}

if (optionTypeVoice) {
  optionTypeVoice.addEventListener('click', () => setChannelTypeSelection('voice'));
}

if (inputNewChannelName) {
  inputNewChannelName.addEventListener('input', () => {
    const isText = optionTypeText && optionTypeText.classList.contains('active');
    if (isText) {
      inputNewChannelName.value = inputNewChannelName.value.toLowerCase().replace(/\s+/g, '-');
    }
    hideCreateChannelAlert();
  });

  inputNewChannelName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (btnConfirmCreateChannel) btnConfirmCreateChannel.click();
    }
  });
}

if (btnCancelCreateChannel) {
  btnCancelCreateChannel.addEventListener('click', closeCreateChannelModal);
}

if (btnConfirmCreateChannel) {
  btnConfirmCreateChannel.addEventListener('click', () => {
    const rawName = (inputNewChannelName ? inputNewChannelName.value : '').trim();
    if (!rawName) {
      showCreateChannelAlert('Por favor, informe um nome para o canal.');
      return;
    }

    const isVoice = optionTypeVoice && optionTypeVoice.classList.contains('active');
    const type = isVoice ? 'voice' : 'text';
    const categoryId = selectChannelCategory ? selectChannelCategory.value : (isVoice ? 'cat-voice' : 'cat-text');

    btnConfirmCreateChannel.disabled = true;
    btnConfirmCreateChannel.textContent = 'Criando...';

    socket.emit('channel:create', { name: rawName, type, categoryId }, (res) => {
      btnConfirmCreateChannel.disabled = false;
      btnConfirmCreateChannel.textContent = 'Criar Canal';

      if (res && res.success) {
        closeCreateChannelModal();
        if (res.channel && res.channel.type === 'text') {
          switchTextChannel(res.channel.id);
        }
      } else {
        showCreateChannelAlert((res && res.message) || 'Erro ao criar canal.');
      }
    });
  });
}

// Modal Criar Categoria
function openCreateCategoryModal() {
  if (!modalCreateCategory) return;
  if (inputNewCategoryName) inputNewCategoryName.value = '';
  hideCreateCategoryAlert();
  modalCreateCategory.style.display = 'flex';
  setTimeout(() => {
    if (inputNewCategoryName) inputNewCategoryName.focus();
  }, 50);
}

function closeCreateCategoryModal() {
  if (modalCreateCategory) modalCreateCategory.style.display = 'none';
  hideCreateCategoryAlert();
}

function showCreateCategoryAlert(msg) {
  if (createCategoryAlert) {
    createCategoryAlert.textContent = msg;
    createCategoryAlert.style.display = 'block';
  }
}

function hideCreateCategoryAlert() {
  if (createCategoryAlert) {
    createCategoryAlert.style.display = 'none';
  }
}

if (inputNewCategoryName) {
  inputNewCategoryName.addEventListener('input', hideCreateCategoryAlert);
  inputNewCategoryName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (btnConfirmCreateCategory) btnConfirmCreateCategory.click();
    }
  });
}

if (btnCancelCreateCategory) {
  btnCancelCreateCategory.addEventListener('click', closeCreateCategoryModal);
}

if (btnConfirmCreateCategory) {
  btnConfirmCreateCategory.addEventListener('click', () => {
    const rawName = (inputNewCategoryName ? inputNewCategoryName.value : '').trim();
    if (!rawName) {
      showCreateCategoryAlert('Por favor, informe o nome da categoria.');
      return;
    }

    btnConfirmCreateCategory.disabled = true;
    btnConfirmCreateCategory.textContent = 'Criando...';

    socket.emit('category:create', { name: rawName }, (res) => {
      btnConfirmCreateCategory.disabled = false;
      btnConfirmCreateCategory.textContent = 'Criar Categoria';

      if (res && res.success) {
        closeCreateCategoryModal();
      } else {
        showCreateCategoryAlert((res && res.message) || 'Erro ao criar categoria.');
      }
    });
  });
}

// Modal Confirmar Exclusão
function openDeleteModal(type, id, name) {
  deleteTarget = { type, id, name };
  if (!modalConfirmDelete) return;

  if (deleteModalAlert) deleteModalAlert.style.display = 'none';

  if (deleteModalTitle) {
    deleteModalTitle.textContent = type === 'category' ? 'Excluir Categoria' : 'Excluir Canal';
  }
  if (deleteModalDesc) {
    deleteModalDesc.innerHTML = type === 'category'
      ? `Tem certeza de que deseja excluir a categoria <strong>${escapeHtml(name)}</strong>? Seus canais serão mantidos e organizados.`
      : `Tem certeza de que deseja excluir o canal <strong>#${escapeHtml(name)}</strong>? Todas as mensagens serão apagadas permanentemente.`;
  }

  modalConfirmDelete.style.display = 'flex';
}

function closeDeleteModal() {
  if (modalConfirmDelete) modalConfirmDelete.style.display = 'none';
  deleteTarget = null;
}

if (btnCancelDelete) {
  btnCancelDelete.addEventListener('click', closeDeleteModal);
}

if (btnConfirmDelete) {
  btnConfirmDelete.addEventListener('click', () => {
    if (!deleteTarget) return;

    btnConfirmDelete.disabled = true;
    btnConfirmDelete.textContent = 'Excluindo...';

    const evt = deleteTarget.type === 'category' ? 'category:delete' : 'channel:delete';
    const payload = deleteTarget.type === 'category'
      ? { categoryId: deleteTarget.id }
      : { channelId: deleteTarget.id };

    socket.emit(evt, payload, (res) => {
      btnConfirmDelete.disabled = false;
      btnConfirmDelete.textContent = 'Excluir';

      if (res && res.success) {
        closeDeleteModal();
      } else {
        if (deleteModalAlert) {
          deleteModalAlert.textContent = (res && res.message) || 'Erro ao excluir.';
          deleteModalAlert.style.display = 'block';
        }
      }
    });
  });
}

// Fechar modais ao clicar no fundo escuro (backdrop)
[modalCreateChannel, modalCreateCategory, modalConfirmDelete].forEach(modal => {
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        if (modal === modalCreateChannel) closeCreateChannelModal();
        else if (modal === modalCreateCategory) closeCreateCategoryModal();
        else if (modal === modalConfirmDelete) closeDeleteModal();
      }
    });
  }
});

// Renderização inicial imediata dos canais da barra lateral
renderSidebarChannels();

if (window.lucide) {
  window.lucide.createIcons();
}
