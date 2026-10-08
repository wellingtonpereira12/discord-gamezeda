import { sounds } from './sounds.js?v=20261008_v1.1.7';
import { WebRTCManager } from './webrtc.js?v=20261007_v1.1.4';
import {
  escapeHtml,
  formatBytes,
  formatMusicSecs,
  formatGameDuration,
  isMobileView,
  getOrCreateDeviceId,
  regenerateDeviceId,
  updateAppHeight,
  applyMobileAppFixes
} from './js/modules/utils.js?v=20261008_v1.3.0';
import {
  openImageLightbox,
  closeImageLightbox,
  copyImageToClipboard,
  copyLinkToClipboard,
  downloadImageFile,
  initImageLightboxAndClipboard
} from './js/modules/lightbox.js?v=20261008_v1.3.0';
import {
  linkPreviewCache,
  extractFirstPreviewUrl,
  loadLinkPreview,
  renderEmbedCard,
  startInlineVideoPlayer
} from './js/modules/linkPreview.js?v=20261008_v1.3.0';
import { EMOJI_CATEGORIES } from './js/modules/emojiData.js?v=20261008_v1.3.0';
import {
  initEmojiPicker,
  openEmojiPicker,
  closeEmojiPicker,
  toggleEmojiPicker,
  insertEmojiAtCursor
} from './js/modules/emojiPicker.js?v=20261008_v1.3.0';
import {
  initSoundboard,
  openSoundboardModal,
  closeSoundboardModal,
  loadSoundboardSounds,
  playSoundLocally,
  showSoundToast
} from './js/modules/soundboard.js?v=20261008_v1.3.0';
import {
  initMobileModal,
  openMobileModal,
  closeMobileModal
} from './js/modules/mobileModal.js?v=20261008_v1.3.0';
import {
  initWatchParty,
  applyMusicBotVolume,
  updateMusicProgress,
  playMusicTrack,
  pauseMusicTrack,
  resumeMusicTrack,
  stopMusicTrack,
  loadOrUpdateWatchPartyPlayer,
  stopWatchPartyVideo
} from './js/modules/watchParty.js?v=20261008_v1.3.0';
import { setupDesktopClient } from './js/modules/desktopClient.js?v=20261008_v1.3.0';
import {
  initGuilds,
  renderGuildsList,
  selectGuild,
  setActiveGuild,
  getActiveGuildId
} from './js/modules/guilds.js?v=20261008_v1.3.4';
import {
  initDirectMessages,
  loadConversations,
  openDirectChat,
  getActiveDmTarget,
  clearActiveDmTarget
} from './js/modules/directMessages.js?v=20261008_v1.3.0';

if (window.lucide) {
  window.lucide.createIcons();
}

// Ajuste dinâmico de altura para Mobile
window.addEventListener('resize', updateAppHeight);
window.addEventListener('orientationchange', updateAppHeight);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', updateAppHeight);
}
updateAppHeight();

// Detecção de aplicativo Mobile
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

let localDeviceId = getOrCreateDeviceId();


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

// Card / Popout de Perfil Estilo Discord (Fase 2)
const btnCurrentUserProfile = document.getElementById('btn-current-user-profile');
const userProfileCardPopout = document.getElementById('user-profile-card-popout');
const popoutBanner = document.getElementById('popout-banner');
const btnCloseProfileCard = document.getElementById('btn-close-profile-card');
const popoutAvatar = document.getElementById('popout-avatar');
const popoutStatusBadge = document.getElementById('popout-status-badge');
const popoutName = document.getElementById('popout-name');
const popoutCustomStatus = document.getElementById('popout-custom-status');
const popoutGameBox = document.getElementById('popout-game-box');
const popoutGameTitle = document.getElementById('popout-game-title');
const popoutGameElapsed = document.getElementById('popout-game-elapsed');
const popoutBioSection = document.getElementById('popout-bio-section');
const popoutBioText = document.getElementById('popout-bio-text');
const btnPopoutPrimaryAction = document.getElementById('btn-popout-primary-action');
const btnPopoutLogout = document.getElementById('btn-popout-logout');

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
const videoGrid = document.getElementById('video-grid');
const btnStageGridMode = document.getElementById('btn-stage-grid-mode');
const btnStageGridText = document.getElementById('btn-stage-grid-text');
const btnStageScreen = document.getElementById('btn-stage-screen');
const btnStageScreenText = document.getElementById('btn-stage-screen-text');
const btnStageSoundboard = document.getElementById('btn-stage-soundboard');
const btnStageMic = document.getElementById('btn-stage-mic');
const btnStageDisconnect = document.getElementById('btn-stage-disconnect');

// Mini Player Flutuante (Picture-in-Picture - Fase 3)
const streamPipWidget = document.getElementById('stream-pip-widget');
const streamPipVideo = document.getElementById('stream-pip-video');
const streamPipName = document.getElementById('stream-pip-name');
const btnPipFullscreen = document.getElementById('btn-pip-fullscreen');
const btnPipClose = document.getElementById('btn-pip-close');

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

// Configurações de Qualidade de Transmissão de Tela (Screen Share) & Atualizações
const settingStreamResolution = document.getElementById('setting-stream-resolution');
const settingStreamFps = document.getElementById('setting-stream-fps');
const settingStreamBitrate = document.getElementById('setting-stream-bitrate');
const settingStreamDegradation = document.getElementById('setting-stream-degradation');
const settingsAppVersion = document.getElementById('settings-app-version');
const btnForceUpdate = document.getElementById('btn-force-update');
const btnForceUpdateIcon = document.getElementById('btn-force-update-icon');
const btnForceUpdateText = document.getElementById('btn-force-update-text');

// Configurações - Abas e Telas
const tabBtnVoice = document.getElementById('tab-btn-voice');
const tabBtnStream = document.getElementById('tab-btn-stream');
const tabBtnProfile = document.getElementById('tab-btn-profile');
const tabBtnAccount = document.getElementById('tab-btn-account');
const tabContentVoice = document.getElementById('tab-content-voice');
const tabContentStream = document.getElementById('tab-content-stream');
const tabContentProfile = document.getElementById('tab-content-profile');
const tabContentAccount = document.getElementById('tab-content-account');

// Configurações de Push-to-Talk (Fase 3)
const labelModeVad = document.getElementById('label-mode-vad');
const labelModePtt = document.getElementById('label-mode-ptt');
const pttKeyContainer = document.getElementById('ptt-key-container');
const btnRecordPttKey = document.getElementById('btn-record-ptt-key');
const btnResetPttKey = document.getElementById('btn-reset-ptt-key');
const pttKeyDisplay = document.getElementById('ptt-key-display');
const pttKeyHint = document.getElementById('ptt-key-hint');

// Configurações de Perfil (Fase 2)
const settingAvatarPreview = document.getElementById('setting-avatar-preview');
const settingAvatarInput = document.getElementById('setting-avatar-input');
const btnChooseAvatar = document.getElementById('btn-choose-avatar');
const btnResetAvatar = document.getElementById('btn-reset-avatar');
const settingBannerColor = document.getElementById('setting-banner-color');
const settingStatusMode = document.getElementById('setting-status-mode');
const settingCustomStatus = document.getElementById('setting-custom-status');
const countCustomStatus = document.getElementById('count-custom-status');
const settingBio = document.getElementById('setting-bio');
const countBio = document.getElementById('count-bio');
const profileSaveAlert = document.getElementById('profile-save-alert');
const btnSaveProfileSettings = document.getElementById('btn-save-profile-settings');
const previewBanner = document.getElementById('preview-banner');
const previewAvatar = document.getElementById('preview-avatar');
const previewStatusBadge = document.getElementById('preview-status-badge');
const previewUsername = document.getElementById('preview-username');
const previewCustomStatusText = document.getElementById('preview-custom-status-text');
const previewBioText = document.getElementById('preview-bio-text');

// Cadastro
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

// Fase 4: Contador de Mensagens Não Lidas & Indicadores de Barra de Tarefas
const unreadChannelCounts = new Map();
const originalAppTitle = document.title || 'FakeDC';

// ==========================================
// CONTROLE DE DRAWERS MOBILE (ESTILO DISCORD MOBILE)
// ==========================================

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

webrtc.onLocalScreenStopped = () => {
  if (isScreenSharing) {
    unregisterStream('local');
    isScreenSharing = false;
    btnStageScreen.classList.remove('active-stream');
    btnStageScreenText.textContent = 'Compartilhar Tela HD';
  }
};

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

  // Se o Modo Grade estiver ativo com múltiplas transmissões, renderiza todas na grade
  if (isGridModeActive && activeStreams.size > 1) {
    if (typeof renderGridStreams === 'function') renderGridStreams();
    renderStreamSwitcherBar();
    renderVoiceStageCards();
    renderSidebarChannels();
  } else if (isLocal || !currentViewedStreamId || !activeStreams.has(currentViewedStreamId)) {
    viewStream(id);
  } else {
    renderStreamSwitcherBar();
    renderVoiceStageCards();
    renderSidebarChannels();
  }
  if (typeof updateStreamPiP === 'function') updateStreamPiP();
}

