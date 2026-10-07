import { sounds } from './sounds.js?v=20261004_v6';
import { WebRTCManager } from './webrtc.js?v=20261006_v2';

if (window.lucide) {
  window.lucide.createIcons();
}

// Ajuste dinâmico de altura para Mobile (garante que barra de endereço do navegador não esconda a digitação)
function updateAppHeight() {
  const vh = window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${vh}px`);
}
window.addEventListener('resize', updateAppHeight);
window.addEventListener('orientationchange', updateAppHeight);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', updateAppHeight);
}
updateAppHeight();

// Detecção automática de aplicativo Mobile (APK Android / Expo WebView)
function applyMobileAppFixes() {
  const isRN = typeof window.ReactNativeWebView !== 'undefined';
  const isAndroidWV = /Android.*(wv|Version\/[0-9])/i.test(navigator.userAgent);
  const isKnownWV = /wv|WebView/i.test(navigator.userAgent);
  const isStandAlone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  if (isRN || isAndroidWV || isKnownWV || isStandAlone) {
    document.body.classList.add('is-mobile-app');
  }
}
applyMobileAppFixes();
document.addEventListener('DOMContentLoaded', applyMobileAppFixes);
window.addEventListener('load', applyMobileAppFixes);

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

// Status de Voz e Ações Rápidas (Layout Fixo estilo Discord)
const voiceStatusBox = document.getElementById('voice-status-box');
const quickDisconnectBtn = document.getElementById('quick-disconnect-btn');
const quickScreenShareBtn = document.getElementById('quick-screenshare-btn');
const btnVoiceSoundboard = document.getElementById('btn-voice-soundboard');
const btnVoiceCamera = document.getElementById('btn-voice-camera');
const btnNoiseSuppression = document.getElementById('btn-noise-suppression');
const noiseSuppressionPopover = document.getElementById('noise-suppression-popover');
const btnCloseNoisePopover = document.getElementById('btn-close-noise-popover');
const noisePopoverToggle = document.getElementById('noise-popover-toggle');
const noisePopoverMeter = document.getElementById('noise-popover-meter');

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

// Modal Troca de Canal de Voz (Você tem certeza?)
let pendingSwitchVoiceChannel = null;
const modalSwitchVoice = document.getElementById('modal-switch-voice');
const switchVoiceTargetName = document.getElementById('switch-voice-target-name');
const checkDontAskSwitchVoice = document.getElementById('check-dont-ask-switch-voice');
const btnCancelSwitchVoice = document.getElementById('btn-cancel-switch-voice');
const btnConfirmSwitchVoice = document.getElementById('btn-confirm-switch-voice');
const btnCloseSwitchVoice = document.getElementById('btn-close-switch-voice');

// Membros e Palco
const membersListContent = document.getElementById('members-list-content');
const dynamicVoiceCards = document.getElementById('dynamic-voice-cards');
const membersSidebar = document.getElementById('members-sidebar');
const btnToggleMembersSidebar = document.getElementById('btn-toggle-members-sidebar');
const btnToggleChannelsSidebar = document.getElementById('btn-toggle-channels-sidebar');
const mobileDrawerOverlay = document.getElementById('mobile-drawer-overlay');
const channelsSidebar = document.querySelector('.channels-sidebar');


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
const screenVolumeControlBox = document.getElementById('screen-volume-control-box');
const screenTileVolumeSlider = document.getElementById('screen-tile-volume-slider');
const screenTileVolumeVal = document.getElementById('screen-tile-volume-val');
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
const btnCloseContextMenu = document.getElementById('btn-close-context-menu');
const ctxVolumeSlider = document.getElementById('ctx-volume-slider');
const ctxVolumeVal = document.getElementById('ctx-volume-val');
const ctxScreenVolumeSlider = document.getElementById('ctx-screen-volume-slider');
const ctxScreenVolumeVal = document.getElementById('ctx-screen-volume-val');
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
const btnDownloadDesktop = document.getElementById('btn-download-desktop');
const btnDownloadMobile = document.getElementById('btn-download-mobile');
const modalDownloadMobile = document.getElementById('modal-download-mobile');
const btnCloseMobileModal = document.getElementById('btn-close-mobile-modal');
const btnDismissMobileModal = document.getElementById('btn-dismiss-mobile-modal');
const tabPlatformAndroid = document.getElementById('tab-platform-android');
const tabPlatformIos = document.getElementById('tab-platform-ios');
const qrCodeImg = document.getElementById('qr-code-img');
const qrCodeCaption = document.getElementById('qr-code-caption');
const qrCodeUrlPill = document.getElementById('qr-code-url-pill');
const btnDirectDownloadMobile = document.getElementById('btn-direct-download-mobile');
const btnDirectDownloadLabel = document.getElementById('btn-direct-download-label');
const btnCopyMobileLink = document.getElementById('btn-copy-mobile-link');
const mobilePlatformTip = document.getElementById('mobile-platform-tip');
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

// ==========================================
// CONTROLE DE DRAWERS MOBILE (ESTILO DISCORD MOBILE)
// ==========================================
function isMobileView() {
  return window.innerWidth <= 768;
}

function checkOverlayState() {
  const isAnyOpen = (channelsSidebar && channelsSidebar.classList.contains('mobile-open')) ||
                    (membersSidebar && membersSidebar.classList.contains('mobile-open'));
  if (!isAnyOpen && mobileDrawerOverlay) {
    mobileDrawerOverlay.classList.remove('active');
    setTimeout(() => {
      if (mobileDrawerOverlay && !mobileDrawerOverlay.classList.contains('active')) {
        mobileDrawerOverlay.style.display = 'none';
      }
    }, 280);
  }
}

function openChannelsDrawer() {
  if (!channelsSidebar) return;
  channelsSidebar.classList.add('mobile-open');
  if (membersSidebar) membersSidebar.classList.remove('mobile-open');
  if (mobileDrawerOverlay) {
    mobileDrawerOverlay.style.display = 'block';
    requestAnimationFrame(() => {
      if (mobileDrawerOverlay) mobileDrawerOverlay.classList.add('active');
    });
  }
}

function closeChannelsDrawer() {
  if (!channelsSidebar) return;
  channelsSidebar.classList.remove('mobile-open');
  checkOverlayState();
}

function openMembersDrawer() {
  if (!membersSidebar) return;
  membersSidebar.classList.add('mobile-open');
  if (channelsSidebar) channelsSidebar.classList.remove('mobile-open');
  if (mobileDrawerOverlay) {
    mobileDrawerOverlay.style.display = 'block';
    requestAnimationFrame(() => {
      if (mobileDrawerOverlay) mobileDrawerOverlay.classList.add('active');
    });
  }
}

function closeMembersDrawer() {
  if (!membersSidebar) return;
  membersSidebar.classList.remove('mobile-open');
  checkOverlayState();
}

function closeAllDrawers() {
  if (channelsSidebar) channelsSidebar.classList.remove('mobile-open');
  if (membersSidebar) membersSidebar.classList.remove('mobile-open');
  if (mobileDrawerOverlay) {
    mobileDrawerOverlay.classList.remove('active');
    setTimeout(() => {
      if (mobileDrawerOverlay && !mobileDrawerOverlay.classList.contains('active')) {
        mobileDrawerOverlay.style.display = 'none';
      }
    }, 280);
  }
}


function getUserConfig(peerId) {
  if (!userConfigs.has(peerId)) {
    userConfigs.set(peerId, {
      volume: 100,
      muted: false,
      screenVolume: 100,
      lastScreenVolume: 100,
      sfxMuted: false,
      videoDisabled: false
    });
  }
  const cfg = userConfigs.get(peerId);
  if (cfg.screenVolume === undefined) cfg.screenVolume = 100;
  if (cfg.lastScreenVolume === undefined) cfg.lastScreenVolume = 100;
  return cfg;
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
    updateScreenSoundControlsState();
  }
};

function updateScreenSoundButtonState() {
  updateScreenSoundControlsState();
}

function renderVoiceChannelUsers() {
  renderSidebarChannels();
}

// Medidor de teste de microfone no modal de configurações e no popover do supressor
setInterval(() => {
  const isSettingsOpen = settingsModal && settingsModal.style.display !== 'none';
  const isNoisePopoverOpen = noiseSuppressionPopover && noiseSuppressionPopover.style.display === 'flex';
  if ((isSettingsOpen || isNoisePopoverOpen) && webrtc.analyser) {
    const buffer = new Uint8Array(webrtc.analyser.frequencyBinCount);
    webrtc.analyser.getByteFrequencyData(buffer);
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) sum += buffer[i];
    const avg = sum / buffer.length;
    const pct = Math.min(100, Math.round((avg / 60) * 100));
    if (micTestMeter && isSettingsOpen) micTestMeter.style.width = `${pct}%`;
    if (noisePopoverMeter && isNoisePopoverOpen) {
      noisePopoverMeter.style.width = `${pct}%`;
      const levelText = document.getElementById('rnnoise-level-text');
      if (levelText) {
        levelText.textContent = pct > 12 ? 'Voz Detectada (Límpida)' : (webrtc.noiseSuppressionEnabled ? 'Silêncio / Ruído Filtrado' : 'Monitorando Direto');
        levelText.style.color = pct > 12 ? '#23a55a' : (webrtc.noiseSuppressionEnabled ? '#5865F2' : '#949ba4');
      }
    }
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
    renderSidebarChannels();
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
  renderSidebarChannels();
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

function updateScreenSoundControlsState() {
  if (!btnToggleScreenSound) return;

  if (!currentViewedStreamId) {
    if (screenVolumeControlBox) screenVolumeControlBox.style.display = 'none';
    return;
  }

  const streamData = activeStreams.get(currentViewedStreamId);
  if (!streamData) {
    if (screenVolumeControlBox) screenVolumeControlBox.style.display = 'none';
    return;
  }

  if (screenVolumeControlBox) screenVolumeControlBox.style.display = 'flex';

  if (streamData.isLocal) {
    const isMuted = sharedScreenVideo.muted;
    btnToggleScreenSound.title = isMuted ? "Ouvir preview local" : "Silenciar preview local";
    btnToggleScreenSound.innerHTML = isMuted
      ? `<i data-lucide="volume-x" id="screen-sound-icon" style="width: 16px; height: 16px; color: #ed4245;"></i>`
      : `<i data-lucide="volume-2" id="screen-sound-icon" style="width: 16px; height: 16px; color: #23a55a;"></i>`;

    if (screenTileVolumeSlider) {
      screenTileVolumeSlider.value = isMuted ? 0 : 100;
      updateSliderBackground(screenTileVolumeSlider, isMuted ? 0 : 100, 200);
    }
    if (screenTileVolumeVal) {
      screenTileVolumeVal.textContent = isMuted ? '0%' : '100%';
    }
  } else {
    const config = getUserConfig(currentViewedStreamId);
    const isMuted = config.sfxMuted || config.screenVolume === 0;
    const currentVol = isMuted ? 0 : config.screenVolume;

    btnToggleScreenSound.title = isMuted ? "Desmutar transmissão" : "Silenciar transmissão";
    btnToggleScreenSound.innerHTML = isMuted
      ? `<i data-lucide="volume-x" id="screen-sound-icon" style="width: 16px; height: 16px; color: #ed4245;"></i>`
      : `<i data-lucide="volume-2" id="screen-sound-icon" style="width: 16px; height: 16px; color: #23a55a;"></i>`;

    if (screenTileVolumeSlider) {
      screenTileVolumeSlider.value = currentVol;
      updateSliderBackground(screenTileVolumeSlider, currentVol, 200);
    }
    if (screenTileVolumeVal) {
      screenTileVolumeVal.textContent = `${currentVol}%`;
    }
  }

  if (window.lucide) window.lucide.createIcons();
}

// Deslizar o volume da transmissão (Muta no mínimo 0% e ajusta o volume em tempo real)
if (screenTileVolumeSlider) {
  screenTileVolumeSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    if (!currentViewedStreamId) return;

    const streamData = activeStreams.get(currentViewedStreamId);
    if (!streamData) return;

    if (streamData.isLocal) {
      sharedScreenVideo.muted = (val === 0);
      updateScreenSoundControlsState();
      return;
    }

    const config = getUserConfig(currentViewedStreamId);
    if (val === 0) {
      // Ao deixar no mínimo o áudio, deve mutar!
      config.sfxMuted = true;
      config.screenVolume = 0;
      webrtc.setUserScreenAudioMuted(currentViewedStreamId, true);
      webrtc.setUserScreenVolume(currentViewedStreamId, 0);
    } else {
      // Ajuste de volume e desmute automático ao aumentar
      config.sfxMuted = false;
      config.screenVolume = val;
      config.lastScreenVolume = val;
      webrtc.setUserScreenAudioMuted(currentViewedStreamId, false);
      webrtc.setUserScreenVolume(currentViewedStreamId, val);
    }

    if (currentContextPeerId === currentViewedStreamId) {
      if (ctxScreenVolumeSlider) {
        ctxScreenVolumeSlider.value = val;
        if (ctxScreenVolumeVal) ctxScreenVolumeVal.textContent = `${val}%`;
        updateSliderBackground(ctxScreenVolumeSlider, val, 200);
      }
      if (ctxCheckSfx) ctxCheckSfx.classList.toggle('checked', config.sfxMuted);
    }

    updateScreenSoundControlsState();
  });

  screenTileVolumeSlider.addEventListener('click', (e) => e.stopPropagation());
}

// Botão de Áudio da Transmissão (Se clicar muta, e se clicar novamente desmuta)
if (btnToggleScreenSound) {
  btnToggleScreenSound.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!currentViewedStreamId) return;

    const streamData = activeStreams.get(currentViewedStreamId);
    if (!streamData) return;

    if (streamData.isLocal) {
      sharedScreenVideo.muted = !sharedScreenVideo.muted;
      updateScreenSoundControlsState();
      showSoundToast(sharedScreenVideo.muted ? '🔇 Preview do som desativado' : '🔊 Ouvindo preview do som no fone!');
      return;
    }

    const config = getUserConfig(currentViewedStreamId);
    const isMuted = config.sfxMuted || config.screenVolume === 0;

    if (isMuted) {
      // Clicou novamente -> DESMUTA e restaura o volume anterior salvo
      config.sfxMuted = false;
      const restoreVol = (config.lastScreenVolume && config.lastScreenVolume > 0) ? config.lastScreenVolume : 100;
      config.screenVolume = restoreVol;
      webrtc.setUserScreenAudioMuted(currentViewedStreamId, false);
      webrtc.setUserScreenVolume(currentViewedStreamId, restoreVol);
      showSoundToast(`🔊 Som da transmissão desmutado (${restoreVol}%)`);
    } else {
      // Clicou -> MUTA e salva o volume atual para restauração
      config.lastScreenVolume = config.screenVolume > 0 ? config.screenVolume : 100;
      config.sfxMuted = true;
      config.screenVolume = 0;
      webrtc.setUserScreenAudioMuted(currentViewedStreamId, true);
      webrtc.setUserScreenVolume(currentViewedStreamId, 0);
      showSoundToast('🔇 Som da transmissão mutado');
    }

    if (currentContextPeerId === currentViewedStreamId) {
      if (ctxScreenVolumeSlider) {
        ctxScreenVolumeSlider.value = config.screenVolume;
        if (ctxScreenVolumeVal) ctxScreenVolumeVal.textContent = `${config.screenVolume}%`;
        updateSliderBackground(ctxScreenVolumeSlider, config.screenVolume, 200);
      }
      if (ctxCheckSfx) ctxCheckSfx.classList.toggle('checked', config.sfxMuted);
    }

    updateScreenSoundControlsState();
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

  updateScreenSoundControlsState();

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
  renderSidebarChannels();
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

  // Remove automaticamente streams fantasmas de participantes que saíram
  if (inVoice && Array.isArray(allVoiceUsers)) {
    const currentRoomUserIds = new Set(allVoiceUsers.map(u => u.id));
    for (const [streamId, sData] of activeStreams.entries()) {
      if (!sData.isLocal && !currentRoomUserIds.has(streamId)) {
        unregisterStream(streamId);
      }
    }
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

socket.on('voice:peer-camera-status', ({ peerId, isActive }) => {
  if (!isActive) {
    unregisterStream(peerId);
    unregisterStream(`${peerId}-camera`);
  }
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

  const onlineCountEl = document.getElementById('header-online-count');
  if (onlineCountEl) {
    const totalOnline = seenMemberNames.size || (allOnlineUsers && allOnlineUsers.length) || 1;
    onlineCountEl.textContent = `${totalOnline} online`;
  }
}

// SVGs brancos estilo Discord para microfone mutado e fone cortado (áudio desativado)
function getMuteIconSvg(size = 14, color = '#ffffff') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="voice-status-icon icon-muted" title="Microfone mutado"><line x1="2" y1="2" x2="22" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" y1="19" x2="12" y2="22"/></svg>`;
}

