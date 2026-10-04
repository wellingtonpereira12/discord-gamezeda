import { sounds } from './sounds.js';
import { WebRTCManager } from './webrtc.js';

if (window.lucide) {
  window.lucide.createIcons();
}

const socket = io();

// ==========================================
// ELEMENTOS DO DOM
// ==========================================
// Modal de Login
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username-input');
const avatarPreview = document.getElementById('avatar-preview');

// Perfil Local
const myAvatarImg = document.getElementById('my-avatar');
const myUsernameEl = document.getElementById('my-username');
const myUserStatusEl = document.getElementById('my-userstatus');
const cardMyAvatar = document.getElementById('card-my-avatar');
const cardMyName = document.getElementById('card-my-name');
const cardLocalUser = document.getElementById('card-local-user');

// Status de Voz e Ações Rápidas
const voiceStatusBox = document.getElementById('voice-status-box');
const quickDisconnectBtn = document.getElementById('quick-disconnect-btn');
const quickScreenShareBtn = document.getElementById('quick-screenshare-btn');
const btnVoiceSoundboard = document.getElementById('btn-voice-soundboard');

// Controles do Usuário
const btnToggleMic = document.getElementById('btn-toggle-mic');
const btnToggleDeaf = document.getElementById('btn-toggle-deaf');
const btnUserSettings = document.getElementById('btn-user-settings');

// Canais e Membros
const channelGamezeda = document.getElementById('btn-channel-gamezeda');
const voiceUsersContainer = document.getElementById('voice-users-container');
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
let availableSounds = [];

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

  if (!currentViewedStreamId || !activeStreams.has(currentViewedStreamId)) {
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
usernameInput.addEventListener('input', (e) => {
  const val = e.target.value.trim();
  avatarPreview.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(val || 'Gamezeda')}`;
});

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = usernameInput.value.trim();
  if (!name) return;

  const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`;
  currentUser = { name, avatar };

  myAvatarImg.src = avatar;
  myUsernameEl.textContent = name;
  cardMyAvatar.src = avatar;
  cardMyName.textContent = `${name} (Você)`;

  socket.emit('join:server', { name });
  loginModal.style.display = 'none';
  sounds.playJoin();
});

socket.on('init:state', (data) => {
  if (data.chatMessages) {
    Object.assign(channelMessagesStore, data.chatMessages);
  }
  allOnlineUsers = data.onlineUsers || [];
  allVoiceUsers = data.voiceUsers || [];
  renderMembersSidebar();
  renderVoiceChannelUsers();
  renderCurrentChannelMessages();
});

socket.on('members:update', (usersList) => {
  allOnlineUsers = usersList;
  renderMembersSidebar();
});