function unregisterStream(id) {
  activeStreams.delete(id);

  if (isGridModeActive && typeof renderGridStreams === 'function') {
    renderGridStreams();
  }

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
  if (typeof updateStreamPiP === 'function') updateStreamPiP();
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
  if (typeof updateStreamPiP === 'function') updateStreamPiP();
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
  if (popoutAvatar) popoutAvatar.src = avatar;
  if (popoutName) popoutName.textContent = name;

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

function syncCurrentUserFromList() {
  if (currentUser && Array.isArray(allOnlineUsers)) {
    const myId = socket ? socket.id : null;
    const myName = currentUser.name.toLowerCase();
    const me = allOnlineUsers.find(u => (myId && u.id === myId) || (u.name && u.name.toLowerCase() === myName));
    if (me) {
      if (me.avatar) {
        currentUser.avatar = me.avatar;
        if (myAvatarImg) myAvatarImg.src = me.avatar;
        if (cardMyAvatar) cardMyAvatar.src = me.avatar;
      }
      if (me.bannerColor) currentUser.bannerColor = me.bannerColor;
      if (me.bio !== undefined) currentUser.bio = me.bio;
      if (me.customStatusText !== undefined) currentUser.customStatusText = me.customStatusText;
      if (me.statusMode) {
        currentUser.statusMode = me.statusMode;
      }
      updateMyUserStatus();
    }
  }
}

socket.on('init:state', (data) => {
  if (data.chatMessages) {
    Object.assign(channelMessagesStore, data.chatMessages);
  }
  if (data.currentUser) {
    currentUser = Object.assign(currentUser || {}, data.currentUser);
    if (myUsernameEl) myUsernameEl.textContent = currentUser.name;
    if (myAvatarImg) myAvatarImg.src = currentUser.avatar;
    if (cardMyAvatar) cardMyAvatar.src = currentUser.avatar;
    updateMyUserStatus();
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
  if (data.guilds) {
    renderGuildsList(data.guilds);
  }
  syncCurrentUserFromList();
  renderSidebarChannels();
  renderMembersSidebar();
  renderVoiceStageCards();
  renderCurrentChannelMessages();

  // Se já estava em canal de voz antes da reconexão ou atualização do servidor:
  // Re-sincroniza automaticamente a presença e peers WebRTC
  if (inVoice && currentVoiceChannelId) {
    console.log(`[Voz 🔄] Restaurando presença no canal de voz após atualização/reconexão: ${currentVoiceChannelId}`);
    socket.emit('voice:join', {
      roomId: currentVoiceChannelId,
      isMuted: !!isMuted,
      isDeafened: !!isDeafened
    });
  }
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
  syncCurrentUserFromList();
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
  } else if (currentVoiceChannelId && currentUser) {
    // Garante que o usuário local nunca suma do canal de voz visualmente durante flaps de rede
    if (!allVoiceRoomsState[currentVoiceChannelId]) {
      allVoiceRoomsState[currentVoiceChannelId] = [];
    }
    const hasMe = allVoiceRoomsState[currentVoiceChannelId].some(u =>
      (socket && u.id === socket.id) || (u.name && u.name.toLowerCase() === currentUser.name.toLowerCase())
    );
    if (!hasMe) {
      const myObj = {
        id: socket ? socket.id : 'me',
        name: currentUser.name,
        avatar: currentUser.avatar,
        inVoice: true,
        currentVoiceRoom: currentVoiceChannelId,
        isMuted: !!isMuted,
        isDeafened: !!isDeafened,
        isScreenSharing: !!isScreenSharing
      };
      allVoiceRoomsState[currentVoiceChannelId].push(myObj);
      if (!allVoiceUsers.some(u => (socket && u.id === socket.id) || (u.name && u.name.toLowerCase() === currentUser.name.toLowerCase()))) {
        allVoiceUsers.push(myObj);
      }
    }
  }

  // Remove automaticamente streams fantasmas de quem saiu da sala OU quem parou de compartilhar tela
  if (inVoice && Array.isArray(allVoiceUsers)) {
    const activeScreenSharers = new Set(allVoiceUsers.filter(u => u.isScreenSharing).map(u => u.id));
    for (const [streamId, sData] of activeStreams.entries()) {
      if (!sData.isLocal && !streamId.endsWith('-camera')) {
        if (!activeScreenSharers.has(streamId)) {
          if (webrtc && typeof webrtc.stopRemoteScreen === 'function') {
            webrtc.stopRemoteScreen(streamId);
          }
          unregisterStream(streamId);
        }
      }
    }
  }

  renderSidebarChannels();
  renderVoiceStageCards();
  renderMembersSidebar();
});

socket.on('channel:created', (newChannel) => {
  const currentGId = (window.getActiveGuildId && window.getActiveGuildId()) || 'gamezeda';
  if (newChannel.guildId && newChannel.guildId !== currentGId) return;
  const existingIdx = allChannels.findIndex(c => c.id === newChannel.id);
  if (existingIdx >= 0) allChannels[existingIdx] = newChannel;
  else allChannels.push(newChannel);
  renderSidebarChannels();
});

socket.on('channel:deleted', ({ channelId }) => {
  allChannels = allChannels.filter(c => c.id !== channelId);
  delete channelMessagesStore[channelId];
  if (unreadChannelCounts.has(channelId)) {
    unreadChannelCounts.delete(channelId);
    updateAppTitleAndBadges();
  }

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
  const currentGId = (window.getActiveGuildId && window.getActiveGuildId()) || 'gamezeda';
  if (newCat.guildId && newCat.guildId !== currentGId) return;
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
  if (!isSharing) {
    if (webrtc && typeof webrtc.stopRemoteScreen === 'function') {
      webrtc.stopRemoteScreen(peerId);
    }
    unregisterStream(peerId);
  }
});

socket.on('voice:peer-camera-status', ({ peerId, isActive }) => {
  if (!isActive) {
    unregisterStream(peerId);
    unregisterStream(`${peerId}-camera`);
  }
});

// Sons de Entrada e Saída de participantes na sala de voz (Discord Chimes)
socket.on('voice:peer-joined', ({ peerId, user }) => {
  if (inVoice && peerId !== socket.id && !isDeafened) {
    if (sounds && typeof sounds.playUserJoin === 'function') {
      sounds.playUserJoin();
    }
  }
});

socket.on('voice:peer-left', ({ peerId }) => {
  if (inVoice && peerId !== socket.id && !isDeafened) {
    if (sounds && typeof sounds.playUserLeave === 'function') {
      sounds.playUserLeave();
    }
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

// Ícone SVG de Game Controller oficial estilo Discord Rich Presence
function getGameIconSvg(size = 12, color = '#23a55a') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="game-controller-icon"><line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="6"/></svg>`;
}


let myGameActivity = null;
let activePopoutTargetUser = null;
let popoutGameInterval = null;
let popoutOpenedAt = 0;

function openUserProfileCard(user, triggerEl, clickEvent) {
  if (!userProfileCardPopout || !user) return;
  popoutOpenedAt = Date.now();
  activePopoutTargetUser = user;

  const isSelf = currentUser && (
    (user.name && user.name.toLowerCase() === currentUser.name.toLowerCase()) ||
    user.id === socket?.id
  );

  const bannerColor = user.bannerColor || user.banner_color || '#5865F2';
  const avatarUrl = user.avatar || user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.name || 'User')}`;
  const statusMode = (isSelf && currentUser?.statusMode) ? currentUser.statusMode : (user.statusMode || user.status_mode || 'online');
  const customStatus = (isSelf && currentUser?.customStatusText !== undefined) ? currentUser.customStatusText : (user.customStatusText || user.custom_status_text || '');
  const bio = (isSelf && currentUser?.bio !== undefined) ? currentUser.bio : (user.bio || '');

  // Preenche dados visuais
  if (popoutBanner) popoutBanner.style.backgroundColor = bannerColor;
  if (popoutAvatar) popoutAvatar.src = avatarUrl;
  if (popoutStatusBadge) {
    popoutStatusBadge.className = `profile-card-status-badge status-${statusMode}`;
  }
  if (popoutName) popoutName.textContent = user.name || 'Usuário';
  if (popoutCustomStatus) {
    popoutCustomStatus.textContent = customStatus || '';
    popoutCustomStatus.style.display = customStatus ? 'block' : 'none';
  }

  // Atividade de Jogo (Rich Presence)
  const activity = (isSelf && myGameActivity) ? myGameActivity : user.activity;
  if (activity && activity.game) {
    if (popoutGameBox) popoutGameBox.style.display = 'flex';
    if (popoutGameTitle) popoutGameTitle.textContent = activity.game;
    const updateElapsed = () => {
      if (popoutGameElapsed) {
        popoutGameElapsed.textContent = formatGameDuration(activity.startedAt);
      }
    };
    updateElapsed();
    if (popoutGameInterval) clearInterval(popoutGameInterval);
    popoutGameInterval = setInterval(updateElapsed, 5000);
  } else {
    if (popoutGameBox) popoutGameBox.style.display = 'none';
    if (popoutGameInterval) {
      clearInterval(popoutGameInterval);
      popoutGameInterval = null;
    }
  }

  // Bio / Sobre Mim
  if (popoutBioText) {
    popoutBioText.textContent = bio || 'Sem descrição.';
  }

  // Botões de ação
  if (isSelf) {
    if (btnPopoutPrimaryAction) {
      btnPopoutPrimaryAction.textContent = 'Editar Perfil';
      btnPopoutPrimaryAction.onclick = (e) => {
        if (e) e.stopPropagation();
        closeUserProfileCard();
        openSettingsModal('profile');
      };
    }
    if (btnPopoutLogout) {
      btnPopoutLogout.style.display = 'block';
      btnPopoutLogout.onclick = (e) => {
        if (e) e.stopPropagation();
        closeUserProfileCard();
        performLogout();
      };
    }
    const btnPopoutDmAction = document.getElementById('btn-popout-dm-action');
    if (btnPopoutDmAction) btnPopoutDmAction.style.display = 'none';
  } else {
    if (btnPopoutPrimaryAction) {
      btnPopoutPrimaryAction.textContent = 'Mencionar';
      btnPopoutPrimaryAction.onclick = (e) => {
        if (e) e.stopPropagation();
        closeUserProfileCard();
        if (chatInput) {
          const mentionText = `@${user.name} `;
          if (!chatInput.value.includes(mentionText)) {
            chatInput.value = `${chatInput.value}${mentionText}`;
          }
          chatInput.focus();
        }
      };
    }
    const btnPopoutDmAction = document.getElementById('btn-popout-dm-action');
    if (btnPopoutDmAction) {
      btnPopoutDmAction.style.display = 'block';
      btnPopoutDmAction.onclick = (e) => {
        if (e) e.stopPropagation();
        closeUserProfileCard();
        if (typeof window.startDirectMessage === 'function') {
          window.startDirectMessage(user.name);
        }
      };
    }
    if (btnPopoutLogout) btnPopoutLogout.style.display = 'none';
  }

  // Posicionamento inteligente na tela
  userProfileCardPopout.style.display = 'block';

  if (triggerEl && triggerEl.id === 'btn-current-user-profile') {
    const rect = triggerEl.getBoundingClientRect();
    userProfileCardPopout.style.left = `${Math.max(12, rect.left)}px`;
    userProfileCardPopout.style.bottom = `${Math.max(10, window.innerHeight - rect.top + 8)}px`;
    userProfileCardPopout.style.top = 'auto';
    userProfileCardPopout.style.right = 'auto';
  } else if (clickEvent) {
    const cardWidth = 320;
    const cardHeight = 360;
    let posX = clickEvent.clientX + 10;
    let posY = clickEvent.clientY - 20;

    if (posX + cardWidth > window.innerWidth) {
      posX = clickEvent.clientX - cardWidth - 10;
    }
    if (posY + cardHeight > window.innerHeight) {
      posY = window.innerHeight - cardHeight - 16;
    }
    if (posX < 10) posX = 10;
    if (posY < 10) posY = 10;

    userProfileCardPopout.style.left = `${posX}px`;
    userProfileCardPopout.style.top = `${posY}px`;
    userProfileCardPopout.style.bottom = 'auto';
    userProfileCardPopout.style.right = 'auto';
  } else if (triggerEl) {
    const rect = triggerEl.getBoundingClientRect();
    let posX = rect.right + 10;
    let posY = rect.top;
    if (posX + 320 > window.innerWidth) posX = rect.left - 330;
    if (posY + 360 > window.innerHeight) posY = window.innerHeight - 370;
    if (posX < 10) posX = 10;
    if (posY < 10) posY = 10;
    userProfileCardPopout.style.left = `${posX}px`;
    userProfileCardPopout.style.top = `${posY}px`;
    userProfileCardPopout.style.bottom = 'auto';
    userProfileCardPopout.style.right = 'auto';
  }

  if (window.lucide) window.lucide.createIcons();
}

function closeUserProfileCard() {
  if (userProfileCardPopout) {
    userProfileCardPopout.style.display = 'none';
  }
  if (popoutGameInterval) {
    clearInterval(popoutGameInterval);
    popoutGameInterval = null;
  }
  activePopoutTargetUser = null;
}

if (btnCloseProfileCard) {
  btnCloseProfileCard.addEventListener('click', (e) => {
    e.stopPropagation();
    closeUserProfileCard();
  });
}

function updateMyUserStatus() {
  const statusEl = document.getElementById('my-userstatus');
  if (!statusEl) return;
  const statusMode = currentUser?.statusMode || 'online';
  const myStatusDot = document.querySelector('.user-avatar-wrap .status-dot');
  if (myStatusDot) {
    myStatusDot.className = `status-dot status-${statusMode}`;
  }

  if (myGameActivity && myGameActivity.game) {
    statusEl.innerHTML = `
      <span class="my-status-game" title="Jogando ${escapeHtml(myGameActivity.game)} (${formatGameDuration(myGameActivity.startedAt)})">
        ${getGameIconSvg(11, '#23a55a')}
        <span>Jogando <strong>${escapeHtml(myGameActivity.game)}</strong></span>
      </span>
    `;
  } else if (currentUser && currentUser.customStatusText) {
    statusEl.innerHTML = `<span style="font-style: italic; color: #dbdee1;">${escapeHtml(currentUser.customStatusText)}</span>`;
  } else {
    const statusLabels = {
      online: 'Online',
      idle: 'Ausente',
      dnd: 'Não Perturbar',
      invisible: 'Invisível'
    };
    statusEl.textContent = statusLabels[statusMode] || 'Online';
  }
}

function createMemberItem(user, isVoice) {
  const div = document.createElement('div');
  div.className = 'member-item';
  div.setAttribute('data-member-id', user.id);

  const isLocal = user.id === socket.id;
  const isBot = !!user.isBot || user.id === 'bot-alfredo' || user.id === 'bot-rythm';
  const userIsMuted = isLocal ? isMuted : !!user.isMuted;
  const userIsDeafened = isLocal ? isDeafened : !!user.isDeafened;
  const statusMode = (isLocal && currentUser?.statusMode) ? currentUser.statusMode : (user.statusMode || 'online');

  // Atividade de Jogo (Rich Presence / Game Activity)
  const currentAct = (isLocal && myGameActivity) ? myGameActivity : user.activity;
  const hasGame = !!(currentAct && currentAct.game);

  let activityHtml = '';
  if (hasGame) {
    activityHtml = `
      <div class="member-game-status" title="Jogando ${escapeHtml(currentAct.game)} (${formatGameDuration(currentAct.startedAt)})">
        <span class="member-game-title">
          ${getGameIconSvg(12, '#23a55a')}
          <span><strong>Jogando</strong> ${escapeHtml(currentAct.game)}</span>
        </span>
        <span class="member-game-time" data-game-started="${currentAct.startedAt}">
          ${formatGameDuration(currentAct.startedAt)}
        </span>
      </div>
    `;
  } else {
    let activityText = 'Online';
    if (isVoice) activityText = '🔊 Em voz';
    else if (isBot) activityText = '🎵 !play para ouvir';
    else if (user.customStatusText) activityText = user.customStatusText;
    else if (statusMode === 'idle') activityText = 'Ausente';
    else if (statusMode === 'dnd') activityText = 'Não Perturbar';
    else if (statusMode === 'invisible') activityText = 'Invisível';

    activityHtml = `
      <span class="member-activity" style="${isVoice ? 'color: #23a55a;' : (isBot ? 'color: #5865F2;' : '')}">
        ${escapeHtml(activityText)}
      </span>
    `;
  }

  div.innerHTML = `
    <div class="member-avatar-wrap">
      <img class="member-avatar" src="${user.avatar}" alt="${user.name}">
      <div class="status-dot status-${statusMode}"></div>
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
      ${activityHtml}
    </div>
  `;

  // Clique abre o Card de Perfil estilo Discord
  div.addEventListener('click', (e) => {
    e.stopPropagation();
    openUserProfileCard(user, div, e);
  });

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
        const unreadCount = unreadChannelCounts.get(channel.id) || 0;
        const isCurrentActive = currentTextChannel === channel.id && document.hasFocus() && document.visibilityState === 'visible';
        const effectiveCount = isCurrentActive ? 0 : unreadCount;
        const hasUnread = effectiveCount > 0;

        item.className = `channel-item ${currentTextChannel === channel.id ? 'active' : ''} ${hasUnread ? 'has-unread' : ''}`;
        item.setAttribute('data-channel', channel.id);

        item.innerHTML = `
          ${hasUnread ? '<span class="channel-unread-pill"></span>' : ''}
          <div class="channel-item-left">
            <span class="channel-icon">#</span>
            <span class="channel-item-name">${escapeHtml(channel.name)}</span>
          </div>
          <div class="channel-item-right">
            ${effectiveCount > 0 ? `<span class="channel-unread-badge">${effectiveCount > 99 ? '99+' : effectiveCount}</span>` : ''}
            <div class="channel-item-actions">
              ${channel.id !== 'geral' ? `
                <button type="button" class="btn-channel-delete" title="Excluir Canal" data-channel-id="${channel.id}" data-channel-name="${escapeHtml(channel.name)}">
                  <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                </button>
              ` : ''}
            </div>
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
        ${myGameActivity && myGameActivity.game ? `
          <div class="voice-card-game-badge" title="Jogando ${escapeHtml(myGameActivity.game)} (${formatGameDuration(myGameActivity.startedAt)})">
            ${getGameIconSvg(11, '#23a55a')}
            <span>${escapeHtml(myGameActivity.game)}</span>
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
      <div class="card-name" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
          <span>${escapeHtml(user.name)}</span>
          ${isBot ? '<span class="bot-tag">BOT</span>' : ''}
          ${(user.isMuted || user.isDeafened) ? `
            <div class="voice-user-status-icons">
              ${user.isMuted ? getMuteIconSvg(13) : ''}
              ${user.isDeafened ? getDeafenIconSvg(13) : ''}
            </div>
          ` : ''}
        </div>
        ${user.activity && user.activity.game ? `
          <div class="voice-card-game-badge" title="Jogando ${escapeHtml(user.activity.game)} (${formatGameDuration(user.activity.startedAt)})">
            ${getGameIconSvg(11, '#23a55a')}
            <span>${escapeHtml(user.activity.game)}</span>
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

// ==========================================
// FASE 4: NOTIFICAÇÕES & DESKTOP (TOASTS, CONTADORES E FLASH TASKBAR)
// ==========================================

function updateAppTitleAndBadges() {
  const isAppFocused = document.hasFocus() && document.visibilityState === 'visible';
  let totalUnread = 0;

  unreadChannelCounts.forEach((count, chId) => {
    if (chId === currentTextChannel && isAppFocused) {
      unreadChannelCounts.delete(chId);
      return;
    }
    totalUnread += count;
  });

  // 1. Atualizar Título da Janela / Aba (Ex: "(3) FakeDC")
  if (totalUnread > 0) {
    document.title = `(${totalUnread}) ${originalAppTitle}`;
  } else {
    document.title = originalAppTitle;
  }

  // 2. Atualizar Badges e Pills nos Canais de Texto da Barra Lateral
  document.querySelectorAll('[data-channel]').forEach(chEl => {
    const chId = chEl.getAttribute('data-channel');
    const isCurrentActive = chId === currentTextChannel && isAppFocused;
    const count = isCurrentActive ? 0 : (unreadChannelCounts.get(chId) || 0);
    const hasUnread = count > 0;

    chEl.classList.toggle('has-unread', hasUnread);

    // Pill indicadora esquerda
    let pill = chEl.querySelector('.channel-unread-pill');
    if (hasUnread) {
      if (!pill) {
        pill = document.createElement('span');
        pill.className = 'channel-unread-pill';
        chEl.insertBefore(pill, chEl.firstChild);
      }
    } else if (pill) {
      pill.remove();
    }

    // Badge numérica à direita
    let badge = chEl.querySelector('.channel-unread-badge');
    let rightContainer = chEl.querySelector('.channel-item-right');
    if (hasUnread) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'channel-unread-badge';
        if (rightContainer) {
          rightContainer.insertBefore(badge, rightContainer.firstChild);
        } else {
          chEl.appendChild(badge);
        }
      }
      badge.textContent = count > 99 ? '99+' : count;
    } else if (badge) {
      badge.remove();
    }
  });

  // 3. Controle de piscar ícone na barra de tarefas do Windows (Electron flashFrame)
  if (totalUnread === 0 && window.electronAPI && typeof window.electronAPI.flashFrame === 'function') {
    window.electronAPI.flashFrame(false);
  }
}

function triggerDesktopNotification(channelId, message, isMentioned) {
  // Respeita status Não Perturbar (DND)
  if (currentUser && currentUser.statusMode === 'dnd') {
    return;
  }

  const isAppFocused = document.hasFocus() && document.visibilityState === 'visible';
  if (channelId === currentTextChannel && isAppFocused) {
    return;
  }

  const senderName = message.sender || 'Alguém';
  const title = isMentioned
    ? `📌 Menção de ${senderName} em #${channelId}`
    : `#${channelId} - ${senderName}`;

  let bodyText = message.text || '';
  if (!bodyText && message.attachmentUrl) {
    bodyText = 'Enviou um anexo 📎';
  }
  if (bodyText.length > 120) {
    bodyText = bodyText.substring(0, 117) + '...';
  }

  // 1. Notificação Nativa do Windows Toast via Electron
  if (window.electronAPI && typeof window.electronAPI.showNotification === 'function') {
    window.electronAPI.showNotification({
      title: title,
      body: bodyText,
      channelId: channelId
    });
    if (typeof window.electronAPI.flashFrame === 'function') {
      window.electronAPI.flashFrame(true);
    }
    return;
  }

  // 2. Notificação Web Nativa do Navegador (Chrome, Firefox, Edge, etc.)
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body: bodyText,
          icon: '/logo.png',
          tag: `channel-${channelId}`
        });
        notif.onclick = () => {
          window.focus();
          if (channelId) switchTextChannel(channelId);
          notif.close();
        };
      } catch (err) {
        console.warn('[Notification Web] Erro ao disparar:', err);
      }
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }
}