function getDeafenIconSvg(size = 14, color = '#ffffff') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="voice-status-icon icon-deafened" title="Áudio desativado"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 14.8-6.9"/><path d="M21 15v4a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/><path d="M21 11a9 9 0 0 0-3.3-6.9"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`;
}

function createMemberItem(user, isVoice) {
  const div = document.createElement('div');
  div.className = 'member-item';
  div.setAttribute('data-member-id', user.id);

  const isLocal = user.id === socket.id;
  const isBot = !!user.isBot || user.id === 'bot-alfredo' || user.id === 'bot-rythm';
  const userIsMuted = isLocal ? isMuted : !!user.isMuted;
  const userIsDeafened = isLocal ? isDeafened : !!user.isDeafened;

  const activityText = isVoice
    ? '🔊 Em voz'
    : (isBot ? '🎵 !play para ouvir' : 'Online');

  div.innerHTML = `
    <div class="member-avatar-wrap">
      <img class="member-avatar" src="${user.avatar}" alt="${user.name}">
      <div class="status-dot"></div>
    </div>
    <div class="member-info">
      <div style="display: flex; align-items: center; gap: 4px;">
        <span class="member-name">${escapeHtml(user.name)}${isLocal ? ' (Você)' : ''}</span>
        ${isBot ? '<span class="bot-tag">BOT</span>' : ''}
        ${isVoice && (userIsMuted || userIsDeafened) ? `
          <div class="voice-user-status-icons">
            ${userIsMuted ? getMuteIconSvg(12) : ''}
            ${userIsDeafened ? getDeafenIconSvg(12) : ''}
          </div>
        ` : ''}
      </div>
      <span class="member-activity" style="${isVoice ? 'color: #23a55a;' : (isBot ? 'color: #5865F2;' : '')}">
        ${escapeHtml(activityText)}
      </span>
    </div>
  `;

  if (!isLocal) {
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

            const userIsMuted = isLocal ? isMuted : !!user.isMuted;
            const userIsDeafened = isLocal ? isDeafened : !!user.isDeafened;

            const pill = document.createElement('div');
            pill.className = 'voice-user-pill';
            pill.setAttribute('data-user-id', user.id);
            pill.innerHTML = `
              <img src="${user.avatar}" alt="${user.name}">
              <span class="pill-name" style="flex: 1;">${escapeHtml(user.name)}${isLocal ? ' (Você)' : ''}</span>
              ${isSharing ? '<span class="live-indicator" style="font-size: 10px; margin-left: 6px; padding: 2px 5px; cursor: pointer;">🔴 AO VIVO</span>' : ''}
              ${(userIsMuted || userIsDeafened) ? `
                <div class="voice-user-status-icons">
                  ${userIsMuted ? getMuteIconSvg(14) : ''}
                  ${userIsDeafened ? getDeafenIconSvg(14) : ''}
                </div>
              ` : ''}
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
    const cardMyName = document.getElementById('card-my-name');
    if (cardMyName) {
      cardMyName.innerHTML = `
        <span>${currentUser ? escapeHtml(currentUser.name) : 'Você'}</span>
        ${(isMuted || isDeafened) ? `
          <div class="voice-user-status-icons">
            ${isMuted ? getMuteIconSvg(13) : ''}
            ${isDeafened ? getDeafenIconSvg(13) : ''}
          </div>
        ` : ''}
      `;
    }
  }

  // Participantes da sala de voz em que estamos
  const currentRoomUsers = currentVoiceChannelId && allVoiceRoomsState[currentVoiceChannelId]
    ? allVoiceRoomsState[currentVoiceChannelId]
    : allVoiceUsers;

  const otherVoiceUsers = currentRoomUsers.filter(u => u.id !== socket.id);
  otherVoiceUsers.forEach(user => {
    const hasStream = activeStreams.has(user.id);
    const isBot = !!user.isBot || user.id === 'bot-alfredo' || user.id === 'bot-rythm';
    const card = document.createElement('div');
    card.className = `user-voice-card ${hasStream ? 'has-stream' : ''}`;
    card.id = `voice-card-${user.id}`;
    card.innerHTML = `
      <img src="${user.avatar}" alt="${user.name}">
      <div class="card-name" style="display: flex; align-items: center; justify-content: center; gap: 4px;">
        <span>${escapeHtml(user.name)}</span>
        ${isBot ? '<span class="bot-tag">BOT</span>' : ''}
        ${(user.isMuted || user.isDeafened) ? `
          <div class="voice-user-status-icons">
            ${user.isMuted ? getMuteIconSvg(13) : ''}
            ${user.isDeafened ? getDeafenIconSvg(13) : ''}
          </div>
        ` : ''}
      </div>
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

  if (videoStage) videoStage.style.display = 'none';
  if (messagesContainer) messagesContainer.style.display = 'flex';
  const chatInputWrap = document.querySelector('.chat-input-wrapper');
  if (chatInputWrap) chatInputWrap.style.display = 'block';

  if (!channelMessagesStore[chName]) {
    socket.emit('chat:get-channel', { channelId: chName });
  }

  renderCurrentChannelMessages();

  if (isMobileView()) {
    closeAllDrawers();
  }
}

function renderCurrentChannelMessages(filterText = '') {
  messagesContainer.innerHTML = '';
  let messages = channelMessagesStore[currentTextChannel] || [];

  if (filterText) {
    const query = filterText.toLowerCase();
    messages = messages.filter(m => (m.text && m.text.toLowerCase().includes(query)) || (m.sender && m.sender.toLowerCase().includes(query)));
  }

  const welcomeBanner = document.createElement('div');
  welcomeBanner.className = 'channel-welcome-banner';
  welcomeBanner.innerHTML = `
    <div class="channel-welcome-icon">#</div>
    <h2 class="channel-welcome-title">Bem-vindo(a) a #${escapeHtml(currentTextChannel)}!</h2>
    <p class="channel-welcome-desc">Este é o início do canal #${escapeHtml(currentTextChannel)}.</p>
  `;
  messagesContainer.appendChild(welcomeBanner);

  if (messages.length === 0) {
    messagesContainer.classList.add('is-empty');
    return;
  }

  messagesContainer.classList.remove('is-empty');
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

if (chatInput) {
  chatInput.addEventListener('focus', () => {
    setTimeout(() => {
      updateAppHeight();
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 200);
  });
}

socket.on('chat:new-message', ({ channelId, message }) => {
  if (!channelMessagesStore[channelId]) {
    channelMessagesStore[channelId] = [];
  }
  channelMessagesStore[channelId].push(message);

  if (channelId === currentTextChannel) {
    messagesContainer.classList.remove('is-empty');
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

function formatMessageDisplayTime(msg) {
  if (!msg) return '';

  // 1. Se o ID carrega o timestamp Unix (ex: msg-1791246309127-... ou sys-1791246309127)
  if (typeof msg.id === 'string') {
    const match = msg.id.match(/^(?:msg|sys)-(\d{13})/);
    if (match) {
      const timeMs = parseInt(match[1], 10);
      if (!isNaN(timeMs) && timeMs > 1700000000000) {
        const d = new Date(timeMs);
        const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = d.toDateString() === yesterday.toDateString();

        if (isToday) return `Hoje às ${timeStr}`;
        if (isYesterday) return `Ontem às ${timeStr}`;
        return `${d.toLocaleDateString('pt-BR')} às ${timeStr}`;
      }
    }
  }

  // 2. Se tiver createdAt válido (ISO string ou Date do banco)
  if (msg.createdAt) {
    const d = new Date(msg.createdAt);
    if (!isNaN(d.getTime())) {
      const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) return `Hoje às ${timeStr}`;
      return `${d.toLocaleDateString('pt-BR')} às ${timeStr}`;
    }
  }

  // 3. Fallback para msg.timestamp original
  if (msg.timestamp) {
    return msg.timestamp;
  }

  return 'Hoje às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatChatText(text) {
  if (!text) return '';
  let str = escapeHtml(text);
  // Markdown links: [Title](URL)
  str = str.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #00a8fc; text-decoration: underline; font-weight: 600;">$1</a>');
  // Markdown bold: **text**
  str = str.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #fff;">$1</strong>');
  // Markdown inline code: `code`
  str = str.replace(/`([^`]+)`/g, '<code style="background: rgba(0,0,0,0.35); padding: 1.5px 5px; border-radius: 3px; font-size: 12px; color: #eb459e; font-family: monospace;">$1</code>');
  // Newlines to <br>
  str = str.replace(/\n/g, '<br>');
  return str;
}

function appendMessageToContainer(msg) {
  const displayTime = formatMessageDisplayTime(msg);

  if (msg.isSystem) {
    const sysDiv = document.createElement('div');
    sysDiv.className = 'system-message';

    let formattedText = escapeHtml(msg.text);
    if (msg.sender && msg.text && msg.text.startsWith(msg.sender)) {
      const rest = msg.text.substring(msg.sender.length);
      formattedText = `<strong class="system-username">${escapeHtml(msg.sender)}</strong>${escapeHtml(rest)}`;
    }

    sysDiv.innerHTML = `
      <span class="system-arrow">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#23a55a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
          <line x1="4" y1="12" x2="20" y2="12"></line>
          <polyline points="13 5 20 12 13 19"></polyline>
        </svg>
      </span>
      <span class="system-content">${formattedText} <span class="system-time">${escapeHtml(displayTime)}</span></span>
    `;
    messagesContainer.appendChild(sysDiv);
    return;
  }

  const div = document.createElement('div');
  div.className = 'message-item';
  const isBot = !!msg.isBot || msg.sender === 'Alfredo' || msg.sender === 'Rythm';

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
        <span class="message-author" style="color: ${isBot ? '#23a55a' : '#5865F2'};">${escapeHtml(msg.sender)}</span>
        ${isBot ? '<span class="bot-tag">BOT</span>' : ''}
        <span class="message-time">${escapeHtml(displayTime)}</span>
      </div>
      <div class="message-text">${formatChatText(msg.text)}</div>
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

// Toggle da barra lateral de membros (Desktop e Mobile)
if (btnToggleMembersSidebar) {
  btnToggleMembersSidebar.addEventListener('click', () => {
    if (isMobileView()) {
      if (membersSidebar && membersSidebar.classList.contains('mobile-open')) {
        closeMembersDrawer();
      } else {
        openMembersDrawer();
      }
    } else {
      if (membersSidebar) {
        const isHidden = membersSidebar.style.display === 'none';
        membersSidebar.style.display = isHidden ? 'flex' : 'none';
      }
    }
  });
}

// Toggle da barra lateral de canais (Mobile Hamburger estilo Discord)
if (btnToggleChannelsSidebar) {
  btnToggleChannelsSidebar.addEventListener('click', () => {
    if (channelsSidebar && channelsSidebar.classList.contains('mobile-open')) {
      closeChannelsDrawer();
    } else {
      openChannelsDrawer();
    }
  });
}

const chatHeaderTitleWrap = document.querySelector('.chat-header-title-wrap');
if (chatHeaderTitleWrap) {
  chatHeaderTitleWrap.addEventListener('click', (e) => {
    if (isMobileView()) {
      // Se clicou no contador online, abre a lista de membros
      if (e.target.closest('#header-online-count')) {
        if (membersSidebar && membersSidebar.classList.contains('mobile-open')) {
          closeMembersDrawer();
        } else {
          openMembersDrawer();
        }
        return;
      }
      // Caso contrário, abre a gaveta de canais
      if (channelsSidebar && channelsSidebar.classList.contains('mobile-open')) {
        closeChannelsDrawer();
      } else {
        openChannelsDrawer();
      }
    }
  });
}

// Fechar drawers ao tocar no backdrop escuro
if (mobileDrawerOverlay) {
  mobileDrawerOverlay.addEventListener('click', () => {
    closeAllDrawers();
  });
}

// Fechar drawers com tecla Escape se em mobile
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isMobileView()) {
    closeAllDrawers();
  }
});