socket.on('voice:update', ({ users }) => {
  allVoiceUsers = users;
  renderVoiceChannelUsers();
  renderVoiceStageCards();
  renderMembersSidebar();
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

// ==========================================
// RENDERIZAÇÃO DE MEMBROS
// ==========================================
function renderMembersSidebar() {
  if (!membersListContent) return;
  membersListContent.innerHTML = '';

  const voiceMembers = allOnlineUsers.filter(u => u.inVoice);
  const otherMembers = allOnlineUsers.filter(u => !u.inVoice);

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

function renderVoiceChannelUsers() {
  if (!voiceUsersContainer) return;
  voiceUsersContainer.innerHTML = '';

  allVoiceUsers.forEach(user => {
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
        channelGamezeda.click();
      }
    });

    if (!isLocal) {
      pill.addEventListener('contextmenu', (e) => openContextMenu(e, user.id, user.name));
    }

    voiceUsersContainer.appendChild(pill);
  });
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

  const otherVoiceUsers = allVoiceUsers.filter(u => u.id !== socket.id);
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

// ==========================================
// CHAT & CANAIS DE TEXTO
// ==========================================
document.querySelectorAll('[data-channel]').forEach(el => {
  el.addEventListener('click', () => {
    const chName = el.getAttribute('data-channel');
    switchTextChannel(chName);
  });
});

function switchTextChannel(chName) {
  currentTextChannel = chName;

  document.querySelectorAll('[data-channel]').forEach(c => {
    c.classList.toggle('active', c.getAttribute('data-channel') === chName);
  });

  currentChannelNameEl.textContent = chName;
  chatInput.placeholder = `Conversar em #${chName}`;

  if (videoStage.style.display === 'flex') {
    videoStage.style.display = 'none';
    messagesContainer.style.display = 'flex';
    document.querySelector('.chat-input-wrapper').style.display = 'block';
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
// CONEXÃO DE VOZ & TELA HD
// ==========================================
channelGamezeda.addEventListener('click', async () => {
  if (inVoice) {
    videoStage.style.display = 'flex';
    messagesContainer.style.display = 'none';
    document.querySelector('.chat-input-wrapper').style.display = 'none';
    return;
  }

  webrtc.ensureAudioContext();
  sounds.playJoin();
  inVoice = true;

  isMuted = false;
  btnToggleMic.classList.remove('active-muted');
  btnStageMic.classList.remove('active-muted');

  voiceStatusBox.style.display = 'flex';
  videoStage.style.display = 'flex';
  messagesContainer.style.display = 'none';
  document.querySelector('.chat-input-wrapper').style.display = 'none';
  myUserStatusEl.textContent = '🔊 Em voz';

  await webrtc.startAudio();
  socket.emit('voice:join');
});

function leaveVoice() {
  if (!inVoice) return;

  sounds.playLeave();
  webrtc.leaveVoice();

  inVoice = false;
  isScreenSharing = false;

  unregisterStream('local');

  voiceStatusBox.style.display = 'none';
  videoStage.style.display = 'none';
  messagesContainer.style.display = 'flex';
  document.querySelector('.chat-input-wrapper').style.display = 'block';

  btnStageScreen.classList.remove('active-stream');
  btnStageScreenText.textContent = 'Compartilhar Tela HD';

  myUserStatusEl.textContent = 'Online';
  socket.emit('voice:leave');
}

quickDisconnectBtn.addEventListener('click', leaveVoice);
btnStageDisconnect.addEventListener('click', leaveVoice);

// Compartilhar Tela em HD
async function toggleScreenShare() {
  if (!inVoice) {
    channelGamezeda.click();
  }

  if (isScreenSharing) {
    webrtc.stopScreenShare();
    unregisterStream('local');
    isScreenSharing = false;
    btnStageScreen.classList.remove('active-stream');
    btnStageScreenText.textContent = 'Compartilhar Tela HD';
  } else {
    const stream = await webrtc.startScreenShare();
    if (stream) {
      isScreenSharing = true;
      registerStream('local', stream, `${currentUser ? currentUser.name : 'Você'} (Sua Tela HD)`, currentUser ? currentUser.avatar : '', true);
      btnStageScreen.classList.add('active-stream');
      btnStageScreenText.textContent = 'Parar Tela';
      showSoundToast('🔊 Transmitindo tela com som do sistema!');
    }
  }
}

quickScreenShareBtn.addEventListener('click', toggleScreenShare);
btnStageScreen.addEventListener('click', toggleScreenShare);
btnStopScreenTile.addEventListener('click', toggleScreenShare);

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
// MODAL DE CONFIGURAÇÕES DE DISPOSITIVOS E ÁUDIO
// ==========================================
async function openSettingsModal() {
  settingsModal.style.display = 'flex';
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
// SOUNDBOARD DO SERVIDOR
// ==========================================
async function openSoundboardModal() {
  soundboardModal.style.display = 'flex';
  await loadSoundboardSounds();
}

function closeSoundboardModal() {
  soundboardModal.style.display = 'none';
}

async function loadSoundboardSounds() {
  soundboardGrid.innerHTML = '<div style="color: #949ba4; padding: 20px; text-align: center; grid-column: 1 / -1;">Carregando...</div>';
  try {
    const res = await fetch('/api/soundboard');
    const data = await res.json();
    if (data.success) {
      availableSounds = data.sounds;
      renderSoundboardGrid();
    }
  } catch (err) {
    soundboardGrid.innerHTML = '<div style="color: #ed4245; padding: 20px; text-align: center; grid-column: 1 / -1;">Erro ao carregar sons.</div>';
  }
}

function renderSoundboardGrid(filterText = '') {
  soundboardGrid.innerHTML = '';
  let filtered = availableSounds;
  if (filterText) {
    const q = filterText.toLowerCase();
    filtered = filtered.filter(s => s.name.toLowerCase().includes(q) || s.emoji.includes(q));
  }

  if (filtered.length === 0) {
    soundboardGrid.innerHTML = '<div style="color: #949ba4; padding: 20px; text-align: center; grid-column: 1 / -1;">Nenhum som encontrado.</div>';
    return;
  }

  filtered.forEach(sound => {
    const tile = document.createElement('div');
    tile.className = 'soundboard-tile';
    tile.innerHTML = `
      <div class="soundboard-tile-emoji">${sound.emoji}</div>
      <div class="soundboard-tile-name" title="${escapeHtml(sound.name)}">${escapeHtml(sound.name)}</div>
    `;

    tile.addEventListener('click', () => {
      playSoundLocally(sound.file_url);
      socket.emit('soundboard:play', {
        soundId: sound.id,
        soundUrl: sound.file_url,
        soundName: sound.name,
        emoji: sound.emoji
      });
      showSoundToast(`Você tocou: ${sound.emoji} ${sound.name}`);
    });

    soundboardGrid.appendChild(tile);
  });
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

btnVoiceSoundboard.addEventListener('click', openSoundboardModal);
btnStageSoundboard.addEventListener('click', openSoundboardModal);
btnOpenSoundboardHeader.addEventListener('click', openSoundboardModal);
btnCloseSoundboard.addEventListener('click', closeSoundboardModal);

soundboardSearchInput.addEventListener('input', (e) => {
  renderSoundboardGrid(e.target.value.trim());
});

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

function closeContextMenu() {
  if (userContextMenu) userContextMenu.style.display = 'none';
  currentContextPeerId = null;
}

document.addEventListener('click', (e) => {
  if (userContextMenu && !userContextMenu.contains(e.target)) closeContextMenu();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeContextMenu();
    closeSettingsModal();
    closeSoundboardModal();
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

if (window.lucide) {
  window.lucide.createIcons();
}