// Ouvinte para clique na notificação nativa do Windows no Electron
if (window.electronAPI && typeof window.electronAPI.onNotificationClicked === 'function') {
  window.electronAPI.onNotificationClicked(({ channelId }) => {
    if (channelId) {
      switchTextChannel(channelId);
    }
  });
}

// Limpeza de não lidas e cessar flashFrame ao focar na janela
window.addEventListener('focus', () => {
  if (currentTextChannel && unreadChannelCounts.has(currentTextChannel)) {
    unreadChannelCounts.delete(currentTextChannel);
  }
  updateAppTitleAndBadges();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && document.hasFocus()) {
    if (currentTextChannel && unreadChannelCounts.has(currentTextChannel)) {
      unreadChannelCounts.delete(currentTextChannel);
    }
    updateAppTitleAndBadges();
  }
});

// Solicitação inicial suave de permissão de notificação no navegador
if (!window.electronAPI && 'Notification' in window && Notification.permission === 'default') {
  const requestNotifOnFirstInteraction = () => {
    Notification.requestPermission().catch(() => {});
    window.removeEventListener('click', requestNotifOnFirstInteraction);
  };
  window.addEventListener('click', requestNotifOnFirstInteraction, { once: true });
}

function switchTextChannel(chName) {
  currentTextChannel = chName;
  if (unreadChannelCounts.has(chName)) {
    unreadChannelCounts.delete(chName);
  }
  updateAppTitleAndBadges();

  document.querySelectorAll('[data-channel]').forEach(c => {
    c.classList.toggle('active', c.getAttribute('data-channel') === chName);
  });
  document.querySelectorAll('[data-voice]').forEach(c => {
    c.classList.remove('active');
  });

  const chObj = (allChannels || []).find(c => c.id === chName);
  let displayName = chObj ? chObj.name : chName;
  if (displayName.startsWith('geral-guild-')) displayName = 'geral';

  currentChannelNameEl.textContent = displayName;
  chatInput.placeholder = `Conversar em #${displayName}`;

  if (videoStage) videoStage.style.display = 'none';
  if (messagesContainer) messagesContainer.style.display = 'flex';
  const chatInputWrap = document.querySelector('.chat-input-wrapper');
  if (chatInputWrap) chatInputWrap.style.display = 'block';
  if (typeof updateStreamPiP === 'function') updateStreamPiP();

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

  const chObj = (allChannels || []).find(c => c.id === currentTextChannel);
  let cleanDisplayName = chObj ? chObj.name : currentTextChannel;
  if (cleanDisplayName.startsWith('geral-guild-')) cleanDisplayName = 'geral';

  const welcomeBanner = document.createElement('div');
  welcomeBanner.className = 'channel-welcome-banner';
  welcomeBanner.innerHTML = `
    <div class="channel-welcome-icon">#</div>
    <h2 class="channel-welcome-title">Bem-vindo(a) a #${escapeHtml(cleanDisplayName)}!</h2>
    <p class="channel-welcome-desc">Este é o início do canal #${escapeHtml(cleanDisplayName)}.</p>
  `;
  messagesContainer.appendChild(welcomeBanner);

  if (messages.length === 0) {
    messagesContainer.classList.add('is-empty');
    return;
  }

  messagesContainer.classList.remove('is-empty');
  messages.forEach(msg => appendMessageToContainer(msg));
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// ==========================================
// FASE 1: ESTADO E ELEMENTOS SOCIAIS DO CHAT
// ==========================================
let activeReplyTarget = null;
let editingMessageId = null;
let messageToDelete = null;
let reactingMessageId = null;
let targetReactionMessageId = null;
let mentionSelectedIndex = 0;
let currentMentionCandidates = [];

const replyBar = document.getElementById('reply-bar');
const replyTargetSender = document.getElementById('reply-target-sender');
const replyTargetSnippet = document.getElementById('reply-target-snippet');
const btnCancelReply = document.getElementById('btn-cancel-reply');

const mentionAutocompletePopover = document.getElementById('mention-autocomplete-popover');
const mentionAutocompleteList = document.getElementById('mention-autocomplete-list');

const quickReactionPicker = document.getElementById('quick-reaction-picker');
const btnQuickReactMore = document.getElementById('btn-quick-react-more');

const deleteMessageModal = document.getElementById('delete-message-modal');
const btnCloseDeleteMessageModal = document.getElementById('btn-close-delete-message-modal');
const btnCancelDeleteMessage = document.getElementById('btn-cancel-delete-message');
const btnConfirmDeleteMessage = document.getElementById('btn-confirm-delete-message');
const deleteMessagePreview = document.getElementById('delete-message-preview');

const btnPinnedMessages = document.getElementById('btn-pinned-messages');
const pinnedMessagesPopover = document.getElementById('pinned-messages-popover');
const btnClosePinnedPopover = document.getElementById('btn-close-pinned-popover');
const pinnedMessagesList = document.getElementById('pinned-messages-list');

// Envio de mensagem de texto com suporte a resposta (reply) e DMs
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  const dmTarget = getActiveDmTarget();
  if (dmTarget) {
    socket.emit('dm:send', {
      receiver: dmTarget,
      text: text
    });
    chatInput.value = '';
    clearReplyTarget();
    closeMentionAutocomplete();
    return;
  }

  const payload = {
    channelId: currentTextChannel,
    text: text
  };

  if (activeReplyTarget) {
    payload.replyTo = {
      id: activeReplyTarget.id,
      sender: activeReplyTarget.sender,
      text: activeReplyTarget.text
    };
  }

  socket.emit('chat:send', payload);

  chatInput.value = '';
  clearReplyTarget();
  closeMentionAutocomplete();
});

let typingDebounceTimer = null;
if (chatInput) {
  chatInput.addEventListener('focus', () => {
    setTimeout(() => {
      updateAppHeight();
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 200);
  });

  // Autocomplete de Menções ao digitar @ e Emissão de Digitação
  chatInput.addEventListener('input', () => {
    handleMentionAutocomplete();

    if (socket) {
      const dmTarget = getActiveDmTarget();
      const targetChan = dmTarget ? `dm-${dmTarget}` : currentTextChannel;
      socket.emit('chat:typing', {
        channelId: targetChan,
        isTyping: chatInput.value.trim().length > 0
      });
      clearTimeout(typingDebounceTimer);
      typingDebounceTimer = setTimeout(() => {
        socket.emit('chat:typing', {
          channelId: targetChan,
          isTyping: false
        });
      }, 3000);
    }
  });

  // Navegação no Autocomplete e Cancelamento de Resposta
  chatInput.addEventListener('keydown', (e) => {
    if (mentionAutocompletePopover && mentionAutocompletePopover.style.display === 'flex') {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentMentionCandidates.length > 0) {
          mentionSelectedIndex = (mentionSelectedIndex + 1) % currentMentionCandidates.length;
          renderMentionAutocompleteList();
        }
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentMentionCandidates.length > 0) {
          mentionSelectedIndex = (mentionSelectedIndex - 1 + currentMentionCandidates.length) % currentMentionCandidates.length;
          renderMentionAutocompleteList();
        }
        return;
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (currentMentionCandidates[mentionSelectedIndex]) {
          e.preventDefault();
          insertMention(currentMentionCandidates[mentionSelectedIndex].name);
          return;
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeMentionAutocomplete();
        return;
      }
    }

    if (e.key === 'Escape' && activeReplyTarget) {
      clearReplyTarget();
    }
  });
}

// Resposta: definir alvo
function setReplyTarget(msg) {
  if (!msg) return;
  activeReplyTarget = msg;
  if (replyTargetSender) replyTargetSender.textContent = msg.sender || 'Alguém';
  if (replyTargetSnippet) replyTargetSnippet.textContent = (msg.text || '').substring(0, 80) || '(Anexo)';
  if (replyBar) replyBar.style.display = 'flex';
  if (chatInput) {
    chatInput.focus();
    chatInput.placeholder = `Responder a @${msg.sender}...`;
  }
}

// Resposta: cancelar
function clearReplyTarget() {
  activeReplyTarget = null;
  if (replyBar) replyBar.style.display = 'none';
  if (chatInput) {
    chatInput.placeholder = `Conversar em #${currentTextChannel}`;
  }
}

if (btnCancelReply) {
  btnCancelReply.addEventListener('click', clearReplyTarget);
}