// Ao redimensionar a janela (ex: rotação de tela ou redimensionar navegador)
window.addEventListener('resize', () => {
  if (!isMobileView()) {
    closeAllDrawers();
    if (membersSidebar) {
      membersSidebar.style.display = '';
    }
  }
});

// Suporte a gestos touch swipe no estilo Discord Mobile
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
  if (!isMobileView()) return;
  if (e.touches && e.touches.length === 1) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
}, { passive: true });

document.addEventListener('touchend', (e) => {
  if (!isMobileView()) return;
  if (!e.changedTouches || e.changedTouches.length === 0) return;

  const touchEndX = e.changedTouches[0].clientX;
  const touchEndY = e.changedTouches[0].clientY;
  const deltaX = touchEndX - touchStartX;
  const deltaY = touchEndY - touchStartY;

  // Deslize predominantemente horizontal (> 50px de deslocamento e horizontal > vertical)
  if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
    const isChannelsOpen = channelsSidebar && channelsSidebar.classList.contains('mobile-open');
    const isMembersOpen = membersSidebar && membersSidebar.classList.contains('mobile-open');

    if (deltaX > 0) {
      // Swipe para a direita
      if (isMembersOpen) {
        closeMembersDrawer();
      } else if (!isChannelsOpen && touchStartX < 50) {
        openChannelsDrawer();
      }
    } else {
      // Swipe para a esquerda
      if (isChannelsOpen) {
        closeChannelsDrawer();
      } else if (!isMembersOpen && touchStartX > window.innerWidth - 50) {
        openMembersDrawer();
      }
    }
  }
}, { passive: true });

// ==========================================
// POPOVER DE SELEÇÃO DE EMOJIS (ESTILO DISCORD)
// ==========================================
const emojiPickerPopover = document.getElementById('emoji-picker-popover');
const emojiSearchInput = document.getElementById('emoji-search-input');
const emojiPickerBody = document.getElementById('emoji-picker-body');
const emojiNavBtns = document.querySelectorAll('.emoji-nav-btn');