// Autocomplete de Menções
function handleMentionAutocomplete() {
  if (!chatInput || !mentionAutocompletePopover || !mentionAutocompleteList) return;
  const cursorPos = chatInput.selectionStart;
  const textBefore = chatInput.value.substring(0, cursorPos);
  const match = textBefore.match(/(?:^|\s)@([a-zA-Z0-9_À-ÿ-]*)$/);

  if (!match) {
    closeMentionAutocomplete();
    return;
  }

  const query = match[1].toLowerCase();

  const candidates = [
    { name: 'everyone', sub: 'Notifica todos os membros', avatar: '/assets/logo.png', isSpecial: true },
    { name: 'aqui', sub: 'Notifica apenas membros online', avatar: '/assets/logo.png', isSpecial: true }
  ];

  const seen = new Set(['everyone', 'aqui']);
  if (Array.isArray(allOnlineUsers)) {
    allOnlineUsers.forEach(u => {
      const lower = (u.name || '').toLowerCase();
      if (lower && !seen.has(lower)) {
        seen.add(lower);
        candidates.push({
          name: u.name,
          sub: u.inVoice ? 'No canal de voz' : 'Online',
          avatar: u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(u.name)}`
        });
      }
    });
  }

  currentMentionCandidates = candidates.filter(c => c.name.toLowerCase().includes(query));

  if (currentMentionCandidates.length === 0) {
    closeMentionAutocomplete();
    return;
  }

  mentionSelectedIndex = 0;
  renderMentionAutocompleteList();
  mentionAutocompletePopover.style.display = 'flex';
}

function renderMentionAutocompleteList() {
  if (!mentionAutocompleteList) return;
  mentionAutocompleteList.innerHTML = '';
  currentMentionCandidates.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = `mention-opt-item ${idx === mentionSelectedIndex ? 'selected' : ''}`;
    row.innerHTML = `
      <img src="${item.avatar}" class="mention-opt-avatar" alt="${item.name}">
      <div class="mention-opt-info">
        <span class="mention-opt-name">@${escapeHtml(item.name)}</span>
        <span class="mention-opt-sub">${escapeHtml(item.sub)}</span>
      </div>
    `;
    row.addEventListener('click', () => {
      insertMention(item.name);
    });
    mentionAutocompleteList.appendChild(row);
  });
}

function insertMention(name) {
  if (!chatInput) return;
  const cursorPos = chatInput.selectionStart;
  const text = chatInput.value;
  const textBefore = text.substring(0, cursorPos);
  const textAfter = text.substring(cursorPos);
  const match = textBefore.match(/(?:^|\s)@([a-zA-Z0-9_À-ÿ-]*)$/);

  if (match) {
    const atIndex = textBefore.lastIndexOf('@' + match[1]);
    const newBefore = textBefore.substring(0, atIndex) + `@${name} `;
    chatInput.value = newBefore + textAfter;
    chatInput.selectionStart = chatInput.selectionEnd = newBefore.length;
  }

  closeMentionAutocomplete();
  chatInput.focus();
}

function closeMentionAutocomplete() {
  if (mentionAutocompletePopover) mentionAutocompletePopover.style.display = 'none';
  currentMentionCandidates = [];
  mentionSelectedIndex = 0;
}

// Reações Rápidas com Emojis
function openQuickReactionPicker(msgId, targetBtn) {
  reactingMessageId = msgId;
  if (!quickReactionPicker || !targetBtn) return;

  const rect = targetBtn.getBoundingClientRect();
  const pickerWidth = 360;
  let left = rect.left - pickerWidth + 40;
  if (left < 10) left = 10;
  let top = rect.top - 46;
  if (top < 10) top = rect.bottom + 6;

  quickReactionPicker.style.left = `${left}px`;
  quickReactionPicker.style.top = `${top}px`;
  quickReactionPicker.style.display = 'flex';
}

function closeQuickReactionPicker() {
  if (quickReactionPicker) quickReactionPicker.style.display = 'none';
  reactingMessageId = null;
}

if (quickReactionPicker) {
  quickReactionPicker.querySelectorAll('.quick-react-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const emoji = btn.getAttribute('data-emoji');
      if (emoji && reactingMessageId) {
        socket.emit('chat:react', {
          messageId: reactingMessageId,
          channelId: currentTextChannel,
          emoji
        });
      }
      closeQuickReactionPicker();
    });
  });
}

if (btnQuickReactMore) {
  btnQuickReactMore.addEventListener('click', (e) => {
    e.stopPropagation();
    targetReactionMessageId = reactingMessageId;
    closeQuickReactionPicker();
    openEmojiPicker();
  });
}

// Exclusão de Mensagem (Modal)
function openDeleteMessageModal(msg) {
  if (!msg) return;
  messageToDelete = msg;
  if (deleteMessagePreview) {
    deleteMessagePreview.textContent = (msg.text || '').substring(0, 150) || '(Anexo de arquivo)';
  }
  if (deleteMessageModal) deleteMessageModal.style.display = 'flex';
}

function closeDeleteMessageModal() {
  messageToDelete = null;
  if (deleteMessageModal) deleteMessageModal.style.display = 'none';
}

if (btnCloseDeleteMessageModal) btnCloseDeleteMessageModal.addEventListener('click', closeDeleteMessageModal);
if (btnCancelDeleteMessage) btnCancelDeleteMessage.addEventListener('click', closeDeleteMessageModal);
if (btnConfirmDeleteMessage) {
  btnConfirmDeleteMessage.addEventListener('click', () => {
    if (messageToDelete) {
      socket.emit('chat:delete', {
        messageId: messageToDelete.id,
        channelId: currentTextChannel
      });
      closeDeleteMessageModal();
    }
  });
}

// Mensagens Fixadas (Pins Popover)
function togglePinnedMessagesPopover() {
  if (!pinnedMessagesPopover) return;
  const isHidden = pinnedMessagesPopover.style.display === 'none';
  if (isHidden) {
    pinnedMessagesPopover.style.display = 'flex';
    socket.emit('chat:get-pins', { channelId: currentTextChannel });
  } else {
    closePinnedMessagesPopover();
  }
}

function closePinnedMessagesPopover() {
  if (pinnedMessagesPopover) pinnedMessagesPopover.style.display = 'none';
}

if (btnPinnedMessages) {
  btnPinnedMessages.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePinnedMessagesPopover();
  });
}
if (btnClosePinnedPopover) {
  btnClosePinnedPopover.addEventListener('click', closePinnedMessagesPopover);
}

socket.on('chat:pins-list', ({ channelId, pins }) => {
  if (channelId !== currentTextChannel || !pinnedMessagesList) return;
  pinnedMessagesList.innerHTML = '';
  if (!pins || pins.length === 0) {
    pinnedMessagesList.innerHTML = `
      <div style="padding: 24px 16px; text-align: center; color: #949ba4; font-size: 13px;">
        Nenhuma mensagem fixada no canal <strong>#${escapeHtml(currentTextChannel)}</strong> ainda 📌
      </div>
    `;
    return;
  }

  pins.forEach(p => {
    const card = document.createElement('div');
    card.className = 'pinned-msg-card';
    card.innerHTML = `
      <div class="pinned-msg-top">
        <span class="pinned-msg-author">${escapeHtml(p.sender)}</span>
        <span class="pinned-msg-time">${escapeHtml(p.timestamp || '')}</span>
      </div>
      <div class="pinned-msg-text">${formatChatText(p.text || '')}</div>
      <div class="pinned-msg-actions">
        <button type="button" class="pinned-msg-jump-btn" data-jump-id="${escapeHtml(p.id)}">Pular para mensagem</button>
        <button type="button" class="pinned-msg-unpin-btn" data-unpin-id="${escapeHtml(p.id)}">Desafixar</button>
      </div>
    `;

    const jumpBtn = card.querySelector('.pinned-msg-jump-btn');
    if (jumpBtn) {
      jumpBtn.addEventListener('click', () => {
        jumpToMessage(p.id);
        closePinnedMessagesPopover();
      });
    }

    const unpinBtn = card.querySelector('.pinned-msg-unpin-btn');
    if (unpinBtn) {
      unpinBtn.addEventListener('click', () => {
        socket.emit('chat:pin', { messageId: p.id, channelId: currentTextChannel });
      });
    }

    pinnedMessagesList.appendChild(card);
  });
});

function jumpToMessage(msgId) {
  const el = document.querySelector(`[data-msg-id="${msgId}"]`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('is-highlighted');
    setTimeout(() => el.classList.remove('is-highlighted'), 1500);
  } else {
    if (typeof showSoundToast === 'function') {
      showSoundToast('Mensagem não visível no histórico recente deste canal.');
    }
  }
}

// Sockets de Mensagens
socket.on('chat:new-message', ({ channelId, message }) => {
  if (!channelMessagesStore[channelId]) {
    channelMessagesStore[channelId] = [];
  }
  channelMessagesStore[channelId].push(message);

  const isCurrentChannel = channelId === currentTextChannel;
  if (isCurrentChannel) {
    messagesContainer.classList.remove('is-empty');
    appendMessageToContainer(message);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Se a mensagem for de outro usuário, processa notificações e contador de não lidas
  const isSelf = currentUser && message.sender === currentUser.name;
  if (!isSelf) {
    const isMentioned = currentUser && currentUser.name && (
      (message.text && message.text.toLowerCase().includes('@' + currentUser.name.toLowerCase())) ||
      (message.text && (message.text.includes('@everyone') || message.text.includes('@aqui') || message.text.includes('@todos')))
    );

    const isDnd = currentUser && currentUser.statusMode === 'dnd';

    // Sons de notificação (silenciado se estiver em status Não Perturbar)
    if (!isDnd) {
      if (isMentioned && typeof sounds.playMention === 'function') {
        sounds.playMention();
      } else if (typeof sounds.playMessage === 'function') {
        sounds.playMessage();
      }
    }

    const isAppFocused = document.hasFocus() && document.visibilityState === 'visible';
    const isViewing = isCurrentChannel && isAppFocused;

    // Se o usuário não está com a tela focada neste canal agora, marca como não lida e notifica
    if (!isViewing) {
      const currentCount = unreadChannelCounts.get(channelId) || 0;
      unreadChannelCounts.set(channelId, currentCount + 1);
      updateAppTitleAndBadges();
      triggerDesktopNotification(channelId, message, isMentioned);
    }
  }
});

// Atualização de Mensagem (Edição, Reações, Pin)
socket.on('chat:message-updated', ({ channelId, message }) => {
  if (channelMessagesStore[channelId]) {
    const idx = channelMessagesStore[channelId].findIndex(m => m.id === message.id);
    if (idx !== -1) {
      channelMessagesStore[channelId][idx] = message;
    } else {
      channelMessagesStore[channelId].push(message);
    }
  }
  if (channelId === currentTextChannel) {
    updateMessageInDOM(message);
  }
});

// Exclusão de Mensagem
socket.on('chat:message-deleted', ({ channelId, messageId }) => {
  if (channelMessagesStore[channelId]) {
    channelMessagesStore[channelId] = channelMessagesStore[channelId].filter(m => m.id !== messageId);
  }
  if (channelId === currentTextChannel) {
    const msgEl = document.querySelector(`[data-msg-id="${messageId}"]`);
    if (msgEl) {
      msgEl.style.opacity = '0';
      msgEl.style.transform = 'scale(0.95)';
      msgEl.style.transition = 'all 0.2s ease';
      setTimeout(() => msgEl.remove(), 200);
    }
  }
});

// Pins atualizados
socket.on('chat:pins-updated', ({ channelId }) => {
  if (channelId === currentTextChannel && pinnedMessagesPopover && pinnedMessagesPopover.style.display === 'flex') {
    socket.emit('chat:get-pins', { channelId: currentTextChannel });
  }
});

function formatMessageDisplayTime(msg) {
  if (!msg) return '';

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

  if (msg.timestamp) {
    return msg.timestamp;
  }

  return 'Hoje às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatChatText(text) {
  if (!text) return '';
  let str = escapeHtml(text);

  const tokens = [];
  const makeToken = (html) => {
    const placeholder = `___CHAT_TOKEN_${tokens.length}___`;
    tokens.push(html);
    return placeholder;
  };

  // 1. Preservar blocos de código inline com crases: `código`
  str = str.replace(/`([^`]+)`/g, (match, code) => {
    return makeToken(`<code class="chat-inline-code">${code}</code>`);
  });

  // 2. Markdown links explícitos: [Texto](URL)
  str = str.replace(/\[([^\]]+)\]\(((?:https?:\/\/|www\.)[^\s)]+)\)/g, (match, label, url) => {
    const href = url.startsWith('www.') ? `https://${url}` : url;
    return makeToken(`<a href="${href}" target="_blank" rel="noopener noreferrer" class="chat-link">${label}</a>`);
  });

  // 3. URLs brutas (https://, http://, www.) transformadas automaticamente em links
  const urlRegex = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/g;
  str = str.replace(urlRegex, (rawUrl) => {
    let cleanUrl = rawUrl;
    let trailingPunct = '';

    while (cleanUrl.length > 0 && /[.,;:!?)}\]*_]$/.test(cleanUrl)) {
      trailingPunct = cleanUrl.slice(-1) + trailingPunct;
      cleanUrl = cleanUrl.slice(0, -1);
    }

    if (!cleanUrl) return rawUrl;

    const href = cleanUrl.startsWith('www.') ? `https://${cleanUrl}` : cleanUrl;
    return makeToken(`<a href="${href}" target="_blank" rel="noopener noreferrer" class="chat-link">${cleanUrl}</a>`) + trailingPunct;
  });

  // 4. Menções @usuario e @everyone/@aqui
  const mentionRegex = /@([a-zA-Z0-9_À-ÿ-]+|everyone|here|aqui|todos)/g;
  str = str.replace(mentionRegex, (match, target) => {
    const isGlobal = /^(everyone|here|aqui|todos)$/i.test(target);
    const cls = isGlobal ? 'mention-tag mention-everyone' : 'mention-tag';
    return makeToken(`<span class="${cls}">@${target}</span>`);
  });

  // 5. Markdown bold: **texto**
  str = str.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #fff;">$1</strong>');

  // 6. Quebras de linha para <br>
  str = str.replace(/\n/g, '<br>');

  // 7. Restaurar tokens
  for (let i = 0; i < tokens.length; i++) {
    str = str.replace(`___CHAT_TOKEN_${i}___`, tokens[i]);
  }

  return str;
}

// ==========================================
// RENDERIZAR LINHA DE REAÇÕES
// ==========================================

// Renderizar linha de reações
function renderReactionsHtml(msg) {
  const reactions = msg.reactions && typeof msg.reactions === 'object' ? msg.reactions : {};
  const reactionEntries = Object.entries(reactions).filter(([emoji, users]) => Array.isArray(users) && users.length > 0);
  if (reactionEntries.length === 0) return '';

  let html = '<div class="message-reactions-row">';
  for (const [emoji, users] of reactionEntries) {
    const userReacted = currentUser && users.includes(currentUser.name);
    html += `
      <button type="button" class="message-reaction-chip ${userReacted ? 'active' : ''}" data-emoji="${escapeHtml(emoji)}" title="${escapeHtml(users.join(', '))}">
        <span class="reaction-emoji">${escapeHtml(emoji)}</span>
        <span class="reaction-count">${users.length}</span>
      </button>
    `;
  }
  html += `
    <button type="button" class="message-reaction-add-btn" title="Adicionar Reação">+</button>
  </div>`;
  return html;
}

// Edição In-Place da Mensagem
function startEditingMessage(msg) {
  if (!msg || !currentUser || msg.sender !== currentUser.name) return;
  editingMessageId = msg.id;

  const msgTextEl = document.getElementById(`msg-text-${msg.id}`);
  if (!msgTextEl) return;

  const rawText = msg.text || '';
  msgTextEl.innerHTML = `
    <div class="message-edit-wrapper">
      <textarea class="message-edit-textarea" id="edit-textarea-${msg.id}">${escapeHtml(rawText)}</textarea>
      <div class="message-edit-footer">
        <span>escape para <a href="#" class="message-edit-btn-cancel" id="btn-cancel-edit-${msg.id}">cancelar</a> • enter para <strong>salvar</strong></span>
        <div class="message-edit-actions">
          <button type="button" class="message-edit-btn-cancel" id="btn-cancel-edit-btn-${msg.id}">Cancelar</button>
          <button type="button" class="message-edit-btn-save" id="btn-save-edit-${msg.id}">Salvar</button>
        </div>
      </div>
    </div>
  `;

  const textarea = document.getElementById(`edit-textarea-${msg.id}`);
  if (textarea) {
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        cancelEditingMessage(msg);
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        saveEditedMessage(msg.id, textarea.value);
      }
    });
  }

  const cancelLink = document.getElementById(`btn-cancel-edit-${msg.id}`);
  const cancelBtn = document.getElementById(`btn-cancel-edit-btn-${msg.id}`);
  const saveBtn = document.getElementById(`btn-save-edit-${msg.id}`);

  if (cancelLink) cancelLink.addEventListener('click', (e) => { e.preventDefault(); cancelEditingMessage(msg); });
  if (cancelBtn) cancelBtn.addEventListener('click', () => cancelEditingMessage(msg));
  if (saveBtn) saveBtn.addEventListener('click', () => {
    if (textarea) saveEditedMessage(msg.id, textarea.value);
  });
}

function cancelEditingMessage(msg) {
  editingMessageId = null;
  const msgTextEl = document.getElementById(`msg-text-${msg.id}`);
  if (msgTextEl) {
    msgTextEl.innerHTML = formatChatText(msg.text);
  }
}

function saveEditedMessage(msgId, newText) {
  const clean = (newText || '').trim();
  if (!clean) return;
  socket.emit('chat:edit', {
    messageId: msgId,
    channelId: currentTextChannel,
    text: clean
  });
  editingMessageId = null;
}