const EMOJI_CATEGORIES = [
  {
    id: 'faces',
    name: 'Expressões & Carinhas',
    icon: '😃',
    emojis: [
      { char: '😀', keywords: 'sorriso feliz alegre cara rindo' },
      { char: '😃', keywords: 'sorriso aberto feliz alegre' },
      { char: '😄', keywords: 'sorriso olhos fechados alegre' },
      { char: '😁', keywords: 'sorridente dentes feliz' },
      { char: '😆', keywords: 'gargalhada riso risada' },
      { char: '😅', keywords: 'suor riso nervoso' },
      { char: '😂', keywords: 'chorando de rir risada lol kkk morrendo' },
      { char: '🤣', keywords: 'rolando de rir rofl kkkk' },
      { char: '🥲', keywords: 'sorriso com lagrima emocionado' },
      { char: '🥹', keywords: 'olhos brilhando lagrima fofo comovido' },
      { char: '😊', keywords: 'timido feliz bochecha corada' },
      { char: '😇', keywords: 'anjo inocente aureola' },
      { char: '🙂', keywords: 'sorriso leve ok sim' },
      { char: '🙃', keywords: 'de cabeca para baixo ironia sarcasmo' },
      { char: '😉', keywords: 'piscadela piscando flerte segredo' },
      { char: '😌', keywords: 'aliviado paz calma' },
      { char: '😍', keywords: 'apaixonado coracao olhos amor amei' },
      { char: '🥰', keywords: 'apaixonado coracoes carinho amor' },
      { char: '😘', keywords: 'beijo beijinho amor' },
      { char: '😋', keywords: 'gostoso delicia lambendo comida' },
      { char: '😛', keywords: 'lingua para fora zoeira' },
      { char: '😜', keywords: 'lingua piscando zoeira zueira louco' },
      { char: '🤪', keywords: 'louco maluco zoeira pirado' },
      { char: '😝', keywords: 'lingua olhos fechados zoeira' },
      { char: '🤑', keywords: 'dinheiro grana rico dindin' },
      { char: '🤗', keywords: 'abraco abrindo maos fofo' },
      { char: '🤔', keywords: 'pensando duvida pensativo oque hum' },
      { char: '🫣', keywords: 'espiando olho tampado vergonha' },
      { char: '🤭', keywords: 'mao na boca risinho opa' },
      { char: '🤫', keywords: 'silencio segredo calado shh quieto' },
      { char: '🫡', keywords: 'continencia respeito sim senhor' },
      { char: '🤐', keywords: 'boca fechada ziper calado segredo' },
      { char: '🤨', keywords: 'sobrancelha levantada desconfiado serio' },
      { char: '😐', keywords: 'neutro sem expressao poker face uai' },
      { char: '😑', keywords: 'sem expressao serio cansado' },
      { char: '😏', keywords: 'sorriso de lado convencido flerte' },
      { char: '😒', keywords: 'desanimado desapontado aff' },
      { char: '🙄', keywords: 'revirando olhos aff tsc saco' },
      { char: '😬', keywords: 'dentes cerrados tenso eita fudeu' },
      { char: '🤥', keywords: 'mentiroso pinocchio nariz mentira' },
      { char: '😔', keywords: 'triste pensativo chateado' },
      { char: '🤤', keywords: 'babando delicia gostoso sono' },
      { char: '😴', keywords: 'dormindo sono cansado zzz' },
      { char: '😷', keywords: 'mascara doente doenca covid' },
      { char: '🤒', keywords: 'termometro febre doente mal' },
      { char: '🤢', keywords: 'enjoado nojo verde vomito' },
      { char: '🤮', keywords: 'vomitando vomito eca' },
      { char: '🥵', keywords: 'quente calor suor pegando fogo' },
      { char: '🥶', keywords: 'frio gelo congelando congelado' },
      { char: '🥴', keywords: 'tonto bebado meio tonto louco' },
      { char: '😵', keywords: 'tonto zonzo nocauteado morto' },
      { char: '🤯', keywords: 'mente explodindo cabeca explodiu choque uau' },
      { char: '🤠', keywords: 'cowboy vaqueiro chapeu' },
      { char: '🥳', keywords: 'festa comemoracao confete parabens' },
      { char: '😎', keywords: 'oculos escuros estilo maneiro top zika brabo' },
      { char: '🤓', keywords: 'nerd oculos inteligente geek' },
      { char: '🧐', keywords: 'monoculo curioso chique' },
      { char: '😕', keywords: 'confuso duvida estranho' },
      { char: '😟', keywords: 'preocupado apreensivo' },
      { char: '🥺', keywords: 'por favor fofo pedindo do dengo' },
      { char: '😢', keywords: 'chorando lagrima triste choro' },
      { char: '😭', keywords: 'chorando muito berro pranto socorro' },
      { char: '😱', keywords: 'gritando panico susto terror grito' },
      { char: '🥱', keywords: 'bocejo sono tedio' },
      { char: '😤', keywords: 'furioso bufando raiva ar' },
      { char: '😡', keywords: 'bravo irritado raiva vermelho' },
      { char: '😠', keywords: 'zangado bravo cara fechada' },
      { char: '🤬', keywords: 'palavrao xingamento puto revoltado' },
      { char: '😈', keywords: 'diabo chifres sorriso malicioso capeta' },
      { char: '💀', keywords: 'caveira morto rip morri zoeira esqueleto' },
      { char: '☠️', keywords: 'caveira pirata ossos perigo veneno' },
      { char: '💩', keywords: 'coco bosta coco zoeira' },
      { char: '🤡', keywords: 'palhaco palhacada coringa zoeira' },
      { char: '👻', keywords: 'fantasma boo susto halloween' },
      { char: '👽', keywords: 'alien et alienigena ovni' },
      { char: '👾', keywords: 'monstro gamer pixel arcade retro' },
      { char: '🤖', keywords: 'robo robot bot mecanico' }
    ]
  },
  {
    id: 'gestures',
    name: 'Mãos & Gestos',
    icon: '👍',
    emojis: [
      { char: '👍', keywords: 'positivo joinha legal blz beleza curti like top' },
      { char: '👎', keywords: 'negativo descurtir dislike ruim paia' },
      { char: '👊', keywords: 'soco toca aqui batida de mao broder' },
      { char: '✊', keywords: 'punho fechado forca luta' },
      { char: '🤛', keywords: 'soco esquerda toque' },
      { char: '🤜', keywords: 'soco direita toque' },
      { char: '👏', keywords: 'palmas aplausos parabens boa' },
      { char: '🙌', keywords: 'maos para cima vitoria comemoracao amem' },
      { char: '👐', keywords: 'maos abertas' },
      { char: '🤲', keywords: 'palmas juntas pedindo oracao' },
      { char: '🤝', keywords: 'aperto de mao acordo combinado fechado' },
      { char: '🙏', keywords: 'por favor obrigado amem gratidao oracao reza' },
      { char: '✍️', keywords: 'escrevendo caneta licao anotando' },
      { char: '💪', keywords: 'musculo forca forte treino academia shape' },
      { char: '👈', keywords: 'apontando esquerda' },
      { char: '👉', keywords: 'apontando direita olha' },
      { char: '👆', keywords: 'apontando cima sobe' },
      { char: '👇', keywords: 'apontando baixo desce' },
      { char: '☝️', keywords: 'um dedo apontando um momento' },
      { char: '✋', keywords: 'mao aberta pare chega alto' },
      { char: '🤚', keywords: 'costas da mao' },
      { char: '🖐️', keywords: 'cinco dedos mao aberta' },
      { char: '🖖', keywords: 'saudacao vulcano star trek vida longa' },
      { char: '👋', keywords: 'acenando tchau ola oi adeus' },
      { char: '🤙', keywords: 'hang loose liga nois de boa surf' },
      { char: '🤌', keywords: 'gesto italiano ma che ma oque' },
      { char: '🤏', keywords: 'pouquinho pouco um tico pequeno' },
      { char: '✌️', keywords: 'paz e amor vitoria dois dois' },
      { char: '🤞', keywords: 'dedos cruzados sorte torcendo tomara' },
      { char: '🫰', keywords: 'coracao com os dedos dorama kpop coreano' },
      { char: '🤟', keywords: 'te amo i love you rock' },
      { char: '🤘', keywords: 'rock metal rockeiro metalero chifre' },
      { char: '👀', keywords: 'olhos olhando de olho vigiando atento' },
      { char: '🧠', keywords: 'cerebro mente inteligencia qe qi' },
      { char: '💋', keywords: 'beijo marca de batom boca' }
    ]
  },
  {
    id: 'hearts',
    name: 'Corações & Emoções',
    icon: '❤️',
    emojis: [
      { char: '❤️', keywords: 'coracao vermelho amor carinho paixao s2' },
      { char: '🧡', keywords: 'coracao laranja' },
      { char: '💛', keywords: 'coracao amarelo amizade' },
      { char: '💚', keywords: 'coracao verde esperanca' },
      { char: '💙', keywords: 'coracao azul confianca' },
      { char: '💜', keywords: 'coracao roxo misterio bts' },
      { char: '🖤', keywords: 'coracao preto trevoso luto gotico' },
      { char: '🤍', keywords: 'coracao branco paz luz' },
      { char: '🤎', keywords: 'coracao marrom' },
      { char: '💔', keywords: 'coracao partido desiludido dor triste fim' },
      { char: '❤️‍🔥', keywords: 'coracao em chamas fogo paixao ardente' },
      { char: '❤️‍🩹', keywords: 'coracao curado curando recuperando' },
      { char: '❣️', keywords: 'exclamacao de coracao amor' },
      { char: '💕', keywords: 'dois coracoes amor fofo' },
      { char: '💞', keywords: 'coracoes girando amor' },
      { char: '💓', keywords: 'coracao batendo vibrando paixao' },
      { char: '💗', keywords: 'coracao crescendo amor' },
      { char: '💖', keywords: 'coracao brilhante brilho estrelas fofo' },
      { char: '💘', keywords: 'cupido flecha no coracao flechado' },
      { char: '💝', keywords: 'coracao com fita presente carinho' },
      { char: '🔥', keywords: 'fogo chama quente brabo hype top demais' },
      { char: '✨', keywords: 'brilho estrelas magia especial top lindo' },
      { char: '🌟', keywords: 'estrela brilhando estrela ouro nota dez' },
      { char: '⭐', keywords: 'estrela amarela favorita' },
      { char: '⚡', keywords: 'raio trovao choque energia eletricidade flash' },
      { char: '💥', keywords: 'explosao boom pow estalo barulho' },
      { char: '🎉', keywords: 'festa confete comemoracao aniversario parabens' },
      { char: '🎊', keywords: 'bola de confete carnaval comemoracao' },
      { char: '🎈', keywords: 'balao bexiga festa aniversario' }
    ]
  },
  {
    id: 'gaming',
    name: 'Jogos & Geek',
    icon: '🎮',
    emojis: [
      { char: '🎮', keywords: 'videogame jogo controle gamer playstation xbox pc' },
      { char: '🕹️', keywords: 'joystick fliperama arcade retro nostalgia' },
      { char: '🎲', keywords: 'dado sorte rpg tabuleiro cassino' },
      { char: '🎯', keywords: 'alvo certeiro mira dardo precisao bingo' },
      { char: '🏆', keywords: 'trofeu vitoria campeao primeiro lugar ouro' },
      { char: '🥇', keywords: 'medalha de ouro primeiro lugar 1' },
      { char: '🥈', keywords: 'medalha de prata segundo lugar 2' },
      { char: '🥉', keywords: 'medalha de bronze terceiro lugar 3' },
      { char: '🏅', keywords: 'medalha militar honra' },
      { char: '👾', keywords: 'space invaders monstro pixel gamer retro 8bit' },
      { char: '🤖', keywords: 'robo bot automacao tecnologia' },
      { char: '🚀', keywords: 'foguete espacial lua to the moon lancamento voando' },
      { char: '🛸', keywords: 'disco voador ovni alien ufo' },
      { char: '💣', keywords: 'bomba pavio explosivo perigo tnt' },
      { char: '⚔️', keywords: 'espadas cruzadas batalha duelo pvp guerra combate' },
      { char: '🛡️', keywords: 'escudo protecao defesa armor' },
      { char: '👑', keywords: 'coroa rei rainha mestre monarca realeza' },
      { char: '💎', keywords: 'diamante joia pedra preciosa raro luxo shine' },
      { char: '🎧', keywords: 'fone de ouvido headset musica som gamer' },
      { char: '🎤', keywords: 'microfone cantar voz podcast show' },
      { char: '🎵', keywords: 'nota musical musica melodia som' },
      { char: '🎶', keywords: 'notas musicais musica ritmo' },
      { char: '🎸', keywords: 'guitarra rock som musica instrumento' }
    ]
  },
  {
    id: 'food',
    name: 'Comidas & Bebidas',
    icon: '🍕',
    emojis: [
      { char: '🍕', keywords: 'pizza queijo pedaco comida lanche' },
      { char: '🍔', keywords: 'hamburguer burger lanche mcdonalds comida' },
      { char: '🍟', keywords: 'batata frita fries salgado lanche' },
      { char: '🌭', keywords: 'hotdog cachorro quente salsicha lanche' },
      { char: '🍿', keywords: 'pipoca cinema filme serie comida' },
      { char: '🥓', keywords: 'bacon toucinho carne comida cafe' },
      { char: '🍳', keywords: 'ovo frito frigideira cafe da manha' },
      { char: '🥩', keywords: 'carne bife churrasco churras carne vermelha' },
      { char: '🍗', keywords: 'coxa de frango frango frito comida' },
      { char: '🌮', keywords: 'taco comida mexicana comida' },
      { char: '🌯', keywords: 'burrito enrolado comida mexicana' },
      { char: '🍜', keywords: 'lamen ramen macarrao miojo sopa tigela' },
      { char: '🍣', keywords: 'sushi peixe cru japa comida japonesa' },
      { char: '🍦', keywords: 'sorvete casquinha gelado doce' },
      { char: '🍩', keywords: 'donut rosquinha doce guloseima' },
      { char: '🍪', keywords: 'cookie biscoito bolacha chocolate' },
      { char: '🍫', keywords: 'chocolate barra de chocolate doce cacau' },
      { char: '🎂', keywords: 'bolo de aniversario parabens festa doce' },
      { char: '☕', keywords: 'cafe xicara cafezinho expresso quente' },
      { char: '🍺', keywords: 'cerveja chopp caneca gelada alcool bar breja' },
      { char: '🍻', keywords: 'brinde cervejas tim tim bar festa' },
      { char: '🍷', keywords: 'vinho taca uva drink' },
      { char: '🥤', keywords: 'copo com canudo refrigerante suco refri coca' }
    ]
  },
  {
    id: 'nature',
    name: 'Animais & Natureza',
    icon: '🐱',
    emojis: [
      { char: '🐶', keywords: 'cachorro cao dog pet filhote auau' },
      { char: '🐱', keywords: 'gato felino miau pet gatinho' },
      { char: '🐭', keywords: 'rato camundongo' },
      { char: '🐹', keywords: 'hamster fofo roedor' },
      { char: '🐰', keywords: 'coelho coelhinho pascoa' },
      { char: '🦊', keywords: 'raposa astuta laranja' },
      { char: '🐻', keywords: 'urso fofo marrom teddy' },
      { char: '🐼', keywords: 'panda urso panda fofo bambu' },
      { char: '🐨', keywords: 'coala eucalipto fofo austrália' },
      { char: '🐯', keywords: 'tigre felino listrado' },
      { char: '🦁', keywords: 'leao rei da selva juba' },
      { char: '🐮', keywords: 'vaca muuu leite' },
      { char: '🐷', keywords: 'porco porquinho oink' },
      { char: '🐸', keywords: 'sapo perereca verde coaxar' },
      { char: '🐵', keywords: 'macaco mico banana fofo' },
      { char: '🙈', keywords: 'macaco cobrindo os olhos nao vejo nada' },
      { char: '🐔', keywords: 'galinha frango cocorico' },
      { char: '🐧', keywords: 'pinguim gelo polo frio' },
      { char: '🐦', keywords: 'passaro passarinho ave voar' },
      { char: '🦅', keywords: 'aguia rapina voo forte' },
      { char: '🦉', keywords: 'coruja sabedoria noite' },
      { char: '🐺', keywords: 'lobo auuu alcateia noite' },
      { char: '🦄', keywords: 'unicornio magia arco iris conto' },
      { char: '🐝', keywords: 'abelha mel zumbido flor' },
      { char: '🦋', keywords: 'borboleta asas linda natureza' },
      { char: '🌸', keywords: 'flor de cerejeira sakura rosa primavera' },
      { char: '🌹', keywords: 'rosa vermelha flor romantico' },
      { char: '🌻', keywords: 'girassol flor amarelo sol' },
      { char: '🍀', keywords: 'trevo de quatro folhas sorte trevo' }
    ]
  }
];

function insertEmojiAtCursor(emoji) {
  if (!chatInput) return;
  const start = chatInput.selectionStart || chatInput.value.length;
  const end = chatInput.selectionEnd || chatInput.value.length;
  const val = chatInput.value;
  chatInput.value = val.substring(0, start) + emoji + val.substring(end);
  const newPos = start + emoji.length;
  chatInput.setSelectionRange(newPos, newPos);
  chatInput.focus();
}

function renderEmojiPicker(filterQuery = '') {
  if (!emojiPickerBody) return;
  emojiPickerBody.innerHTML = '';
  const cleanFilter = (filterQuery || '').trim().toLowerCase();

  let totalRendered = 0;

  EMOJI_CATEGORIES.forEach(cat => {
    const matchingEmojis = cat.emojis.filter(item => {
      if (!cleanFilter) return true;
      return item.keywords.includes(cleanFilter) || item.char.includes(cleanFilter);
    });

    if (matchingEmojis.length === 0) return;

    totalRendered += matchingEmojis.length;
    const section = document.createElement('div');
    section.className = 'emoji-category-section';
    section.id = `emoji-section-${cat.id}`;

    const title = document.createElement('div');
    title.className = 'emoji-category-title';
    title.textContent = cat.name;
    section.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'emoji-grid';

    matchingEmojis.forEach(item => {
      const btn = document.createElement('span');
      btn.className = 'emoji-item';
      btn.textContent = item.char;
      btn.title = item.keywords.split(' ')[0] || item.char;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        insertEmojiAtCursor(item.char);
      });
      grid.appendChild(btn);
    });

    section.appendChild(grid);
    emojiPickerBody.appendChild(section);
  });

  if (totalRendered === 0) {
    emojiPickerBody.innerHTML = `
      <div class="emoji-no-results">
        Nenhum emoji encontrado para "<strong>${escapeHtml(cleanFilter)}</strong>" 🙁
      </div>
    `;
  }
}

function openEmojiPicker() {
  if (!emojiPickerPopover) return;
  renderEmojiPicker(emojiSearchInput ? emojiSearchInput.value : '');
  emojiPickerPopover.style.display = 'flex';
  if (emojiSearchInput) {
    emojiSearchInput.focus();
  }
}

function closeEmojiPicker() {
  if (!emojiPickerPopover) return;
  emojiPickerPopover.style.display = 'none';
  if (emojiSearchInput) emojiSearchInput.value = '';
}

function toggleEmojiPicker() {
  if (!emojiPickerPopover) return;
  if (emojiPickerPopover.style.display === 'flex') {
    closeEmojiPicker();
  } else {
    openEmojiPicker();
  }
}

if (btnEmojiTrigger) {
  btnEmojiTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleEmojiPicker();
  });
}

if (emojiSearchInput) {
  emojiSearchInput.addEventListener('input', (e) => {
    renderEmojiPicker(e.target.value);
  });
}

emojiNavBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    emojiNavBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const catId = btn.getAttribute('data-category');
    if (emojiSearchInput && emojiSearchInput.value) {
      emojiSearchInput.value = '';
      renderEmojiPicker('');
    }
    const targetSection = document.getElementById(`emoji-section-${catId}`);
    if (targetSection && emojiPickerBody) {
      targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Fechar emoji picker ao clicar fora
document.addEventListener('click', (e) => {
  if (emojiPickerPopover && emojiPickerPopover.style.display === 'flex') {
    if (!emojiPickerPopover.contains(e.target) && e.target !== btnEmojiTrigger) {
      closeEmojiPicker();
    }
  }
});

// Fechar com ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && emojiPickerPopover && emojiPickerPopover.style.display === 'flex') {
    closeEmojiPicker();
  }
});

// ==========================================
// COLAR IMAGEM DIRETO DO CLIPBOARD (CTRL + V)
// ==========================================
let isPastingImage = false;

async function handleImagePasteFromClipboard(e) {
  if (isPastingImage) return;

  const clipboardData = e.clipboardData || window.clipboardData;
  if (!clipboardData || !clipboardData.items) return;

  const active = document.activeElement;
  // Se o foco estiver em outro input que não seja o chatInput, ignora (ex: campos de busca ou modal)
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') && active !== chatInput) {
    return;
  }

  let imageItem = null;
  for (let i = 0; i < clipboardData.items.length; i++) {
    const item = clipboardData.items[i];
    if (item.type && item.type.startsWith('image/')) {
      imageItem = item;
      break;
    }
  }

  if (!imageItem) return; // Não é imagem, deixa o comportamento normal de colar texto acontecer

  e.preventDefault();
  if (typeof e.stopPropagation === 'function') e.stopPropagation();

  const file = imageItem.getAsFile();
  if (!file) return;

  isPastingImage = true;

  const timestamp = Date.now();
  const safeFileName = file.name && file.name !== 'image.png' ? file.name : `screenshot-${timestamp}.png`;

  if (typeof showSoundToast === 'function') {
    showSoundToast('📸 Enviando captura de tela colada...');
  }

  const formData = new FormData();
  formData.append('file', file, safeFileName);

  try {
    const res = await fetch('/api/chat-file', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      const captionText = chatInput ? chatInput.value.trim() : '';
      socket.emit('chat:send', {
        channelId: currentTextChannel,
        text: captionText || '📸 Captura de tela',
        attachmentUrl: data.url
      });
      if (chatInput) chatInput.value = '';
      if (typeof showSoundToast === 'function') {
        showSoundToast('✅ Imagem enviada com sucesso!');
      }
    } else {
      alert('Erro ao enviar imagem colada: ' + (data.error || 'Falha no upload'));
    }
  } catch (err) {
    console.error('[Paste ❌] Erro ao enviar imagem colada:', err);
    alert('Erro ao enviar captura de tela do clipboard.');
  } finally {
    setTimeout(() => {
      isPastingImage = false;
    }, 1500);
  }
}

// Escuta Ctrl+V globalmente (apenas uma vez para evitar duplo disparo por borbulhamento do chatInput para window)
window.addEventListener('paste', handleImagePasteFromClipboard);

// ==========================================
// CONEXÃO DE VOZ & TELA HD (MULTI-SALA)
// ==========================================
async function connectToVoiceChannel(roomId = 'gamezeda', roomName = 'Gamezeda', forceDirect = false) {
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
    if (isMobileView()) {
      closeAllDrawers();
    }
    return;
  }

  // Se já estiver em outro canal de voz e não for confirmação direta:
  // Abre o modal "Você tem certeza?" estilo Discord (a menos que o usuário tenha marcado 'Não perguntar de novo')
  const dontAsk = localStorage.getItem('discord_dont_ask_switch_voice') === 'true';
  if (inVoice && currentVoiceChannelId && currentVoiceChannelId !== roomId && !forceDirect && !dontAsk) {
    openSwitchVoiceModal(roomId, roomName);
    return;
  }

  if (inVoice) {
    leaveVoice(false, false);
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
        currentVoiceRoom: roomId,
        isMuted: !!isMuted,
        isDeafened: !!isDeafened
      });
    } else {
      const me = allVoiceRoomsState[roomId].find(u => (myId && u.id === myId) || (u.name && u.name.toLowerCase() === currentUser.name.toLowerCase()));
      if (me) {
        me.isMuted = !!isMuted;
        me.isDeafened = !!isDeafened;
      }
    }
  }

  renderSidebarChannels();
  renderVoiceStageCards();

  if (isMobileView()) {
    closeAllDrawers();
  }

  // Emite entrada no socket IMEDIATAMENTE (sem esperar microfone) com o status atual de mute/deaf
  socket.emit('voice:join', {
    roomId,
    isMuted: !!isMuted,
    isDeafened: !!isDeafened
  });

  webrtc.ensureAudioContext();
  if (typeof webrtc.setDeafened === 'function') {
    webrtc.setDeafened(isDeafened);
  }
  sounds.playJoin();

  // Conecta o microfone em paralelo sem travar a interface nem exigir segundo clique
  webrtc.startAudio().catch(err => {
    console.warn('[WebRTC] Aviso ao inicializar áudio:', err);
  });
}

function leaveVoice(playAudio = true, switchChat = true) {
  try {
    if (playAudio && inVoice) sounds.playLeave();
  } catch (e) {}

  try {
    if (webrtc) webrtc.leaveVoice();
  } catch (e) {}

  try {
    if (typeof stopMusicTrack === 'function') stopMusicTrack();
  } catch (e) {}

  try {
    if (typeof stopWatchPartyVideo === 'function') stopWatchPartyVideo();
  } catch (e) {}

  inVoice = false;
  isScreenSharing = false;
  isCameraActive = false;
  currentVoiceChannelId = null;

  try {
    unregisterStream('local');
    unregisterStream('local-camera');
  } catch (e) {}

  if (voiceStatusBox) voiceStatusBox.style.display = 'none';
  if (typeof closeNoiseSuppressionPopover === 'function') closeNoiseSuppressionPopover();
  if (btnVoiceCamera) {
    btnVoiceCamera.classList.remove('active-stream');
    btnVoiceCamera.style.background = '';
    btnVoiceCamera.style.color = '';
  }

  // Oculta o palco de voz e garante a reabertura do chat de mensagens se switchChat for true
  if (switchChat) {
    if (videoStage) videoStage.style.display = 'none';
    if (messagesContainer) messagesContainer.style.display = 'flex';
    const wrapper = document.querySelector('.chat-input-wrapper');
    if (wrapper) wrapper.style.display = 'block';
  }

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

  // 4. Retorna IMEDIATAMENTE para o chat de texto que está selecionado (padrão Discord, ex: #geral)
  if (switchChat) {
    const targetChannel = currentTextChannel || 'geral';
    switchTextChannel(targetChannel);
  }

  // 5. Re-renderiza IMEDIATAMENTE a interface completa (canais, membros, cards)
  renderSidebarChannels();
  renderMembersSidebar();
  renderVoiceStageCards();
}

quickDisconnectBtn.addEventListener('click', () => leaveVoice(true));
btnStageDisconnect.addEventListener('click', () => leaveVoice(true));

const voiceStatusInfo = voiceStatusBox ? voiceStatusBox.querySelector('.voice-status-info') : null;
if (voiceStatusInfo) {
  voiceStatusInfo.style.cursor = 'pointer';
  voiceStatusInfo.title = 'Clique para abrir o palco de voz';
  voiceStatusInfo.addEventListener('click', () => {
    if (inVoice && videoStage) {
      videoStage.style.display = 'flex';
      messagesContainer.style.display = 'none';
      const wrapper = document.querySelector('.chat-input-wrapper');
      if (wrapper) wrapper.style.display = 'none';
    }
  });
}

// ==========================================
// MODAL: CONFIRMAR TROCA DE CANAL DE VOZ
// ==========================================
function openSwitchVoiceModal(roomId, roomName) {
  pendingSwitchVoiceChannel = { id: roomId, name: roomName };
  if (switchVoiceTargetName) {
    switchVoiceTargetName.textContent = roomName;
  }
  if (checkDontAskSwitchVoice) {
    checkDontAskSwitchVoice.checked = false;
  }
  if (modalSwitchVoice) {
    modalSwitchVoice.style.display = 'flex';
  }
}

function closeSwitchVoiceModal() {
  pendingSwitchVoiceChannel = null;
  if (modalSwitchVoice) {
    modalSwitchVoice.style.display = 'none';
  }
}

if (btnCancelSwitchVoice) {
  btnCancelSwitchVoice.addEventListener('click', closeSwitchVoiceModal);
}

if (btnCloseSwitchVoice) {
  btnCloseSwitchVoice.addEventListener('click', closeSwitchVoiceModal);
}

if (btnConfirmSwitchVoice) {
  btnConfirmSwitchVoice.addEventListener('click', async () => {
    if (!pendingSwitchVoiceChannel) {
      closeSwitchVoiceModal();
      return;
    }

    if (checkDontAskSwitchVoice && checkDontAskSwitchVoice.checked) {
      localStorage.setItem('discord_dont_ask_switch_voice', 'true');
    }

    const { id, name } = pendingSwitchVoiceChannel;
    closeSwitchVoiceModal();
    // Efetua a troca para a nova sala de voz
    await connectToVoiceChannel(id, name, true);
  });
}

if (modalSwitchVoice) {
  modalSwitchVoice.addEventListener('click', (e) => {
    if (e.target === modalSwitchVoice) {
      closeSwitchVoiceModal();
    }
  });
}

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
    return;
  }

  // Se estiver no aplicativo Electron Desktop (Jogos Bolados PC), abre o seletor personalizado estilo Discord
  if (window.electronAPI && window.electronAPI.isElectron && typeof window.openElectronScreenPickerModal === 'function') {
    window.openElectronScreenPickerModal();
    return;
  }

  // Se estiver no navegador Web, usa o seletor nativo do navegador
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

// ==========================================
// TRANSMISSÃO DE CÂMERA / WEBCAM
// ==========================================
let isCameraActive = false;

async function toggleCamera() {
  if (!inVoice) {
    const firstVoice = allChannels.find(c => c.type === 'voice') || { id: 'gamezeda', name: 'Gamezeda' };
    await connectToVoiceChannel(firstVoice.id, firstVoice.name);
  }

  if (isCameraActive) {
    if (webrtc) await webrtc.stopCamera();
    unregisterStream('local-camera');
    isCameraActive = false;
    if (btnVoiceCamera) {
      btnVoiceCamera.classList.remove('active-stream');
      btnVoiceCamera.style.background = '';
      btnVoiceCamera.style.color = '';
    }
    showSoundToast('📷 Câmera desativada');
  } else {
    try {
      if (btnVoiceCamera) btnVoiceCamera.disabled = true;
      const stream = await webrtc.startCamera();
      if (stream) {
        isCameraActive = true;
        registerStream('local-camera', stream, `${currentUser ? currentUser.name : 'Você'} (Sua Câmera)`, currentUser ? currentUser.avatar : '', true);
        if (btnVoiceCamera) {
          btnVoiceCamera.classList.add('active-stream');
          btnVoiceCamera.style.background = '#23a55a';
          btnVoiceCamera.style.color = '#ffffff';
        }
        showSoundToast('📷 Câmera ativada com sucesso!');
      }
    } catch (err) {
      console.error('Erro em toggleCamera:', err);
      if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
        showSoundToast('❌ Permissão de câmera não concedida no navegador.');
      } else if (err.name === 'NotFoundError') {
        showSoundToast('❌ Nenhuma câmera encontrada neste dispositivo.');
      } else {
        showSoundToast('❌ Falha ao iniciar câmera: ' + (err.message || 'Erro'));
      }
    } finally {
      if (btnVoiceCamera) btnVoiceCamera.disabled = false;
    }
  }
}

if (btnVoiceCamera) {
  btnVoiceCamera.addEventListener('click', () => toggleCamera());
}

// ==========================================
// POPOVER DE SUPRESSÃO DE RUÍDO (RNNOISE - XIPH.ORG)
// ==========================================
function updateNoiseSuppressionUI(enabled) {
  if (noisePopoverToggle) noisePopoverToggle.checked = enabled;
  if (settingNoiseSuppressionToggle) settingNoiseSuppressionToggle.checked = enabled;

  const statusText = document.getElementById('rnnoise-status-text');
  const dot = document.querySelector('.rnnoise-live-dot');
  if (statusText) {
    statusText.textContent = enabled ? 'Inteligência Artificial Ativa' : 'Supressão Desativada (Áudio Direto)';
    statusText.style.color = enabled ? '#ffffff' : '#949ba4';
  }
  if (dot) {
    dot.style.background = enabled ? '#23a55a' : '#80848e';
    dot.style.boxShadow = enabled ? '0 0 6px #23a55a' : 'none';
  }
  if (btnNoiseSuppression) {
    btnNoiseSuppression.classList.toggle('active', enabled);
  }
}

function openNoiseSuppressionPopover() {
  if (!noiseSuppressionPopover) return;
  if (noiseSuppressionPopover.style.display === 'flex') {
    closeNoiseSuppressionPopover();
    return;
  }

  updateNoiseSuppressionUI(webrtc.noiseSuppressionEnabled);
  noiseSuppressionPopover.style.display = 'flex';
  if (btnNoiseSuppression) btnNoiseSuppression.classList.add('active');
  if (window.lucide) window.lucide.createIcons();
}

function closeNoiseSuppressionPopover() {
  if (!noiseSuppressionPopover) return;
  noiseSuppressionPopover.style.display = 'none';
  if (btnNoiseSuppression) btnNoiseSuppression.classList.remove('active');
}

if (btnNoiseSuppression) {
  btnNoiseSuppression.addEventListener('click', (e) => {
    e.stopPropagation();
    openNoiseSuppressionPopover();
  });
}

if (btnCloseNoisePopover) {
  btnCloseNoisePopover.addEventListener('click', (e) => {
    e.stopPropagation();
    closeNoiseSuppressionPopover();
  });
}

if (noisePopoverToggle) {
  noisePopoverToggle.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    webrtc.setNoiseSuppression(enabled);
    updateNoiseSuppressionUI(enabled);
    showSoundToast(enabled ? '⚡ Supressão de Ruído RNNoise ativada!' : '🔇 Supressão de Ruído RNNoise desativada');
  });
}