// Vincular eventos a chips de reação dentro de uma mensagem
function bindReactionChipEvents(div, msg) {
  div.querySelectorAll('.message-reaction-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      const emoji = chip.getAttribute('data-emoji');
      if (emoji) {
        socket.emit('chat:react', { messageId: msg.id, channelId: currentTextChannel, emoji });
      }
    });
  });

  const addReactBtn = div.querySelector('.message-reaction-add-btn');
  if (addReactBtn) {
    addReactBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openQuickReactionPicker(msg.id, addReactBtn);
    });
  }
}

// Vincular eventos da barra de ações da mensagem
function bindMessageElementEvents(div, msg) {
  const replyPreview = div.querySelector('.message-reply-preview');
  if (replyPreview) {
    replyPreview.addEventListener('click', (e) => {
      e.stopPropagation();
      const replyId = replyPreview.getAttribute('data-reply-id');
      if (replyId) jumpToMessage(replyId);
    });
  }

  const btnReact = div.querySelector('.msg-action-btn[data-action="react"]');
  if (btnReact) {
    btnReact.addEventListener('click', (e) => {
      e.stopPropagation();
      openQuickReactionPicker(msg.id, btnReact);
    });
  }

  const btnReply = div.querySelector('.msg-action-btn[data-action="reply"]');
  if (btnReply) {
    btnReply.addEventListener('click', (e) => {
      e.stopPropagation();
      setReplyTarget(msg);
    });
  }

  const btnPin = div.querySelector('.msg-action-btn[data-action="pin"]');
  if (btnPin) {
    btnPin.addEventListener('click', (e) => {
      e.stopPropagation();
      socket.emit('chat:pin', { messageId: msg.id, channelId: currentTextChannel });
    });
  }

  const btnEdit = div.querySelector('.msg-action-btn[data-action="edit"]');
  if (btnEdit) {
    btnEdit.addEventListener('click', (e) => {
      e.stopPropagation();
      startEditingMessage(msg);
    });
  }

  const btnDelete = div.querySelector('.msg-action-btn[data-action="delete"]');
  if (btnDelete) {
    btnDelete.addEventListener('click', (e) => {
      e.stopPropagation();
      openDeleteMessageModal(msg);
    });
  }

  bindReactionChipEvents(div, msg);
}

// Atualizar mensagem existente no DOM sem recarregar tudo
function updateMessageInDOM(msg) {
  const div = document.querySelector(`[data-msg-id="${msg.id}"]`);
  if (!div) return;

  if (editingMessageId !== msg.id) {
    const textEl = div.querySelector(`#msg-text-${msg.id}`);
    if (textEl) {
      textEl.innerHTML = formatChatText(msg.text);
    }
  }

  const embedSlot = div.querySelector(`#embed-slot-${msg.id}`);
  if (embedSlot) {
    const newPreviewUrl = extractFirstPreviewUrl(msg.text);
    if (newPreviewUrl) {
      loadLinkPreview(embedSlot, newPreviewUrl);
    } else {
      embedSlot.innerHTML = '';
    }
  }

  const editSlot = div.querySelector('.message-edited-slot');
  if (editSlot) {
    editSlot.innerHTML = msg.edited ? '<span class="message-edited-tag" title="Editada">(editado)</span>' : '';
  }

  const pinSlot = div.querySelector('.message-pin-slot');
  if (pinSlot) {
    pinSlot.innerHTML = msg.pinned ? '<span class="pinned-chat-badge">📌 Fixada</span>' : '';
  }

  const pinBtn = div.querySelector('.msg-action-btn[data-action="pin"]');
  if (pinBtn) {
    pinBtn.classList.toggle('active-pin', !!msg.pinned);
    pinBtn.title = msg.pinned ? 'Desafixar mensagem' : 'Fixar mensagem';
    const svg = pinBtn.querySelector('svg');
    if (svg) svg.setAttribute('fill', msg.pinned ? 'currentColor' : 'none');
  }

  const reactContainer = div.querySelector(`#reactions-container-${msg.id}`);
  if (reactContainer) {
    reactContainer.innerHTML = renderReactionsHtml(msg);
    bindReactionChipEvents(div, msg);
  }
}

function appendMessageToContainer(msg) {
  const displayTime = formatMessageDisplayTime(msg);

  if (msg.isSystem) {
    const sysDiv = document.createElement('div');
    sysDiv.className = 'system-message';
    sysDiv.setAttribute('data-msg-id', msg.id);

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
  div.setAttribute('data-msg-id', msg.id);
  const isBot = !!msg.isBot || msg.sender === 'Alfredo' || msg.sender === 'Rythm';
  const isOwner = currentUser && currentUser.name && msg.sender === currentUser.name;

  // Destaque se foi mencionado
  const isMentioned = currentUser && currentUser.name && (
    (msg.text && msg.text.toLowerCase().includes('@' + currentUser.name.toLowerCase())) ||
    (msg.text && (msg.text.includes('@everyone') || msg.text.includes('@aqui') || msg.text.includes('@todos')))
  );
  if (isMentioned) {
    div.classList.add('is-mentioned');
  }

  // Anexo
  let attachmentHtml = '';
  if (msg.attachmentUrl) {
    const isImg = /\.(png|jpe?g|gif|webp|svg)$/i.test(msg.attachmentUrl) || msg.attachmentUrl.startsWith('data:image/');
    const isAudio = /\.(mp3|wav|ogg|m4a)$/i.test(msg.attachmentUrl);
    if (isImg) {
      const fileName = (msg.attachmentUrl.split('/').pop().split('?')[0]) || 'imagem.png';
      attachmentHtml = `
        <div class="message-attachment">
          <div class="message-image-container" data-img-url="${escapeHtml(msg.attachmentUrl)}" data-img-name="${escapeHtml(fileName)}" title="Clique para expandir • Botão direito para copiar">
            <img class="chat-clickable-image" src="${escapeHtml(msg.attachmentUrl)}" alt="${escapeHtml(fileName)}" loading="lazy">
          </div>
        </div>
      `;
    } else if (isAudio) {
      attachmentHtml = `<div class="message-attachment"><audio controls src="${msg.attachmentUrl}"></audio></div>`;
    } else {
      attachmentHtml = `<div class="message-attachment"><a href="${msg.attachmentUrl}" target="_blank" style="color: #5865F2; text-decoration: underline;">📁 Baixar Anexo</a></div>`;
    }
  } else if (msg.text) {
    const imgUrlMatch = msg.text.match(/(https?:\/\/[^\s<]+\.(?:png|jpe?g|gif|webp))/i);
    if (imgUrlMatch) {
      const inlineUrl = imgUrlMatch[0];
      const fileName = (inlineUrl.split('/').pop().split('?')[0]) || 'imagem.png';
      attachmentHtml = `
        <div class="message-attachment">
          <div class="message-image-container" data-img-url="${escapeHtml(inlineUrl)}" data-img-name="${escapeHtml(fileName)}" title="Clique para expandir • Botão direito para copiar">
            <img class="chat-clickable-image" src="${escapeHtml(inlineUrl)}" alt="${escapeHtml(fileName)}" loading="lazy">
          </div>
        </div>
      `;
    }
  }

  // Citação de Resposta (Reply Preview)
  let replyHtml = '';
  if (msg.replyTo && msg.replyTo.sender) {
    replyHtml = `
      <div class="message-reply-preview" data-reply-id="${escapeHtml(msg.replyTo.id || '')}" title="Pular para mensagem original">
        <span class="message-reply-author">@${escapeHtml(msg.replyTo.sender)}</span>
        <span class="message-reply-snippet">${escapeHtml(msg.replyTo.text || '')}</span>
      </div>
    `;
  }

  // Reações
  const reactionsHtml = renderReactionsHtml(msg);

  // Barra de Ações Flutuante (Hover)
  const actionsHtml = `
    <div class="message-actions-bar">
      <button type="button" class="msg-action-btn" data-action="react" title="Adicionar Reação">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
      </button>
      <button type="button" class="msg-action-btn" data-action="reply" title="Responder">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
      </button>
      <button type="button" class="msg-action-btn ${msg.pinned ? 'active-pin' : ''}" data-action="pin" title="${msg.pinned ? 'Desafixar mensagem' : 'Fixar mensagem'}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="${msg.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>
      </button>
      ${isOwner ? `
      <button type="button" class="msg-action-btn" data-action="edit" title="Editar mensagem">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
      </button>
      <button type="button" class="msg-action-btn danger" data-action="delete" title="Excluir mensagem">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
      </button>
      ` : ''}
    </div>
  `;

  div.innerHTML = `
    ${actionsHtml}
    <img class="message-avatar" src="${msg.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(msg.sender)}" alt="${msg.sender}">
    <div class="message-content">
      ${replyHtml}
      <div class="message-header">
        <span class="message-author" style="color: ${isBot ? '#23a55a' : '#5865F2'};">${escapeHtml(msg.sender)}</span>
        ${isBot ? '<span class="bot-tag">BOT</span>' : ''}
        <span class="message-time">${escapeHtml(displayTime)}</span>
        <span class="message-edited-slot">${msg.edited ? '<span class="message-edited-tag" title="Editada">(editado)</span>' : ''}</span>
        <span class="message-pin-slot">${msg.pinned ? '<span class="pinned-chat-badge">📌 Fixada</span>' : ''}</span>
      </div>
      <div class="message-text" id="msg-text-${msg.id}">${formatChatText(msg.text)}</div>
      <div class="discord-embed-slot" id="embed-slot-${msg.id}"></div>
      ${attachmentHtml}
      <div class="message-reactions-container" id="reactions-container-${msg.id}">${reactionsHtml}</div>
    </div>
  `;

  bindMessageElementEvents(div, msg);
  messagesContainer.appendChild(div);

  const previewUrl = extractFirstPreviewUrl(msg.text);
  if (previewUrl && !attachmentHtml) {
    const slotEl = div.querySelector(`#embed-slot-${msg.id}`);
    if (slotEl) {
      loadLinkPreview(slotEl, previewUrl);
    }
  }

  if (attachmentHtml && window.lucide) {
    window.lucide.createIcons();
  }
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
      const payload = {
        channelId: currentTextChannel,
        text: `Enviou um arquivo: ${file.name}`,
        attachmentUrl: data.url
      };
      if (activeReplyTarget) {
        payload.replyTo = {
          id: activeReplyTarget.id,
          sender: activeReplyTarget.sender,
          text: activeReplyTarget.text
        };
        clearReplyTarget();
      }
      socket.emit('chat:send', payload);
    }
  } catch (err) {
    alert('Erro ao enviar arquivo.');
  }
  chatFileInput.value = '';
});