function syncMuteStatusToServer() {
  if (inVoice) {
    socket.emit('voice:mute-status', {
      isMuted: !!isMuted,
      isDeafened: !!isDeafened
    });
  }

  // Atualização otimista imediata na sala de voz atual
  if (currentUser && currentVoiceChannelId && allVoiceRoomsState[currentVoiceChannelId]) {
    const myId = socket ? socket.id : null;
    const me = allVoiceRoomsState[currentVoiceChannelId].find(u => (myId && u.id === myId) || (u.name && u.name.toLowerCase() === currentUser.name.toLowerCase()));
    if (me) {
      me.isMuted = !!isMuted;
      me.isDeafened = !!isDeafened;
    }
  }

  renderSidebarChannels();
  renderVoiceStageCards();
  renderMembersSidebar();
}

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
  syncMuteStatusToServer();
});
btnStageMic.addEventListener('click', () => btnToggleMic.click());

btnToggleDeaf.addEventListener('click', () => {
  isDeafened = !isDeafened;
  btnToggleDeaf.classList.toggle('active-muted', isDeafened);
  if (typeof webrtc !== 'undefined' && webrtc && typeof webrtc.setDeafened === 'function') {
    webrtc.setDeafened(isDeafened);
  }
  document.querySelectorAll('audio').forEach(a => {
    a.muted = isDeafened;
  });
  syncMuteStatusToServer();
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

  // Sincroniza toggle de supressão de ruído RNNoise
  updateNoiseSuppressionUI(webrtc.noiseSuppressionEnabled);
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

if (settingNoiseSuppressionToggle) {
  settingNoiseSuppressionToggle.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    webrtc.setNoiseSuppression(enabled);
    updateNoiseSuppressionUI(enabled);
    showSoundToast(enabled ? '⚡ Supressão de Ruído RNNoise ativada!' : '🔇 Supressão de Ruído RNNoise desativada');
  });
}

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

if (btnDownloadDesktop) {
  btnDownloadDesktop.addEventListener('click', () => {
    showSoundToast('Iniciando download do Jogos Bolados para Windows...');
    window.location.href = '/download/windows';
  });
}

// ==========================================
// MODAL DE DOWNLOAD MOBILE (QR CODE ANDROID / iOS)
// ==========================================
let currentMobilePlatform = 'android';

function updateMobileModal(platform) {
  currentMobilePlatform = platform;
  const origin = window.location.origin;
  const isAndroid = platform === 'android';

  if (tabPlatformAndroid && tabPlatformIos) {
    if (isAndroid) {
      tabPlatformAndroid.classList.add('active');
      tabPlatformIos.classList.remove('active', 'tab-ios');
    } else {
      tabPlatformAndroid.classList.remove('active');
      tabPlatformIos.classList.add('active', 'tab-ios');
    }
  }

  const endpoint = isAndroid ? '/download/android' : '/download/ios';
  const fullUrl = `${origin}${endpoint}`;

  if (qrCodeCaption) {
    qrCodeCaption.textContent = isAndroid
      ? 'Aponte a câmera para baixar o APK Android'
      : 'Aponte a câmera do seu iPhone / iPad';
  }

  if (qrCodeUrlPill) {
    qrCodeUrlPill.textContent = fullUrl;
  }

  if (btnDirectDownloadMobile) {
    btnDirectDownloadMobile.href = endpoint;
  }

  if (btnDirectDownloadLabel) {
    btnDirectDownloadLabel.textContent = isAndroid
      ? 'Baixar APK Direto (Android)'
      : 'Abrir no iOS (Apple)';
  }

  if (mobilePlatformTip) {
    mobilePlatformTip.innerHTML = isAndroid
      ? '💡 <strong>Dica Android:</strong> Se solicitado pelo navegador do celular, autorize a instalação de arquivos APK desconhecidos para concluir a instalação.'
      : '🍏 <strong>Dica iOS:</strong> Abra no Safari e toque em "Compartilhar" > "Adicionar à Tela de Início" ou instale via Expo / TestFlight.';
  }

  if (qrCodeImg) {
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(fullUrl)}&bgcolor=ffffff&color=111214&margin=1`;
    qrCodeImg.src = qrSrc;
    qrCodeImg.onerror = () => {
      // Fallback redundante para QR Code
      qrCodeImg.src = `https://quickchart.io/qr?size=220&text=${encodeURIComponent(fullUrl)}`;
    };
  }
}

function openMobileModal() {
  if (!modalDownloadMobile) return;
  modalDownloadMobile.style.display = 'flex';
  updateMobileModal('android');
  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    lucide.createIcons();
  }
}

function closeMobileModal() {
  if (!modalDownloadMobile) return;
  modalDownloadMobile.style.display = 'none';
}

if (btnDownloadMobile) {
  btnDownloadMobile.addEventListener('click', openMobileModal);
}

if (btnCloseMobileModal) {
  btnCloseMobileModal.addEventListener('click', closeMobileModal);
}

if (btnDismissMobileModal) {
  btnDismissMobileModal.addEventListener('click', closeMobileModal);
}

if (modalDownloadMobile) {
  modalDownloadMobile.addEventListener('click', (e) => {
    if (e.target === modalDownloadMobile) {
      closeMobileModal();
    }
  });
}

if (tabPlatformAndroid) {
  tabPlatformAndroid.addEventListener('click', () => updateMobileModal('android'));
}

if (tabPlatformIos) {
  tabPlatformIos.addEventListener('click', () => updateMobileModal('ios'));
}

if (btnCopyMobileLink) {
  btnCopyMobileLink.addEventListener('click', async () => {
    const origin = window.location.origin;
    const endpoint = currentMobilePlatform === 'android' ? '/download/android' : '/download/ios';
    const link = `${origin}${endpoint}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const tempInput = document.createElement('input');
        tempInput.value = link;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
      }
      showSoundToast('Link copiado para a área de transferência! 📋');
    } catch (err) {
      showSoundToast(`Link: ${link}`);
    }
  });
}

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

  // 1. Volume do Usuário (Microfone / Voz)
  ctxVolumeSlider.value = config.volume;
  ctxVolumeVal.textContent = `${config.volume}%`;
  updateSliderBackground(ctxVolumeSlider, config.volume, 200);

  // 2. Volume da Transmissão (Tela / Áudio do Jogo)
  if (ctxScreenVolumeSlider) {
    const sVol = config.sfxMuted ? 0 : (config.screenVolume !== undefined ? config.screenVolume : 100);
    ctxScreenVolumeSlider.value = sVol;
    if (ctxScreenVolumeVal) ctxScreenVolumeVal.textContent = `${sVol}%`;
    updateSliderBackground(ctxScreenVolumeSlider, sVol, 200);
  }

  ctxCheckMute.classList.toggle('checked', config.muted);
  ctxCheckSfx.classList.toggle('checked', config.sfxMuted);
  ctxCheckVideo.classList.toggle('checked', config.videoDisabled);

  userContextMenu.style.display = 'flex';
  const menuWidth = 240;
  const menuHeight = 235;
  let posX = (e && e.clientX != null) ? e.clientX : Math.max(10, Math.floor(window.innerWidth / 2 - menuWidth / 2));
  let posY = (e && e.clientY != null) ? e.clientY : Math.max(10, Math.floor(window.innerHeight / 2 - menuHeight / 2));

  if (posX + menuWidth > window.innerWidth) {
    posX = Math.max(10, window.innerWidth - menuWidth - 10);
  }
  if (posY + menuHeight > window.innerHeight) {
    posY = Math.max(10, window.innerHeight - menuHeight - 10);
  }

  userContextMenu.style.left = `${posX}px`;
  userContextMenu.style.top = `${posY}px`;
}

function closeContextMenu() {
  if (userContextMenu) {
    userContextMenu.style.display = 'none';
  }
  currentContextPeerId = null;
}

if (btnCloseContextMenu) {
  btnCloseContextMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    closeContextMenu();
  });
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
  if (noiseSuppressionPopover && noiseSuppressionPopover.style.display === 'flex') {
    const clickedInsideNoise = noiseSuppressionPopover.contains(e.target);
    const clickedNoiseBtn = btnNoiseSuppression && btnNoiseSuppression.contains(e.target);
    if (!clickedInsideNoise && !clickedNoiseBtn) {
      closeNoiseSuppressionPopover();
    }
  }
});

// =========================================================================
// DESABILITAR MENU DE CONTEXTO PADRÃO DO NAVEGADOR EM TODO O SITE (DISCORD)
// =========================================================================
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const isCustomTrigger = e.target.closest('.voice-user-pill') ||
                          e.target.closest('.user-voice-card') ||
                          e.target.closest('.member-item') ||
                          e.target.closest('#main-screen-tile');
  // Se clicar com botão direito fora de um gatilho de usuário, fecha o menu de contexto
  if (!isCustomTrigger) {
    closeContextMenu();
  }
}, true);

window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
}, true);

// Fecha o menu de contexto ao clicar com botão direito ou esquerdo em qualquer lugar fora dele
document.addEventListener('mousedown', (e) => {
  // Se for clique com o botão direito (e.button === 2)
  if (e.button === 2) {
    const isCustomTrigger = e.target.closest('.voice-user-pill') ||
                            e.target.closest('.user-voice-card') ||
                            e.target.closest('.member-item') ||
                            e.target.closest('#main-screen-tile');
    if (!isCustomTrigger) {
      closeContextMenu();
    }
    return;
  }

  // Se for clique com o botão esquerdo (e.button === 0) fora do menu
  if (userContextMenu && userContextMenu.style.display === 'flex') {
    if (!userContextMenu.contains(e.target)) {
      closeContextMenu();
    }
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.key === 'Esc') {
    closeContextMenu();
    closeUserPopover();
    closeServerDropdown();
    closeSettingsModal();
    closeSoundboardModal();
    closeNoiseSuppressionPopover();
    closeAudioDriverFallbackModal();
    closeCreateChannelModal();
    closeCreateCategoryModal();
    closeDeleteModal();
    closeSwitchVoiceModal();
    closeMobileModal();
    if (addSoundModal) addSoundModal.style.display = 'none';
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
    if ((currentContextPeerId === 'bot-alfredo' || currentContextPeerId === 'bot-rythm') && typeof applyMusicBotVolume === 'function') {
      applyMusicBotVolume();
    }
  }
});
ctxVolumeSlider.addEventListener('click', (e) => e.stopPropagation());

if (ctxScreenVolumeSlider) {
  ctxScreenVolumeSlider.addEventListener('input', (e) => {
    const vol = parseInt(e.target.value, 10);
    if (ctxScreenVolumeVal) ctxScreenVolumeVal.textContent = `${vol}%`;
    updateSliderBackground(ctxScreenVolumeSlider, vol, 200);

    if (currentContextPeerId) {
      const config = getUserConfig(currentContextPeerId);
      if (vol === 0) {
        config.sfxMuted = true;
        config.screenVolume = 0;
        webrtc.setUserScreenAudioMuted(currentContextPeerId, true);
        webrtc.setUserScreenVolume(currentContextPeerId, 0);
      } else {
        config.sfxMuted = false;
        config.screenVolume = vol;
        config.lastScreenVolume = vol;
        webrtc.setUserScreenAudioMuted(currentContextPeerId, false);
        webrtc.setUserScreenVolume(currentContextPeerId, vol);
      }
      if (ctxCheckSfx) ctxCheckSfx.classList.toggle('checked', config.sfxMuted);

      if (currentViewedStreamId === currentContextPeerId) {
        updateScreenSoundControlsState();
      }
    }
  });
  ctxScreenVolumeSlider.addEventListener('click', (e) => e.stopPropagation());
}

ctxItemMute.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!currentContextPeerId) return;
  const config = getUserConfig(currentContextPeerId);
  config.muted = !config.muted;
  ctxCheckMute.classList.toggle('checked', config.muted);
  webrtc.setUserMuted(currentContextPeerId, config.muted);
  if ((currentContextPeerId === 'bot-alfredo' || currentContextPeerId === 'bot-rythm') && typeof applyMusicBotVolume === 'function') {
    applyMusicBotVolume();
  }
});

ctxItemSfx.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!currentContextPeerId) return;
  const config = getUserConfig(currentContextPeerId);
  config.sfxMuted = !config.sfxMuted;
  if (config.sfxMuted) {
    config.lastScreenVolume = config.screenVolume > 0 ? config.screenVolume : 100;
    config.screenVolume = 0;
    webrtc.setUserScreenAudioMuted(currentContextPeerId, true);
    webrtc.setUserScreenVolume(currentContextPeerId, 0);
  } else {
    const restoreVol = (config.lastScreenVolume && config.lastScreenVolume > 0) ? config.lastScreenVolume : 100;
    config.screenVolume = restoreVol;
    webrtc.setUserScreenAudioMuted(currentContextPeerId, false);
    webrtc.setUserScreenVolume(currentContextPeerId, restoreVol);
  }
  ctxCheckSfx.classList.toggle('checked', config.sfxMuted);
  if (ctxScreenVolumeSlider) {
    ctxScreenVolumeSlider.value = config.screenVolume;
    if (ctxScreenVolumeVal) ctxScreenVolumeVal.textContent = `${config.screenVolume}%`;
    updateSliderBackground(ctxScreenVolumeSlider, config.screenVolume, 200);
  }
  if (currentViewedStreamId === currentContextPeerId) {
    updateScreenSoundControlsState();
  }
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

// ==========================================
// SUPORTE AO CLIENTE DESKTOP (ELECTRON)
// ==========================================
function setupDesktopClient() {
  if (!window.electronAPI || !window.electronAPI.isElectron) {
    return;
  }

  document.body.classList.add('is-electron');

  const desktopTitlebar = document.getElementById('desktop-titlebar');
  const btnWinMinimize = document.getElementById('btn-desktop-minimize');
  const btnWinMaximize = document.getElementById('btn-desktop-maximize');
  const btnWinClose = document.getElementById('btn-desktop-close');
  const iconWinMaximize = document.getElementById('desktop-icon-maximize');

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
      // Ícone Restaurar (duas janelas sobrepostas)
      iconWinMaximize.innerHTML = `
        <rect width="7" height="7" x="3.5" y="1.5" fill="none" stroke="currentColor" stroke-width="1.1"></rect>
        <path d="M1.5 3.5v7h7" fill="none" stroke="currentColor" stroke-width="1.1"></path>
      `;
      if (btnWinMaximize) btnWinMaximize.title = 'Restaurar';
    } else {
      // Ícone Maximizar (um quadrado)
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
  // SELETOR DE TELAS E JANELAS (ELECTRON SCREEN SHARE HD ESTILO DISCORD)
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

    try {
      if (!inVoice) {
        const firstVoice = allChannels.find(c => c.type === 'voice') || { id: 'gamezeda', name: 'Gamezeda' };
        await connectToVoiceChannel(firstVoice.id, firstVoice.name);
      }

      const stream = await webrtc.startScreenShareWithDesktopSource(sourceIdToShare);
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
      console.error('Erro ao compartilhar tela selecionada:', err);
      showSoundToast('❌ Erro ao compartilhar tela: ' + (err.message || 'Erro'));
    }
  }

  function cancelScreenSelection() {
    if (modalScreenPicker) modalScreenPicker.style.display = 'none';
    if (window.electronAPI && window.electronAPI.cancelScreenPicker) {
      window.electronAPI.cancelScreenPicker();
    }
  }

  // Função global que abre o modal estilo Discord de seleção de tela no Electron
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
      if (!sources && window.electronAPI && window.electronAPI.getScreenSources) {
        sources = await window.electronAPI.getScreenSources();
      }
      activeSources = sources || [];

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
      if (gridScreenPicker) {
        gridScreenPicker.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; color: #ed4245;">Erro ao obter janelas e telas.</div>`;
      }
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

  if (btnConfirmScreenPicker) {
    btnConfirmScreenPicker.addEventListener('click', confirmScreenSelection);
  }
  if (btnCloseScreenPicker) {
    btnCloseScreenPicker.addEventListener('click', cancelScreenSelection);
  }
  if (btnCancelScreenPicker) {
    btnCancelScreenPicker.addEventListener('click', cancelScreenSelection);
  }

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
}

// Inicializa integração com cliente desktop se estiver no Electron
setupDesktopClient();

// ==========================================
// CLIENTE DO BOT DE MÚSICA ALFREDO (ÁUDIO SINCRONIZADO E MINI PLAYER)
// ==========================================
const musicAudio = document.getElementById('music-bot-audio');
const musicPlayerWidget = document.getElementById('music-player-widget');
const musicWidgetThumb = document.getElementById('music-widget-thumb');
const musicWidgetTitle = document.getElementById('music-widget-title');
const musicWidgetArtist = document.getElementById('music-widget-artist');
const musicBtnPlayPause = document.getElementById('music-btn-play-pause');
const musicPlayPauseIcon = document.getElementById('music-play-pause-icon');
const musicBtnSkip = document.getElementById('music-btn-skip');
const musicBtnStop = document.getElementById('music-btn-stop');
const musicTimeCurrent = document.getElementById('music-time-current');
const musicTimeTotal = document.getElementById('music-time-total');
const musicProgressBarFill = document.getElementById('music-progress-bar-fill');
const musicProgressBarWrap = document.getElementById('music-progress-bar-wrap');
const musicQuickSearchForm = document.getElementById('music-quick-search-form');
const musicQuickInput = document.getElementById('music-quick-input');

let hlsMusicInstance = null;
let currentMusicTrack = null;
let musicProgressTimer = null;
let isMusicPlaying = false;
let isMusicPaused = false;

function formatMusicSecs(sec) {
  if (!sec || isNaN(sec) || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function applyMusicBotVolume() {
  const cfg = getUserConfig('bot-alfredo');
  if (musicAudio) {
    musicAudio.muted = !!cfg.muted || isDeafened;
    musicAudio.volume = Math.max(0, Math.min(1, (cfg.volume !== undefined ? cfg.volume : 100) / 100));
  }
}

function updateMusicProgress() {
  if (!musicAudio || !currentMusicTrack) return;
  const current = musicAudio.currentTime || 0;
  const total = currentMusicTrack.duration || musicAudio.duration || 0;

  if (musicTimeCurrent) {
    musicTimeCurrent.textContent = formatMusicSecs(current);
  }
  if (musicTimeTotal) {
    musicTimeTotal.textContent = currentMusicTrack.isLive ? 'AO VIVO' : formatMusicSecs(total);
  }
  if (musicProgressBarFill) {
    if (total > 0) {
      const pct = Math.min(100, (current / total) * 100);
      musicProgressBarFill.style.width = `${pct}%`;
    } else {
      musicProgressBarFill.style.width = '100%';
    }
  }
}

function updatePlayPauseButtonIcon(paused) {
  if (!musicPlayPauseIcon) return;
  if (paused) {
    musicPlayPauseIcon.setAttribute('data-lucide', 'play');
  } else {
    musicPlayPauseIcon.setAttribute('data-lucide', 'pause');
  }
  if (window.lucide) window.lucide.createIcons();
}

function handleAutoplayBlocked() {
  const resumeOnGesture = () => {
    if (musicAudio && isMusicPlaying && !isMusicPaused && musicAudio.paused) {
      musicAudio.play().catch(() => {});
    }
  };
  document.addEventListener('click', resumeOnGesture, { once: true });
  document.addEventListener('keydown', resumeOnGesture, { once: true });
}

function playMusicTrack(track, position = 0, isPaused = false) {
  if (!track || !track.streamUrl) return;
  currentMusicTrack = track;
  isMusicPlaying = true;
  isMusicPaused = isPaused;

  applyMusicBotVolume();

  if (musicPlayerWidget) {
    musicPlayerWidget.style.display = 'flex';
  }
  if (musicWidgetThumb) {
    musicWidgetThumb.src = track.thumbnail || 'https://api.dicebear.com/7.x/bottts/svg?seed=AlfredoBot&backgroundColor=5865f2';
  }
  if (musicWidgetTitle) {
    musicWidgetTitle.textContent = track.title || 'Música';
    musicWidgetTitle.title = track.title || '';
  }
  if (musicWidgetArtist) {
    musicWidgetArtist.textContent = `${track.artist || 'Alfredo'} • Pedido por ${track.requestedBy || 'Membro'}`;
  }
  if (musicTimeTotal) {
    musicTimeTotal.textContent = track.isLive ? 'AO VIVO' : (track.durationStr || formatMusicSecs(track.duration));
  }

  updatePlayPauseButtonIcon(isPaused);

  const streamUrl = track.streamUrl;
  const isHls = streamUrl.includes('.m3u8') || streamUrl.includes('/hls');

  if (window.Hls && window.Hls.isSupported() && isHls) {
    if (hlsMusicInstance) {
      hlsMusicInstance.destroy();
      hlsMusicInstance = null;
    }
    hlsMusicInstance = new window.Hls({
      enableWorker: true,
      lowLatencyMode: false
    });
    hlsMusicInstance.loadSource(streamUrl);
    hlsMusicInstance.attachMedia(musicAudio);
    hlsMusicInstance.on(window.Hls.Events.MANIFEST_PARSED, () => {
      applyMusicBotVolume();
      if (position > 0) {
        try { musicAudio.currentTime = position; } catch (e) {}
      }

      if (!isPaused) {
        musicAudio.play().catch(e => {
          console.log('[MusicBot 🎵] Autoplay aguardando interação do usuário:', e);
          handleAutoplayBlocked();
        });
      }
    });
    hlsMusicInstance.on(window.Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        console.warn('[MusicBot ⚠️] Erro HLS fatal:', data.type);
      }
    });
  } else {
    if (hlsMusicInstance) {
      hlsMusicInstance.destroy();
      hlsMusicInstance = null;
    }
    musicAudio.src = streamUrl;
    applyMusicBotVolume();
    if (position > 0) {
      try { musicAudio.currentTime = position; } catch (e) {}
    }
    if (!isPaused) {
      musicAudio.play().catch(e => {
        console.log('[MusicBot 🎵] Autoplay aguardando interação:', e);
        handleAutoplayBlocked();
      });
    }
  }

  if (musicProgressTimer) clearInterval(musicProgressTimer);
  musicProgressTimer = setInterval(updateMusicProgress, 500);
}

function pauseMusicTrack() {
  isMusicPaused = true;
  if (musicAudio) musicAudio.pause();
  updatePlayPauseButtonIcon(true);
}

function resumeMusicTrack() {
  isMusicPaused = false;
  applyMusicBotVolume();
  if (musicAudio) musicAudio.play().catch(e => console.log(e));
  updatePlayPauseButtonIcon(false);
}

function stopMusicTrack() {
  isMusicPlaying = false;
  isMusicPaused = false;
  currentMusicTrack = null;
  if (musicProgressTimer) {
    clearInterval(musicProgressTimer);
    musicProgressTimer = null;
  }
  if (hlsMusicInstance) {
    hlsMusicInstance.destroy();
    hlsMusicInstance = null;
  }
  if (musicAudio) {
    musicAudio.pause();
    musicAudio.removeAttribute('src');
    musicAudio.load();
  }
  if (musicPlayerWidget) {
    musicPlayerWidget.style.display = 'none';
  }
  if (musicProgressBarFill) {
    musicProgressBarFill.style.width = '0%';
  }
  if (musicTimeCurrent) {
    musicTimeCurrent.textContent = '0:00';
  }
}

// Socket Listeners para eventos de Música do Servidor
socket.on('music:play', ({ track, position, isPaused }) => {
  console.log('[MusicBot 🎵] Recebido comando de reprodução:', track.title);
  playMusicTrack(track, position, isPaused);
});

socket.on('music:pause', () => {
  pauseMusicTrack();
});

socket.on('music:resume', () => {
  resumeMusicTrack();
});

socket.on('music:stop', () => {
  stopMusicTrack();
});

socket.on('music:queue-update', ({ currentTrack, queue, isPlaying, isPaused }) => {
  if (currentTrack && isPlaying) {
    if (!isMusicPlaying || (currentMusicTrack && currentMusicTrack.id !== currentTrack.id)) {
      playMusicTrack(currentTrack, 0, isPaused);
    }
  } else if (!isPlaying) {
    stopMusicTrack();
  }
});

// Ações disparadas pelos botões do Mini Player
if (musicBtnPlayPause) {
  musicBtnPlayPause.addEventListener('click', () => {
    if (isMusicPaused) {
      socket.emit('music:action', { action: 'resume' });
    } else {
      socket.emit('music:action', { action: 'pause' });
    }
  });
}

if (musicBtnSkip) {
  musicBtnSkip.addEventListener('click', () => {
    socket.emit('music:action', { action: 'skip' });
  });
}

if (musicBtnStop) {
  musicBtnStop.addEventListener('click', () => {
    socket.emit('music:action', { action: 'stop' });
  });
}

if (musicProgressBarWrap) {
  musicProgressBarWrap.addEventListener('click', (e) => {
    if (!musicAudio || !currentMusicTrack || !currentMusicTrack.duration) return;
    const rect = musicProgressBarWrap.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    musicAudio.currentTime = pct * currentMusicTrack.duration;
    updateMusicProgress();
  });
}

if (musicQuickSearchForm) {
  musicQuickSearchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = musicQuickInput ? musicQuickInput.value.trim() : '';
    if (!query) return;

    if (!inVoice) {
      if (typeof showSoundToast === 'function') {
        showSoundToast('Você precisa estar em um canal de voz para tocar música!');
      }
      return;
    }

    socket.emit('music:action', { action: 'play', query });
    if (musicQuickInput) musicQuickInput.value = '';
  });
}