// Clique em avatar ou autor de mensagem no chat abre o perfil estilo Discord
if (messagesContainer) {
  messagesContainer.addEventListener('click', (e) => {
    const avatarEl = e.target.closest('.message-avatar');
    const authorEl = e.target.closest('.message-author');
    if (avatarEl || authorEl) {
      e.stopPropagation();
      const msgEl = e.target.closest('.chat-message');
      if (msgEl) {
        const sender = (authorEl ? authorEl.textContent : (avatarEl ? avatarEl.getAttribute('alt') : '')).trim();
        if (sender) {
          const found = allOnlineUsers.find(u => u.name && u.name.toLowerCase() === sender.toLowerCase()) || {
            name: sender,
            avatar: avatarEl?.src || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(sender)}`
          };
          openUserProfileCard(found, authorEl || avatarEl, e);
        }
      }
    }
  });
}

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
// POPOVER DE SELEÇÃO DE EMOJIS & REAÇÕES
// ==========================================
initEmojiPicker({
  socket,
  getCurrentTextChannel: () => currentTextChannel
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
    if (typeof updateStreamPiP === 'function') updateStreamPiP();
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
    voiceSubEl.textContent = `${roomName} / FakeDC`;
  }

  videoStage.style.display = 'flex';
  messagesContainer.style.display = 'none';
  const wrapper = document.querySelector('.chat-input-wrapper');
  if (wrapper) wrapper.style.display = 'none';
  myUserStatusEl.textContent = '🔊 Em voz';
  if (typeof updateStreamPiP === 'function') updateStreamPiP();

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

  webrtc.ensureAudioContext();
  if (typeof webrtc.setDeafened === 'function') {
    webrtc.setDeafened(isDeafened);
  }
  sounds.playJoin();

  // Garante que o microfone esteja capturado e pronto ANTES de conectar aos peers
  // para que os tracks de áudio já sejam incluídos na primeira oferta SDP sem conflito de corrida
  try {
    await webrtc.startAudio();
    if (voiceInputMode === 'ptt') {
      webrtc.setMuted(true);
      isMuted = true;
      btnToggleMic.classList.add('active-muted');
      btnStageMic.classList.add('active-muted');
      syncMuteStatusToServer();
    }
  } catch (err) {
    console.warn('[WebRTC] Aviso ao inicializar áudio pré-conexão:', err);
  }

  // Emite entrada no canal de voz no socket com microfone já inicializado
  socket.emit('voice:join', {
    roomId,
    isMuted: !!isMuted,
    isDeafened: !!isDeafened
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
  if (typeof updateStreamPiP === 'function') updateStreamPiP();

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

  // Se estiver no aplicativo Electron Desktop (FakeDC Desktop), abre o seletor personalizado estilo Discord
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
btnStopScreenTile.addEventListener('click', () => {
  if (currentViewedStreamId === 'local' || isScreenSharing) {
    toggleScreenShare(false);
  } else {
    currentViewedStreamId = null;
    mainScreenTile.style.display = 'none';
    sharedScreenVideo.srcObject = null;
    if (streamSwitcherBar) streamSwitcherBar.style.display = 'none';
    renderVoiceStageCards();
  }
});

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

function handleToggleMic() {
  if (!webrtc) return;
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
}

function handleToggleDeaf() {
  isDeafened = !isDeafened;
  btnToggleDeaf.classList.toggle('active-muted', isDeafened);
  if (typeof webrtc !== 'undefined' && webrtc && typeof webrtc.setDeafened === 'function') {
    webrtc.setDeafened(isDeafened);
  }
  document.querySelectorAll('audio').forEach(a => {
    a.muted = isDeafened;
  });
  if (isDeafened) {
    sounds.playMute();
  } else {
    sounds.playUnmute();
  }
  syncMuteStatusToServer();
}

btnToggleMic.addEventListener('click', handleToggleMic);
btnStageMic.addEventListener('click', handleToggleMic);
btnToggleDeaf.addEventListener('click', handleToggleDeaf);

// Atalhos Globais do Electron (Ctrl+Shift+M e Ctrl+Shift+D em jogos em tela cheia)
if (window.electronAPI && typeof window.electronAPI.onShortcutToggleMic === 'function') {
  window.electronAPI.onShortcutToggleMic(() => {
    handleToggleMic();
  });
}
if (window.electronAPI && typeof window.electronAPI.onShortcutToggleDeaf === 'function') {
  window.electronAPI.onShortcutToggleDeaf(() => {
    handleToggleDeaf();
  });
}

// ==========================================
// MODAL DE CONFIGURAÇÕES DE DISPOSITIVOS E CADASTRO
// ==========================================
function switchSettingsTab(tabName) {
  const targetTab = (typeof tabName === 'string') ? tabName : 'voice';

  // Limpa estados das abas
  [tabBtnVoice, tabBtnStream, tabBtnProfile, tabBtnAccount].forEach(b => {
    if (b) b.classList.remove('active');
  });
  [tabContentVoice, tabContentStream, tabContentProfile, tabContentAccount].forEach(c => {
    if (c) c.style.display = 'none';
  });

  if (targetTab === 'stream') {
    if (tabBtnStream) tabBtnStream.classList.add('active');
    if (tabContentStream) tabContentStream.style.display = 'block';
    syncStreamQualityUI();
  } else if (targetTab === 'profile') {
    if (tabBtnProfile) tabBtnProfile.classList.add('active');
    if (tabContentProfile) tabContentProfile.style.display = 'block';
    if (profileSaveAlert) profileSaveAlert.style.display = 'none';

    if (currentUser) {
      if (settingAvatarPreview) settingAvatarPreview.src = currentUser.avatar;
      if (previewAvatar) previewAvatar.src = currentUser.avatar;
      if (previewUsername) previewUsername.textContent = currentUser.name;
      if (settingBannerColor) settingBannerColor.value = currentUser.bannerColor || '#5865F2';
      if (previewBanner) previewBanner.style.backgroundColor = currentUser.bannerColor || '#5865F2';
      if (settingStatusMode) settingStatusMode.value = currentUser.statusMode || 'online';
      if (previewStatusBadge) previewStatusBadge.className = `profile-card-status-badge status-${currentUser.statusMode || 'online'}`;
      if (settingCustomStatus) settingCustomStatus.value = currentUser.customStatusText || '';
      if (previewCustomStatusText) {
        previewCustomStatusText.textContent = currentUser.customStatusText || '';
        previewCustomStatusText.style.display = currentUser.customStatusText ? 'block' : 'none';
      }
      if (countCustomStatus) countCustomStatus.textContent = `${(currentUser.customStatusText || '').length}/80`;
      if (settingBio) settingBio.value = currentUser.bio || '';
      if (previewBioText) previewBioText.textContent = currentUser.bio || 'Sem descrição.';
      if (countBio) countBio.textContent = `${(currentUser.bio || '').length}/200`;
    }
  } else if (targetTab === 'account') {
    if (tabBtnAccount) tabBtnAccount.classList.add('active');
    if (tabContentAccount) tabContentAccount.style.display = 'block';
    if (accountFormAlert) accountFormAlert.style.display = 'none';

    if (currentUser) {
      if (accountUsernameText) accountUsernameText.textContent = currentUser.name;
      if (accountAvatarImg) accountAvatarImg.src = currentUser.avatar;
    }
    socket.emit('auth:get-status');
  } else {
    // Default fallback: sempre abre Voz & Áudio
    if (tabBtnVoice) tabBtnVoice.classList.add('active');
    if (tabContentVoice) tabContentVoice.style.display = 'block';
  }
}

if (tabBtnVoice) {
  tabBtnVoice.addEventListener('click', () => switchSettingsTab('voice'));
}

if (tabBtnStream) {
  tabBtnStream.addEventListener('click', () => switchSettingsTab('stream'));
}

if (tabBtnProfile) {
  tabBtnProfile.addEventListener('click', () => switchSettingsTab('profile'));
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

async function openSettingsModal(defaultTab = 'voice') {
  settingsModal.style.display = 'flex';
  switchSettingsTab(defaultTab);
  await populateDeviceSelectors();

  // Sincroniza toggle de supressão de ruído RNNoise
  updateNoiseSuppressionUI(webrtc.noiseSuppressionEnabled);

  // Sincroniza campos de qualidade de transmissão de tela
  syncStreamQualityUI();

  // Carrega e exibe a versão ativa do app
  loadAndDisplayAppVersion();
}

function closeSettingsModal() {
  settingsModal.style.display = 'none';
}

// Limpa chaves corrompidas do localStorage caso existam de sessões anteriores
try {
  ['discord_stream_resolution', 'discord_stream_bitrate', 'discord_stream_degradation'].forEach(k => {
    const v = localStorage.getItem(k);
    if (v === '[object Object]' || v === 'undefined' || v === 'null') {
      localStorage.removeItem(k);
    }
  });
} catch (e) {}

function syncStreamQualityUI() {
  if (!webrtc) return;
  if (settingStreamResolution) {
    settingStreamResolution.value = webrtc.streamResolution || '1080p';
  }
  if (settingStreamFps) {
    settingStreamFps.value = String(webrtc.streamFps || 60);
  }
  if (settingStreamBitrate) {
    settingStreamBitrate.value = webrtc.streamBitrateKey || '8M';
  }
  if (settingStreamDegradation) {
    settingStreamDegradation.value = webrtc.streamDegradation || 'maintain-framerate';
  }
}

// Inicializa a interface com as preferências salvas
syncStreamQualityUI();

let cachedAppVersion = null;
async function loadAndDisplayAppVersion() {
  if (!settingsAppVersion) return;
  if (cachedAppVersion) {
    settingsAppVersion.textContent = 'v' + cachedAppVersion;
    return;
  }

  try {
    if (window.electronAPI && typeof window.electronAPI.getVersion === 'function') {
      const v = await window.electronAPI.getVersion();
      if (v) {
        cachedAppVersion = String(v).replace(/^v/, '');
        settingsAppVersion.textContent = 'v' + cachedAppVersion;
        return;
      }
    }

    const res = await fetch('/version.json?t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      if (data && data.version) {
        cachedAppVersion = String(data.version).replace(/^v/, '');
        settingsAppVersion.textContent = 'v' + cachedAppVersion;
      }
    }
  } catch (err) {
    console.warn('Erro ao obter versão do app:', err);
  }
}

// Inicializa a versão no background assim que carregar
loadAndDisplayAppVersion();

function onStreamQualitySettingChange() {
  if (!webrtc) return;
  const resolution = settingStreamResolution ? settingStreamResolution.value : '1080p';
  const fps = settingStreamFps ? parseInt(settingStreamFps.value, 10) : 60;
  const bitrate = settingStreamBitrate ? settingStreamBitrate.value : '8M';
  const degradation = settingStreamDegradation ? settingStreamDegradation.value : 'maintain-framerate';

  webrtc.setStreamQuality({ resolution, fps, bitrate, degradation });

  const fpsLabel = fps + ' FPS';
  const resLabel = resolution === 'source' ? 'Nativa' : resolution.toUpperCase();
  showSoundToast(`🎥 Salvo: ${resLabel} @ ${fpsLabel} (${bitrate})`);
}

if (settingStreamResolution) {
  settingStreamResolution.addEventListener('change', onStreamQualitySettingChange);
}
if (settingStreamFps) {
  settingStreamFps.addEventListener('change', onStreamQualitySettingChange);
}
if (settingStreamBitrate) {
  settingStreamBitrate.addEventListener('change', onStreamQualitySettingChange);
}
if (settingStreamDegradation) {
  settingStreamDegradation.addEventListener('change', onStreamQualitySettingChange);
}

// Botão de Forçar Atualização / Limpeza de Cache
if (btnForceUpdate) {
  btnForceUpdate.addEventListener('click', async () => {
    if (btnForceUpdate.disabled) return;
    btnForceUpdate.disabled = true;
    if (btnForceUpdateIcon) btnForceUpdateIcon.classList.add('anim-spin');
    if (btnForceUpdateText) btnForceUpdateText.textContent = 'Buscando...';

    try {
      if (window.electronAPI && typeof window.electronAPI.checkForUpdates === 'function') {
        showSoundToast('🔍 Verificando atualizações no servidor...');
        const res = await window.electronAPI.checkForUpdates();
        if (res && res.updateAvailable) {
          showSoundToast('🚀 Nova versão encontrada! Baixando atualização...');
        } else {
          showSoundToast(res && res.message ? res.message : 'Você já está na versão mais recente!');
        }
      } else {
        // Modo Web Browser
        showSoundToast('🔄 Limpando cache e atualizando...');
        if ('caches' in window) {
          try {
            const cacheKeys = await caches.keys();
            await Promise.all(cacheKeys.map(k => caches.delete(k)));
          } catch (e) {
            console.warn('Erro ao limpar CacheStorage:', e);
          }
        }
        if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
          try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const r of registrations) {
              await r.unregister();
            }
          } catch (e) {
            console.warn('Erro ao desregistrar ServiceWorker:', e);
          }
        }
        setTimeout(() => {
          window.location.href = window.location.pathname + '?nocache=' + Date.now();
        }, 500);
      }
    } catch (err) {
      console.error('Erro ao forçar atualização:', err);
      showSoundToast('⚠️ Erro ao verificar atualização: ' + (err.message || 'Falha de conexão'));
    } finally {
      setTimeout(() => {
        btnForceUpdate.disabled = false;
        if (btnForceUpdateIcon) btnForceUpdateIcon.classList.remove('anim-spin');
        if (btnForceUpdateText) btnForceUpdateText.textContent = 'Forçar Atualização';
      }, 2500);
    }
  });
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

btnUserSettings.addEventListener('click', () => openSettingsModal('voice'));
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
// CONFIGURAÇÕES DE ENTRADA DE VOZ (PUSH-TO-TALK & VAD - FASE 3)
// ==========================================
let voiceInputMode = localStorage.getItem('gamezeda_voice_input_mode') || 'vad'; // 'vad' ou 'ptt'
let pttKey = localStorage.getItem('gamezeda_ptt_key') || 'CapsLock';
let isPttActive = false;
let isRecordingPttKey = false;
let pttAvatarFile = null;

function applyVoiceInputMode(mode) {
  voiceInputMode = mode;
  localStorage.setItem('gamezeda_voice_input_mode', mode);

  if (labelModeVad && labelModePtt) {
    labelModeVad.classList.toggle('active', mode === 'vad');
    labelModePtt.classList.toggle('active', mode === 'ptt');
    const radVad = labelModeVad.querySelector('input[type="radio"]');
    const radPtt = labelModePtt.querySelector('input[type="radio"]');
    if (radVad) radVad.checked = (mode === 'vad');
    if (radPtt) radPtt.checked = (mode === 'ptt');
  }

  if (pttKeyContainer) {
    pttKeyContainer.style.display = (mode === 'ptt') ? 'block' : 'none';
  }

  // Se estiver em voz, ajusta o estado inicial do microfone
  if (inVoice && webrtc) {
    if (mode === 'ptt') {
      isMuted = true;
      webrtc.setMuted(true);
      btnToggleMic.classList.add('active-muted');
      btnStageMic.classList.add('active-muted');
      syncMuteStatusToServer();
    } else {
      isMuted = false;
      webrtc.setMuted(false);
      btnToggleMic.classList.remove('active-muted');
      btnStageMic.classList.remove('active-muted');
      syncMuteStatusToServer();
    }
  }
}

let pttRecordingController = null;

function getPttKeyDisplayName(key) {
  if (!key) return 'Caps Lock';
  if (typeof key === 'string' && key.startsWith('Mouse:')) {
    const btnNum = parseInt(key.split(':')[1], 10);
    switch (btnNum) {
      case 1: return 'Mouse 3 (Scroll/Meio)';
      case 2: return 'Mouse 2 (Direito)';
      case 3: return 'Mouse 4 (Lateral Voltar)';
      case 4: return 'Mouse 5 (Lateral Avançar)';
      default: return `Mouse ${btnNum + 1}`;
    }
  }
  if (key === ' ' || key === 'Space') return 'Espaço';
  if (key === 'CapsLock') return 'Caps Lock';
  if (key === 'ControlLeft' || key === 'ControlRight') return 'Ctrl';
  if (key === 'ShiftLeft' || key === 'ShiftRight') return 'Shift';
  if (key === 'AltLeft' || key === 'AltRight') return 'Alt';
  if (typeof key === 'string' && key.startsWith('Key')) return key.replace('Key', '');
  if (typeof key === 'string' && key.startsWith('Digit')) return key.replace('Digit', '');
  return key;
}

function updatePttKeyDisplay() {
  if (pttKeyDisplay) {
    pttKeyDisplay.textContent = getPttKeyDisplayName(pttKey);
  }
}

function stopRecordingPttKey() {
  isRecordingPttKey = false;
  if (btnRecordPttKey) {
    btnRecordPttKey.classList.remove('recording');
  }
  updatePttKeyDisplay();
  if (pttKeyHint) {
    pttKeyHint.textContent = '(Clique para gravar)';
  }
  if (pttRecordingController) {
    pttRecordingController.abort();
    pttRecordingController = null;
  }
}

function startRecordingPttKey(e) {
  if (!btnRecordPttKey) return;
  if (isRecordingPttKey) {
    stopRecordingPttKey();
    return;
  }
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  isRecordingPttKey = true;
  btnRecordPttKey.classList.add('recording');
  if (pttKeyDisplay) pttKeyDisplay.textContent = 'Pressione uma tecla ou mouse...';
  if (pttKeyHint) pttKeyHint.textContent = '(Esc ou Botão Esquerdo cancela)';

  if (pttRecordingController) {
    pttRecordingController.abort();
  }
  pttRecordingController = new AbortController();
  const { signal } = pttRecordingController;

  const saveCaptured = (captured) => {
    pttKey = captured;
    localStorage.setItem('gamezeda_ptt_key', captured);
    stopRecordingPttKey();
  };

  // Captura de teclado
  window.addEventListener('keydown', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    if (ev.code === 'Escape' || ev.key === 'Escape') {
      stopRecordingPttKey();
      return;
    }

    const captured = ev.code || ev.key;
    saveCaptured(captured);
  }, { capture: true, signal });

  // Captura de cliques do mouse
  const startTime = Date.now();
  window.addEventListener('mousedown', (ev) => {
    // Ignora o clique de início da gravação no botão se ocorrido dentro de 120ms
    if (Date.now() - startTime < 120 && ev.button === 0) {
      return;
    }

    ev.preventDefault();
    ev.stopPropagation();

    if (ev.button === 0) {
      // Botão esquerdo cancela para não prejudicar cliques na interface
      stopRecordingPttKey();
      return;
    }

    // Botão 1 (meio), 2 (direito), 3 (mouse 4), 4 (mouse 5), etc.
    saveCaptured(`Mouse:${ev.button}`);
  }, { capture: true, signal });

  // Previne menu de contexto ao gravar botão direito
  window.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
  }, { capture: true, signal });

  // Previne navegação de histórico ao gravar mouse 3 ou 4
  window.addEventListener('auxclick', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
  }, { capture: true, signal });
}

if (labelModeVad) {
  labelModeVad.addEventListener('click', () => applyVoiceInputMode('vad'));
}
if (labelModePtt) {
  labelModePtt.addEventListener('click', () => applyVoiceInputMode('ptt'));
}
if (btnRecordPttKey) {
  btnRecordPttKey.addEventListener('click', startRecordingPttKey);
}
if (btnResetPttKey) {
  btnResetPttKey.addEventListener('click', () => {
    pttKey = 'CapsLock';
    localStorage.setItem('gamezeda_ptt_key', 'CapsLock');
    updatePttKeyDisplay();
  });
}

function activatePtt() {
  if (isPttActive) return;
  isPttActive = true;
  if (webrtc) webrtc.setMuted(false);
  isMuted = false;
  if (btnToggleMic) btnToggleMic.classList.remove('active-muted');
  if (btnStageMic) btnStageMic.classList.remove('active-muted');
  syncMuteStatusToServer();
  if (sounds && sounds.playPttOn) sounds.playPttOn();
}

function deactivatePtt() {
  if (!isPttActive) return;
  isPttActive = false;
  if (webrtc) webrtc.setMuted(true);
  isMuted = true;
  if (btnToggleMic) btnToggleMic.classList.add('active-muted');
  if (btnStageMic) btnStageMic.classList.add('active-muted');
  syncMuteStatusToServer();
  if (sounds && sounds.playPttOff) sounds.playPttOff();
}

// Escuta de Teclado Global para Push-to-Talk
window.addEventListener('keydown', (e) => {
  if (isRecordingPttKey) return;
  if (voiceInputMode !== 'ptt' || !inVoice || !webrtc) return;
  if (typeof pttKey === 'string' && pttKey.startsWith('Mouse:')) return;

  const tag = (e.target && e.target.tagName) ? e.target.tagName : '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

  const keyMatch = (e.code === pttKey) || (e.key === pttKey) ||
    (pttKey === 'CapsLock' && (e.code === 'CapsLock' || e.key === 'CapsLock'));

  if (keyMatch) {
    activatePtt();
  }
});

window.addEventListener('keyup', (e) => {
  if (voiceInputMode !== 'ptt' || !inVoice || !webrtc) return;
  if (typeof pttKey === 'string' && pttKey.startsWith('Mouse:')) return;

  const keyMatch = (e.code === pttKey) || (e.key === pttKey) ||
    (pttKey === 'CapsLock' && (e.code === 'CapsLock' || e.key === 'CapsLock'));

  if (keyMatch) {
    deactivatePtt();
  }
});

// Escuta de Mouse Global para Push-to-Talk
window.addEventListener('mousedown', (e) => {
  if (isRecordingPttKey) return;
  if (voiceInputMode !== 'ptt' || !inVoice || !webrtc) return;
  if (typeof pttKey !== 'string' || !pttKey.startsWith('Mouse:')) return;

  const targetBtn = parseInt(pttKey.split(':')[1], 10);
  if (e.button === targetBtn) {
    if (e.button === 3 || e.button === 4) {
      e.preventDefault();
      e.stopPropagation();
    }
    activatePtt();
  }
}, true);

window.addEventListener('mouseup', (e) => {
  if (voiceInputMode !== 'ptt' || !inVoice || !webrtc) return;
  if (typeof pttKey !== 'string' || !pttKey.startsWith('Mouse:')) return;

  const targetBtn = parseInt(pttKey.split(':')[1], 10);
  if (e.button === targetBtn) {
    if (e.button === 3 || e.button === 4) {
      e.preventDefault();
      e.stopPropagation();
    }
    deactivatePtt();
  }
}, true);

// Previne navegação acidental do navegador no Mouse 3 e 4 durante uso do PTT
window.addEventListener('auxclick', (e) => {
  if (voiceInputMode === 'ptt' && typeof pttKey === 'string' && pttKey.startsWith('Mouse:')) {
    const targetBtn = parseInt(pttKey.split(':')[1], 10);
    if (e.button === targetBtn) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
}, true);

// Previne menu de contexto se o atalho for Botão Direito
window.addEventListener('contextmenu', (e) => {
  if (voiceInputMode === 'ptt' && pttKey === 'Mouse:2') {
    e.preventDefault();
  }
}, true);

window.addEventListener('blur', () => {
  if (voiceInputMode === 'ptt' && isPttActive && inVoice && webrtc) {
    deactivatePtt();
  }
});

document.addEventListener('mouseleave', () => {
  if (voiceInputMode === 'ptt' && isPttActive && inVoice && webrtc && typeof pttKey === 'string' && pttKey.startsWith('Mouse:')) {
    deactivatePtt();
  }
});

applyVoiceInputMode(voiceInputMode);
updatePttKeyDisplay();

// ==========================================
// CONFIGURAÇÕES DE PERFIL & CUSTOMIZAÇÃO (FASE 2)
// ==========================================
function updateProfilePreview() {
  const bannerColor = settingBannerColor ? settingBannerColor.value : '#5865F2';
  const statusMode = settingStatusMode ? settingStatusMode.value : 'online';
  const customStatus = settingCustomStatus ? settingCustomStatus.value.trim() : '';
  const bio = settingBio ? settingBio.value.trim() : '';

  if (previewBanner) previewBanner.style.backgroundColor = bannerColor;
  if (previewStatusBadge) {
    previewStatusBadge.className = `profile-card-status-badge status-${statusMode}`;
  }
  if (previewUsername && currentUser) {
    previewUsername.textContent = currentUser.name || 'Seu Nome';
  }
  if (previewCustomStatusText) {
    previewCustomStatusText.textContent = customStatus || '';
    previewCustomStatusText.style.display = customStatus ? 'block' : 'none';
  }
  if (previewBioText) {
    previewBioText.textContent = bio || 'Sem descrição.';
  }
  if (countCustomStatus && settingCustomStatus) {
    countCustomStatus.textContent = `${settingCustomStatus.value.length}/80`;
  }
  if (countBio && settingBio) {
    countBio.textContent = `${settingBio.value.length}/200`;
  }
}

let selectedAvatarFile = null;

if (btnChooseAvatar && settingAvatarInput) {
  btnChooseAvatar.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    settingAvatarInput.click();
  });
}

if (settingAvatarInput) {
  settingAvatarInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      selectedAvatarFile = file;
      const previewUrl = URL.createObjectURL(file);
      if (settingAvatarPreview) settingAvatarPreview.src = previewUrl;
      if (previewAvatar) previewAvatar.src = previewUrl;
    }
  });
}

if (btnResetAvatar) {
  btnResetAvatar.addEventListener('click', (e) => {
    e.preventDefault();
    if (!currentUser) return;
    selectedAvatarFile = null;
    const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.name)}`;
    if (settingAvatarPreview) settingAvatarPreview.src = defaultAvatar;
    if (previewAvatar) previewAvatar.src = defaultAvatar;
    if (settingAvatarInput) settingAvatarInput.value = '';
    updateProfilePreview();
  });
}

if (settingBannerColor) {
  settingBannerColor.addEventListener('input', updateProfilePreview);
}

document.querySelectorAll('.banner-color-preset').forEach(presetBtn => {
  presetBtn.addEventListener('click', () => {
    const color = presetBtn.getAttribute('data-color');
    if (color && settingBannerColor) {
      settingBannerColor.value = color;
      updateProfilePreview();
    }
  });
});

if (settingStatusMode) {
  settingStatusMode.addEventListener('change', updateProfilePreview);
}

if (settingCustomStatus) {
  settingCustomStatus.addEventListener('input', updateProfilePreview);
}

if (settingBio) {
  settingBio.addEventListener('input', updateProfilePreview);
}

async function saveProfileSettings() {
  if (!currentUser) return;
  if (btnSaveProfileSettings) {
    btnSaveProfileSettings.disabled = true;
    btnSaveProfileSettings.innerHTML = '<span>Salvando alterações...</span>';
  }

  let avatarUrl = (settingAvatarPreview && settingAvatarPreview.src) ? settingAvatarPreview.src : currentUser.avatar;

  // Se houver nova imagem de avatar selecionada do PC
  if (selectedAvatarFile) {
    try {
      const formData = new FormData();
      formData.append('avatar', selectedAvatarFile);
      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success && data.url) {
        avatarUrl = data.url;
      }
    } catch (err) {
      console.error('Erro ao enviar avatar:', err);
    }
  }

  const bannerColor = settingBannerColor ? settingBannerColor.value : '#5865F2';
  const statusMode = settingStatusMode ? settingStatusMode.value : 'online';
  const customStatusText = settingCustomStatus ? settingCustomStatus.value.trim() : '';
  const bio = settingBio ? settingBio.value.trim() : '';

  currentUser.avatar = avatarUrl;
  currentUser.bannerColor = bannerColor;
  currentUser.statusMode = statusMode;
  currentUser.customStatusText = customStatusText;
  currentUser.bio = bio;

  if (myAvatarImg) myAvatarImg.src = avatarUrl;
  if (cardMyAvatar) cardMyAvatar.src = avatarUrl;
  updateMyUserStatus();

  socket.emit('user:update-profile', {
    avatar: avatarUrl,
    avatarUrl,
    bannerColor,
    status: statusMode,
    statusMode,
    customStatusText,
    bio
  });
}

if (btnSaveProfileSettings) {
  btnSaveProfileSettings.addEventListener('click', saveProfileSettings);
}

socket.on('user:profile-updated', (result) => {
  if (btnSaveProfileSettings) {
    btnSaveProfileSettings.disabled = false;
    btnSaveProfileSettings.innerHTML = '<i data-lucide="check" style="width: 16px; height: 16px;"></i> <span>Salvar Alterações do Perfil</span>';
    if (window.lucide) window.lucide.createIcons();
  }

  const updated = result?.user || (result?.name ? result : null);
  if (updated) {
    if (!currentUser) currentUser = {};
    currentUser.avatar = updated.avatar || currentUser.avatar;
    currentUser.bannerColor = updated.bannerColor || currentUser.bannerColor;
    currentUser.statusMode = updated.statusMode || updated.status || currentUser.statusMode;
    currentUser.customStatusText = updated.customStatusText !== undefined ? updated.customStatusText : currentUser.customStatusText;
    currentUser.bio = updated.bio !== undefined ? updated.bio : currentUser.bio;

    if (myAvatarImg) myAvatarImg.src = currentUser.avatar;
    if (cardMyAvatar) cardMyAvatar.src = currentUser.avatar;
    if (settingAvatarPreview) settingAvatarPreview.src = currentUser.avatar;
    if (previewAvatar) previewAvatar.src = currentUser.avatar;
    updateMyUserStatus();

    if (profileSaveAlert) {
      profileSaveAlert.textContent = 'Perfil atualizado com sucesso!';
      profileSaveAlert.className = 'account-alert success';
      profileSaveAlert.style.display = 'block';
      setTimeout(() => {
        if (profileSaveAlert) profileSaveAlert.style.display = 'none';
      }, 4000);
    }

    selectedAvatarFile = null;
    renderMembersSidebar();
  }
});

// ==========================================
// MODO GRADE / FOCO NO PALCO DE VÍDEO (FASE 3)
// ==========================================
let isGridModeActive = localStorage.getItem('gamezeda_grid_mode') === 'true';

function renderGridStreams() {
  const dynamicGridContainer = document.getElementById('dynamic-grid-screens');
  if (!videoGrid) return;

  const totalStreams = activeStreams.size;
  videoGrid.classList.toggle('grid-mode', isGridModeActive);
  videoGrid.classList.toggle('single-stream', totalStreams <= 1);

  if (btnStageGridText) {
    btnStageGridText.textContent = isGridModeActive ? 'Modo Foco' : 'Modo Grade';
  }
  if (btnStageGridMode) {
    btnStageGridMode.classList.toggle('active', isGridModeActive);
  }

  // Se o Modo Grade NÃO estiver ativo, ou houver 1 ou menos transmissões ativas:
  if (!isGridModeActive || totalStreams <= 1) {
    if (dynamicGridContainer) {
      dynamicGridContainer.innerHTML = '';
      dynamicGridContainer.style.display = 'none';
    }
    if (totalStreams >= 1) {
      const streamIdToView = currentViewedStreamId && activeStreams.has(currentViewedStreamId)
        ? currentViewedStreamId
        : Array.from(activeStreams.keys())[0];
      if (streamIdToView) {
        viewStream(streamIdToView);
      }
      if (streamSwitcherBar) {
        streamSwitcherBar.style.display = totalStreams >= 2 ? 'flex' : 'none';
      }
    } else {
      if (mainScreenTile) mainScreenTile.style.display = 'none';
      if (streamSwitcherBar) streamSwitcherBar.style.display = 'none';
    }
    return;
  }

  // MODO GRADE ATIVO COM 2 OU MAIS TRANSMISSÕES:
  // Oculta o mainScreenTile para renderizar todos os vídeos lado a lado
  if (mainScreenTile) mainScreenTile.style.display = 'none';
  if (streamSwitcherBar) streamSwitcherBar.style.display = 'none';
  if (sharedScreenVideo) sharedScreenVideo.srcObject = null;

  if (videoStage) videoStage.style.display = 'flex';
  if (messagesContainer) messagesContainer.style.display = 'none';
  const chatInputWrap = document.querySelector('.chat-input-wrapper');
  if (chatInputWrap) chatInputWrap.style.display = 'none';

  if (!dynamicGridContainer) return;
  dynamicGridContainer.style.display = 'contents';
  dynamicGridContainer.innerHTML = '';

  activeStreams.forEach(streamItem => {
    const tile = document.createElement('div');
    tile.className = 'screen-tile grid-screen-item';
    tile.setAttribute('data-stream-id', streamItem.id);

    const isLocal = streamItem.id === 'local';
    tile.innerHTML = `
      <div class="screen-tile-badge">
        <span class="live-indicator">AO VIVO 1080p60</span>
        <span>${escapeHtml(streamItem.name)}</span>
      </div>
      <div class="screen-tile-controls">
        <button class="screen-btn btn-grid-focus" title="Focar nesta transmissão (Modo Foco)">
          <i data-lucide="minimize-2" style="width: 15px; height: 15px;"></i>
        </button>
        <button class="screen-btn btn-grid-fullscreen" title="Tela Cheia">
          <i data-lucide="maximize" style="width: 15px; height: 15px;"></i>
        </button>
        ${isLocal ? `
          <button class="screen-btn btn-grid-stop" title="Parar Transmissão">
            <i data-lucide="x" style="width: 15px; height: 15px;"></i>
          </button>
        ` : ''}
      </div>
      <video autoplay playsinline muted></video>
    `;

    const vid = tile.querySelector('video');
    if (vid) {
      vid.srcObject = streamItem.stream;
      vid.play().catch(() => {});
    }

    const btnFocus = tile.querySelector('.btn-grid-focus');
    if (btnFocus) {
      btnFocus.addEventListener('click', (e) => {
        e.stopPropagation();
        applyGridMode(false);
        viewStream(streamItem.id);
      });
    }

    const btnFs = tile.querySelector('.btn-grid-fullscreen');
    if (btnFs) {
      btnFs.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!document.fullscreenElement) {
          tile.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    const btnStop = tile.querySelector('.btn-grid-stop');
    if (btnStop) {
      btnStop.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleScreenShare(false);
      });
    }

    tile.addEventListener('dblclick', () => {
      applyGridMode(false);
      viewStream(streamItem.id);
    });

    dynamicGridContainer.appendChild(tile);
  });

  if (window.lucide) window.lucide.createIcons();
}

function applyGridMode(active) {
  isGridModeActive = active;
  localStorage.setItem('gamezeda_grid_mode', active ? 'true' : 'false');
  renderGridStreams();
}

if (btnStageGridMode) {
  btnStageGridMode.addEventListener('click', () => {
    applyGridMode(!isGridModeActive);
  });
}
applyGridMode(isGridModeActive);

// ==========================================
// MINI PLAYER FLUTUANTE (PICTURE-IN-PICTURE - FASE 3)
// ==========================================
function updateStreamPiP() {
  if (!streamPipWidget || !streamPipVideo) return;

  const isVideoStageVisible = videoStage && videoStage.style.display !== 'none';
  const hasActiveStream = inVoice && activeStreams && activeStreams.size > 0;

  if (!isVideoStageVisible && hasActiveStream) {
    const streamId = currentViewedStreamId || Array.from(activeStreams.keys())[0];
    const sData = activeStreams.get(streamId);
    if (sData && sData.stream) {
      if (streamPipVideo.srcObject !== sData.stream) {
        streamPipVideo.srcObject = sData.stream;
      }
      if (streamPipName) {
        streamPipName.textContent = `${sData.name} (Ao Vivo)`;
      }
      streamPipWidget.style.display = 'flex';
      return;
    }
  }

  streamPipWidget.style.display = 'none';
  if (streamPipVideo.srcObject) {
    streamPipVideo.srcObject = null;
  }
}

if (btnPipFullscreen) {
  btnPipFullscreen.addEventListener('click', () => {
    if (videoStage) videoStage.style.display = 'flex';
    if (messagesContainer) messagesContainer.style.display = 'none';
    const wrapper = document.querySelector('.chat-input-wrapper');
    if (wrapper) wrapper.style.display = 'none';
    updateStreamPiP();
  });
}

if (btnPipClose) {
  btnPipClose.addEventListener('click', () => {
    if (streamPipWidget) streamPipWidget.style.display = 'none';
    if (streamPipVideo && streamPipVideo.srcObject) {
      streamPipVideo.srcObject = null;
    }
  });
}

// ==========================================
// SOUNDBOARD DO SERVIDOR & DOWNLOAD MOBILE
// ==========================================
initSoundboard({
  socket,
  webrtc,
  getInVoice: () => inVoice,
  getCurrentUser: () => currentUser
});

initMobileModal();

// ==========================================
// SERVIDORES (GUILDS) & MENSAGENS DIRETAS (DMs)
// ==========================================
initGuilds({
  socket,
  onGuildSelected: (data) => {
    const channelsServerView = document.getElementById('channels-server-view');
    const channelsDmView = document.getElementById('channels-dm-view');
    if (channelsServerView) channelsServerView.style.display = 'flex';
    if (channelsDmView) channelsDmView.style.display = 'none';

    clearActiveDmTarget();

    if (data.categories) allCategories = data.categories;
    if (data.channels) allChannels = data.channels;
    if (data.chatMessages) Object.assign(channelMessagesStore, data.chatMessages);

    // Seleciona o primeiro canal de texto do servidor selecionado
    // Seleciona o primeiro canal de texto do servidor selecionado
    const firstTextChannel = (data.channels || []).find(c => c.type === 'text');
    if (firstTextChannel) {
      switchTextChannel(firstTextChannel.id);
    } else {
      renderSidebarChannels();
      renderCurrentChannelMessages();
    }
  },
  onHomeSelected: () => {
    const channelsServerView = document.getElementById('channels-server-view');
    const channelsDmView = document.getElementById('channels-dm-view');
    if (channelsServerView) channelsServerView.style.display = 'none';
    if (channelsDmView) channelsDmView.style.display = 'flex';

    loadConversations();
  }
});

initDirectMessages({
  socket,
  getCurrentUser: () => currentUser,
  onOpenDm: ({ targetUser, messages }) => {
    openDmChatView(targetUser, messages);
  }
});

function openDmChatView(targetUser, messages = []) {
  if (currentChannelName) {
    currentChannelName.textContent = `@${targetUser}`;
  }
  if (channelDesc) {
    channelDesc.textContent = `Mensagens Diretas com ${targetUser}`;
  }
  if (chatInput) {
    chatInput.placeholder = `Conversar com @${targetUser}`;
  }

  if (messagesContainer) {
    messagesContainer.innerHTML = '';
    const welcomeDiv = document.createElement('div');
    welcomeDiv.style.padding = '32px 16px 16px 16px';
    welcomeDiv.innerHTML = `
      <div style="width: 56px; height: 56px; border-radius: 50%; background: #5865F2; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; margin-bottom: 12px; color: #fff;">
        @
      </div>
      <h2 style="font-size: 22px; font-weight: 800; color: #f2f3f5; margin-bottom: 6px;">${escapeHtml(targetUser)}</h2>
      <p style="color: #949ba4; font-size: 13px;">Este é o início da sua história de mensagens diretas com <strong>${escapeHtml(targetUser)}</strong>.</p>
    `;
    messagesContainer.appendChild(welcomeDiv);

    messages.forEach(msg => {
      appendDirectMessageToChat(msg);
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

window.appendDirectMessageToChat = function(msg) {
  if (!messagesContainer) return;
  const div = document.createElement('div');
  div.className = 'message-group';
  div.id = `msg-${msg.id}`;

  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(msg.sender)}`;

  div.innerHTML = `
    <img src="${avatarUrl}" class="message-avatar" alt="${escapeHtml(msg.sender)}">
    <div class="message-content">
      <div class="message-header">
        <span class="message-author">${escapeHtml(msg.sender)}</span>
        <span class="message-timestamp">${escapeHtml(msg.timestamp || '')}</span>
      </div>
      <div class="message-body">${escapeHtml(msg.text || '')}</div>
    </div>
  `;
  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
};

// Listener do Indicador de Digitação (Typing Indicator)
const activeTypingUsers = new Set();
socket.on('chat:user-typing', ({ channelId, username, isTyping }) => {
  const dmTarget = getActiveDmTarget();
  const currentTarget = dmTarget ? `dm-${dmTarget}` : currentTextChannel;
  if (channelId !== currentTarget) return;

  if (isTyping) {
    activeTypingUsers.add(username);
  } else {
    activeTypingUsers.delete(username);
  }

  const typingEl = document.getElementById('chat-typing-indicator');
  const typingTextEl = document.getElementById('chat-typing-text');
  if (!typingEl || !typingTextEl) return;

  if (activeTypingUsers.size === 0) {
    typingEl.style.display = 'none';
  } else {
    const list = Array.from(activeTypingUsers);
    if (list.length === 1) {
      typingTextEl.innerHTML = `<strong>${escapeHtml(list[0])}</strong> está digitando...`;
    } else if (list.length === 2) {
      typingTextEl.innerHTML = `<strong>${escapeHtml(list[0])}</strong> e <strong>${escapeHtml(list[1])}</strong> estão digitando...`;
    } else {
      typingTextEl.textContent = 'Várias pessoas estão digitando...';
    }
    typingEl.style.display = 'flex';
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

  const ctxItemSendDm = document.getElementById('ctx-item-send-dm');
  if (ctxItemSendDm) {
    ctxItemSendDm.onclick = (ev) => {
      ev.stopPropagation();
      closeContextMenu();
      if (typeof window.startDirectMessage === 'function') {
        window.startDirectMessage(peerName);
      }
    };
  }

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

  const isVisible = userProfileCardPopout && userProfileCardPopout.style.display === 'block';
  if (isVisible && activePopoutTargetUser && activePopoutTargetUser.name === currentUser.name) {
    closeUserProfileCard();
  } else {
    openUserProfileCard(currentUser, btnCurrentUserProfile, e);
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

  closeUserProfileCard();
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

if (btnPopoutLogout) {
  btnPopoutLogout.addEventListener('click', performLogout);
}

document.addEventListener('click', (e) => {
  if (userContextMenu && !userContextMenu.contains(e.target)) closeContextMenu();
  if (userProfileCardPopout && userProfileCardPopout.style.display === 'block') {
    if (Date.now() - popoutOpenedAt < 120) return;
    if (!userProfileCardPopout.contains(e.target) && !btnCurrentUserProfile?.contains(e.target)) {
      closeUserProfileCard();
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
// DESABILITAR MENU DE CONTEXTO PADRÃO DO NAVEGADOR EM ÁREAS DE INTERFACE,
// MAS PERMITIR EM CHAT, LINKS, INPUTS OU TEXTO SELECIONADO (PARA COPIAR/COLAR)
// =========================================================================
document.addEventListener('contextmenu', (e) => {
  const isCustomTrigger = e.target.closest('.voice-user-pill') ||
                          e.target.closest('.user-voice-card') ||
                          e.target.closest('.member-item') ||
                          e.target.closest('#main-screen-tile');

  // Se for um gatilho de usuário com menu próprio, não interceptamos aqui
  if (isCustomTrigger) {
    return;
  }

  // Verifica se o usuário tem algum texto selecionado na tela
  const hasTextSelection = Boolean(window.getSelection && window.getSelection().toString().trim().length > 0);

  // Verifica se o clique foi dentro da área de mensagens do chat, links ou inputs
  const isEditableOrChat = Boolean(
    e.target.closest('.messages-container') ||
    e.target.closest('.message-item') ||
    e.target.closest('.chat-link') ||
    e.target.closest('a') ||
    e.target.closest('input') ||
    e.target.closest('textarea') ||
    e.target.closest('.chat-input-wrapper')
  );

  // Se o usuário selecionou texto ou está no chat/links/inputs, libera o menu nativo do navegador para Copiar/Colar
  if (hasTextSelection || isEditableOrChat) {
    closeContextMenu();
    return;
  }

  // Para o restante da interface de botões e fundo, bloqueia o menu nativo do navegador
  e.preventDefault();
  closeContextMenu();
});

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

  // Fechar popover de mensagens fixadas ao clicar fora
  if (pinnedMessagesPopover && pinnedMessagesPopover.style.display === 'flex') {
    if (!pinnedMessagesPopover.contains(e.target) && (!btnPinnedMessages || !btnPinnedMessages.contains(e.target))) {
      closePinnedMessagesPopover();
    }
  }

  // Fechar popover de reações rápidas ao clicar fora
  if (quickReactionPicker && quickReactionPicker.style.display === 'flex') {
    if (!quickReactionPicker.contains(e.target) && !e.target.closest('.msg-action-btn[data-action="react"]') && !e.target.closest('.message-reaction-add-btn')) {
      closeQuickReactionPicker();
    }
  }

  // Fechar autocomplete de menções ao clicar fora
  if (mentionAutocompletePopover && mentionAutocompletePopover.style.display === 'flex') {
    if (!mentionAutocompletePopover.contains(e.target) && e.target !== chatInput) {
      closeMentionAutocomplete();
    }
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.key === 'Esc') {
    closeContextMenu();
    closeUserProfileCard();
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
    closeSoundEmojiPopover();
    closeDeleteMessageModal();
    closePinnedMessagesPopover();
    closeQuickReactionPicker();
    closeMentionAutocomplete();
    clearReplyTarget();
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


// ==========================================
// CONTROLE DE MENUS E MODAIS DE CANAIS/CATEGORIAS
// ==========================================
function closeServerDropdown() {
  if (serverDropdownMenu) {
    serverDropdownMenu.style.display = 'none';
  }
}
window.closeServerDropdown = closeServerDropdown;

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
    const activeGuild = (window.getActiveGuildId && window.getActiveGuildId()) || 'gamezeda';
    const defaultCat = isVoice ? `cat-voice-${activeGuild}` : `cat-text-${activeGuild}`;
    const categoryId = selectChannelCategory ? selectChannelCategory.value : defaultCat;

    btnConfirmCreateChannel.disabled = true;
    btnConfirmCreateChannel.textContent = 'Criando...';

    socket.emit('channel:create', { name: rawName, type, categoryId, guildId: activeGuild }, (res) => {
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

    const activeGuild = (window.getActiveGuildId && window.getActiveGuildId()) || 'gamezeda';
    btnConfirmCreateCategory.disabled = true;
    btnConfirmCreateCategory.textContent = 'Criando...';

    socket.emit('category:create', { name: rawName, guildId: activeGuild }, (res) => {
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

window.openCreateChannelModal = openCreateChannelModal;
window.openCreateCategoryModal = openCreateCategoryModal;
window.getAllOnlineUsers = () => allOnlineUsers;

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
setupDesktopClient({
  socket,
  webrtc,
  getInVoice: () => inVoice,
  getAllChannels: () => allChannels,
  getCurrentUser: () => currentUser,
  connectToVoiceChannel,
  registerStream,
  showSoundToast,
  updateMyUserStatus,
  renderMembersSidebar,
  renderVoiceStageCards,
  getMyGameActivity: () => myGameActivity,
  setMyGameActivity: (act) => { myGameActivity = act; }
});

// ==========================================
// CLIENTE ALFREDO BOT & WATCH PARTY (YOUTUBE)
// ==========================================
initWatchParty({
  socket,
  getUserConfig,
  isDeafened: () => isDeafened,
  getInVoice: () => inVoice,
  showSoundToast
});

// ==========================================
// VISUALIZADOR DE IMAGENS EM TELA CHEIA (LIGHTBOX DISCORD) & ÁREA DE TRANSFERÊNCIA
// ==========================================
initImageLightboxAndClipboard(messagesContainer);