// ==========================================
// CLIENTE ASSISTIR JUNTOS (WATCH PARTY YOUTUBE)
// ==========================================
const watchPartyTile = document.getElementById('watch-party-tile');
const watchPartyTitleBadge = document.getElementById('watch-party-title-badge');
const btnToggleWatchPartySound = document.getElementById('btn-toggle-watch-party-sound');
const watchPartySoundIcon = document.getElementById('watch-party-sound-icon');
const watchPartyVolumeSlider = document.getElementById('watch-party-volume-slider');
const watchPartyVolumeVal = document.getElementById('watch-party-volume-val');
const btnWatchPartyAdd = document.getElementById('btn-watch-party-add');
const btnWatchPartySkip = document.getElementById('btn-watch-party-skip');
const btnFullscreenWatchParty = document.getElementById('btn-fullscreen-watch-party');
const btnStopWatchParty = document.getElementById('btn-stop-watch-party');
const ytPlayerContainer = document.getElementById('yt-player-container');
const btnStageWatchParty = document.getElementById('btn-stage-watch-party');
const modalWatchParty = document.getElementById('modal-watch-party');
const btnCloseWatchPartyModal = document.getElementById('btn-close-watch-party-modal');
const btnCancelWatchPartyModal = document.getElementById('btn-cancel-watch-party-modal');
const watchPartySearchForm = document.getElementById('watch-party-search-form');
const inputWatchPartyQuery = document.getElementById('input-watch-party-query');
const btnWatchPartySearch = document.getElementById('btn-watch-party-search');
const watchPartyLoading = document.getElementById('watch-party-loading');
const watchPartyResultsList = document.getElementById('watch-party-results-list');

let ytPlayer = null;
let isYtApiReady = false;
let ytApiPromise = null;
let isRemoteAction = false;
let currentWatchPartyVideoId = null;
let isWatchPartyMuted = false;
let watchPartyVolume = 100;

function ensureYouTubeApi() {
  if (isYtApiReady && window.YT && window.YT.Player) {
    return Promise.resolve();
  }
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      isYtApiReady = true;
      return resolve();
    }
    const oldCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      isYtApiReady = true;
      if (typeof oldCallback === 'function') oldCallback();
      resolve();
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScript = document.getElementsByTagName('script')[0];
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(tag, firstScript);
      } else {
        document.head.appendChild(tag);
      }
    }
  });
  return ytApiPromise;
}

function stopWatchPartyVideo() {
  currentWatchPartyVideoId = null;
  if (watchPartyTile) {
    watchPartyTile.style.display = 'none';
    watchPartyTile.classList.remove('fullscreen');
  }
  if (watchPartyTitleBadge) {
    watchPartyTitleBadge.textContent = 'Nenhum vídeo';
  }
  if (ytPlayer && typeof ytPlayer.stopVideo === 'function') {
    try { ytPlayer.stopVideo(); } catch (e) {}
  }
}

async function loadOrUpdateWatchPartyPlayer(videoId, startSeconds = 0, isPaused = false) {
  if (!videoId) {
    stopWatchPartyVideo();
    return;
  }

  await ensureYouTubeApi();

  if (watchPartyTile) {
    watchPartyTile.style.display = 'flex';
  }

  // Se o player já existe no DOM e estamos apenas trocando o vídeo ou atualizando posição
  if (ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
    if (currentWatchPartyVideoId !== videoId) {
      currentWatchPartyVideoId = videoId;
      isRemoteAction = true;
      ytPlayer.loadVideoById({
        videoId: videoId,
        startSeconds: startSeconds || 0
      });
      if (isPaused) {
        setTimeout(() => {
          try { ytPlayer.pauseVideo(); } catch (e) {}
        }, 400);
      }
      setTimeout(() => { isRemoteAction = false; }, 1200);
    } else {
      // Mesmo vídeo, sincroniza se o desvio for superior a 2 segundos
      try {
        const cur = ytPlayer.getCurrentTime ? ytPlayer.getCurrentTime() : 0;
        if (Math.abs(cur - startSeconds) > 2) {
          isRemoteAction = true;
          ytPlayer.seekTo(startSeconds, true);
          setTimeout(() => { isRemoteAction = false; }, 800);
        }
        if (isPaused) {
          ytPlayer.pauseVideo();
        } else {
          ytPlayer.playVideo();
        }
      } catch (e) {}
    }
    return;
  }

  // Cria a primeira instância do YT.Player
  currentWatchPartyVideoId = videoId;
  const container = document.getElementById('yt-player-container');
  if (!container) return;
  container.innerHTML = '<div id="yt-player"></div>';

  try {
    ytPlayer = new window.YT.Player('yt-player', {
      videoId: videoId,
      playerVars: {
        autoplay: isPaused ? 0 : 1,
        controls: 1,
        disablekb: 0,
        enablejsapi: 1,
        fs: 1,
        modestbranding: 1,
        rel: 0,
        origin: window.location.origin
      },
      events: {
        onReady: (event) => {
          try {
            event.target.setVolume(watchPartyVolume);
            if (isWatchPartyMuted) event.target.mute();
            if (startSeconds > 0) event.target.seekTo(startSeconds, true);
            if (isPaused) {
              event.target.pauseVideo();
            } else {
              event.target.playVideo();
            }
          } catch (e) {}
        },
        onStateChange: (event) => {
          if (isRemoteAction) return;

          // YT.PlayerState.PLAYING = 1
          if (event.data === 1) {
            const time = Math.floor(event.target.getCurrentTime ? event.target.getCurrentTime() : 0);
            socket.emit('watchparty:resume', { currentTime: time });
          }
          // YT.PlayerState.PAUSED = 2
          else if (event.data === 2) {
            const time = Math.floor(event.target.getCurrentTime ? event.target.getCurrentTime() : 0);
            socket.emit('watchparty:pause', { currentTime: time });
          }
          // YT.PlayerState.ENDED = 0
          else if (event.data === 0) {
            socket.emit('watchparty:skip');
          }
        }
      }
    });
  } catch (err) {
    console.error('[WatchParty ❌] Erro ao instanciar YT.Player:', err);
  }
}

// Controles do Quadro de Vídeo
if (watchPartyVolumeSlider) {
  watchPartyVolumeSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    watchPartyVolume = val;
    if (watchPartyVolumeVal) watchPartyVolumeVal.textContent = `${val}%`;
    if (ytPlayer && typeof ytPlayer.setVolume === 'function') {
      ytPlayer.setVolume(val);
      if (val === 0) {
        isWatchPartyMuted = true;
        ytPlayer.mute();
        if (watchPartySoundIcon) watchPartySoundIcon.setAttribute('data-lucide', 'volume-x');
      } else if (isWatchPartyMuted) {
        isWatchPartyMuted = false;
        ytPlayer.unMute();
        if (watchPartySoundIcon) watchPartySoundIcon.setAttribute('data-lucide', 'volume-2');
      }
      if (window.lucide) window.lucide.createIcons();
    }
  });
}

if (btnToggleWatchPartySound) {
  btnToggleWatchPartySound.addEventListener('click', () => {
    isWatchPartyMuted = !isWatchPartyMuted;
    if (ytPlayer) {
      if (isWatchPartyMuted) {
        if (typeof ytPlayer.mute === 'function') ytPlayer.mute();
        if (watchPartySoundIcon) watchPartySoundIcon.setAttribute('data-lucide', 'volume-x');
      } else {
        if (typeof ytPlayer.unMute === 'function') ytPlayer.unMute();
        if (watchPartySoundIcon) watchPartySoundIcon.setAttribute('data-lucide', 'volume-2');
      }
      if (window.lucide) window.lucide.createIcons();
    }
  });
}

if (btnFullscreenWatchParty) {
  btnFullscreenWatchParty.addEventListener('click', () => {
    if (watchPartyTile) {
      watchPartyTile.classList.toggle('fullscreen');
    }
  });
}

if (btnStopWatchParty) {
  btnStopWatchParty.addEventListener('click', () => {
    socket.emit('watchparty:stop');
    stopWatchPartyVideo();
  });
}

if (btnWatchPartySkip) {
  btnWatchPartySkip.addEventListener('click', () => {
    socket.emit('watchparty:skip');
  });
}

if (btnWatchPartyAdd) {
  btnWatchPartyAdd.addEventListener('click', () => {
    openWatchPartyModal();
  });
}

// Modal de Busca e Seleção de Vídeo
function openWatchPartyModal() {
  if (!inVoice) {
    if (typeof showSoundToast === 'function') {
      showSoundToast('Você precisa estar conectado a um canal de voz para usar o Assistir Juntos!');
    }
    return;
  }
  if (modalWatchParty) {
    modalWatchParty.style.display = 'flex';
    if (inputWatchPartyQuery) {
      inputWatchPartyQuery.focus();
    }
  }
}

function closeWatchPartyModal() {
  if (modalWatchParty) {
    modalWatchParty.style.display = 'none';
  }
  if (inputWatchPartyQuery) inputWatchPartyQuery.value = '';
}

if (btnStageWatchParty) {
  btnStageWatchParty.addEventListener('click', () => {
    openWatchPartyModal();
  });
}

if (btnCloseWatchPartyModal) {
  btnCloseWatchPartyModal.addEventListener('click', closeWatchPartyModal);
}

if (btnCancelWatchPartyModal) {
  btnCancelWatchPartyModal.addEventListener('click', closeWatchPartyModal);
}

if (modalWatchParty) {
  modalWatchParty.addEventListener('click', (e) => {
    if (e.target === modalWatchParty) {
      closeWatchPartyModal();
    }
  });
}

if (watchPartySearchForm) {
  watchPartySearchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = inputWatchPartyQuery ? inputWatchPartyQuery.value.trim() : '';
    if (!query) return;

    // Se for URL direta do YouTube ou ID direto, inicia diretamente
    const isDirectLink = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/.test(query) || /^[a-zA-Z0-9_-]{11}$/.test(query);
    if (isDirectLink) {
      socket.emit('watchparty:start', { query });
      closeWatchPartyModal();
      return;
    }

    if (watchPartyLoading) watchPartyLoading.style.display = 'block';
    if (watchPartyResultsList) watchPartyResultsList.innerHTML = '';

    socket.emit('watchparty:search', { query }, (response) => {
      if (watchPartyLoading) watchPartyLoading.style.display = 'none';
      if (!response || !response.success || !response.results || response.results.length === 0) {
        if (watchPartyResultsList) {
          watchPartyResultsList.innerHTML = `
            <div style="text-align: center; padding: 24px; color: #949ba4; font-size: 13.5px;">
              Nenhum vídeo encontrado para "<strong>${escapeHtml(query)}</strong>". Tente outro termo ou cole o link direto!
            </div>
          `;
        }
        return;
      }
      renderWatchPartyResults(response.results);
    });
  });
}

function renderWatchPartyResults(results) {
  if (!watchPartyResultsList) return;
  watchPartyResultsList.innerHTML = '';

  results.forEach(video => {
    const item = document.createElement('div');
    item.className = 'watch-party-item';
    item.innerHTML = `
      <div class="watch-party-item-thumb-box">
        <img src="${video.thumbnail}" alt="${escapeHtml(video.title)}">
        <span class="watch-party-item-duration">${video.durationStr || '0:00'}</span>
      </div>
      <div class="watch-party-item-info">
        <span class="watch-party-item-title" title="${escapeHtml(video.title)}">${escapeHtml(video.title)}</span>
        <span class="watch-party-item-author">${escapeHtml(video.author)}</span>
      </div>
      <button type="button" class="watch-party-btn-action" title="Assistir Agora">
        <i data-lucide="play" style="width: 14px; height: 14px;"></i>
        <span>Assistir</span>
      </button>
    `;

    item.addEventListener('click', () => {
      socket.emit('watchparty:start', { query: video.videoId });
      closeWatchPartyModal();
    });

    watchPartyResultsList.appendChild(item);
  });

  if (window.lucide) window.lucide.createIcons();
}

// Sockets de Sincronização do Watch Party
socket.on('watchparty:init', (state) => {
  if (!inVoice) return;
  if (!state || !state.isActive || !state.videoId) {
    stopWatchPartyVideo();
    return;
  }

  if (watchPartyTitleBadge) {
    watchPartyTitleBadge.textContent = state.title ? `${state.title} (${state.durationStr || '0:00'})` : 'Assistindo Vídeo';
    watchPartyTitleBadge.title = state.title || '';
  }

  loadOrUpdateWatchPartyPlayer(state.videoId, state.currentTime || 0, state.isPaused);
});

socket.on('watchparty:pause', ({ currentTime, triggeredBy }) => {
  if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
    isRemoteAction = true;
    if (currentTime !== undefined) {
      try { ytPlayer.seekTo(currentTime, true); } catch (e) {}
    }
    try { ytPlayer.pauseVideo(); } catch (e) {}
    setTimeout(() => { isRemoteAction = false; }, 800);
  }
});

socket.on('watchparty:resume', ({ currentTime, triggeredBy }) => {
  if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
    isRemoteAction = true;
    if (currentTime !== undefined) {
      try { ytPlayer.seekTo(currentTime, true); } catch (e) {}
    }
    try { ytPlayer.playVideo(); } catch (e) {}
    setTimeout(() => { isRemoteAction = false; }, 800);
  }
});

socket.on('watchparty:seek', ({ currentTime, triggeredBy }) => {
  if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
    isRemoteAction = true;
    try { ytPlayer.seekTo(currentTime, true); } catch (e) {}
    setTimeout(() => { isRemoteAction = false; }, 800);
  }
});

socket.on('watchparty:stop', () => {
  stopWatchPartyVideo();
});
