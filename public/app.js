import { sounds } from './sounds.js';
import { WebRTCManager } from './webrtc.js';

if (window.lucide) {
  window.lucide.createIcons();
}

const socket = io();

// Elementos do DOM
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username-input');
const avatarPreview = document.getElementById('avatar-preview');

const myAvatarImg = document.getElementById('my-avatar');
const myUsernameEl = document.getElementById('my-username');
const myUserStatusEl = document.getElementById('my-userstatus');
const cardMyAvatar = document.getElementById('card-my-avatar');
const cardMyName = document.getElementById('card-my-name');
const cardLocalUser = document.getElementById('card-local-user');

const voiceStatusBox = document.getElementById('voice-status-box');
const quickDisconnectBtn = document.getElementById('quick-disconnect-btn');
const quickScreenShareBtn = document.getElementById('quick-screenshare-btn');
const quickCameraBtn = document.getElementById('quick-camera-btn');

const btnToggleMic = document.getElementById('btn-toggle-mic');
const btnToggleDeaf = document.getElementById('btn-toggle-deaf');

const channelGamezeda = document.getElementById('btn-channel-gamezeda');
const voiceUsersContainer = document.getElementById('voice-users-container');
const membersListContent = document.getElementById('members-list-content');
const dynamicVoiceCards = document.getElementById('dynamic-voice-cards');

const videoStage = document.getElementById('video-stage');
const streamSwitcherBar = document.getElementById('stream-switcher-bar');
const mainScreenTile = document.getElementById('main-screen-tile');
const sharedScreenVideo = document.getElementById('shared-screen-video');
const screenSharerName = document.getElementById('screen-sharer-name');
const btnFullscreenScreen = document.getElementById('btn-fullscreen-screen');
const btnStopScreenTile = document.getElementById('btn-stop-screen-tile');

const btnStageScreen = document.getElementById('btn-stage-screen');
const btnStageScreenText = document.getElementById('btn-stage-screen-text');
const btnStageCamera = document.getElementById('btn-stage-camera');
const btnStageMic = document.getElementById('btn-stage-mic');
const btnStageDisconnect = document.getElementById('btn-stage-disconnect');

const messagesContainer = document.getElementById('messages-container');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const currentChannelNameEl = document.getElementById('current-channel-name');

// Menu de Contexto do Usuário (Botão Direito)
const userContextMenu = document.getElementById('user-context-menu');
const ctxVolumeSlider = document.getElementById('ctx-volume-slider');
const ctxVolumeVal = document.getElementById('ctx-volume-val');
const ctxItemMute = document.getElementById('ctx-item-mute');
const ctxCheckMute = document.getElementById('ctx-check-mute');
const ctxItemSfx = document.getElementById('ctx-item-sfx');
const ctxCheckSfx = document.getElementById('ctx-check-sfx');
const ctxItemVideo = document.getElementById('ctx-item-video');
const ctxCheckVideo = document.getElementById('ctx-check-video');

// Configurações locais de usuário (Volume, Mute, SFX, Vídeo)
// peerId -> { volume: 100, muted: false, sfxMuted: false, videoDisabled: false }
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

// Estado Local
let currentUser = null;
let currentTextChannel = 'geral';
let inVoice = false;
let isMuted = false;
let isDeafened = false;
let isScreenSharing = false;

// Gerenciador de Múltiplas Transmissões Simultâneas
// id -> { id, name, avatar, stream, isLocal }
const activeStreams = new Map();
let currentViewedStreamId = null;

const channelMessagesStore = {};
let allOnlineUsers = [];
let allVoiceUsers = [];

// Gerenciador WebRTC
const webrtc = new WebRTCManager(
  socket,
  // onRemoteTrack (quando chega vídeo de tela compartilhada)
  (peerId, stream, track) => {
    console.log('[App 📺] Vídeo recebido de:', peerId);
    const peer = allOnlineUsers.find(u => u.id === peerId);
    const name = peer ? peer.name : `Participante ${peerId.substring(0, 4)}`;
    const avatar = peer ? peer.avatar : `https://api.dicebear.com/7.x/bottts/svg?seed=${peerId}`;

    registerStream(peerId, stream, name, avatar, false);
  },
  // onRemoteRemove
  (peerId, type) => {
    console.log('[App] Remoção de track de:', peerId, type);
    if (type === 'video' || !type) {
      unregisterStream(peerId);
    }
  },
  // onSpeakingChange
  (isSpeaking) => {
    socket.emit('voice:speaking', { isSpeaking });
    if (cardLocalUser) cardLocalUser.classList.toggle('speaking', isSpeaking);
    const localPill = document.querySelector(`.voice-user-pill[data-user-id="${socket.id}"]`);
    if (localPill) localPill.classList.toggle('speaking', isSpeaking);
  },
  // onRemoteSpeaking
  (peerId, isSpeaking) => {
    const card = document.getElementById(`voice-card-${peerId}`);
    if (card) card.classList.toggle('speaking', isSpeaking);
    const pill = document.querySelector(`.voice-user-pill[data-user-id="${peerId}"]`);
    if (pill) pill.classList.toggle('speaking', isSpeaking);
  }
);

// ==========================================
// GERENCIAMENTO DE MÚLTIPLAS LIVES / TELAS
// ==========================================
function registerStream(id, stream, name, avatar, isLocal) {
  activeStreams.set(id, { id, name, avatar, stream, isLocal });

  // Se não estiver assistindo nenhuma live no momento, foca nesta automaticamente
  if (!currentViewedStreamId || !activeStreams.has(currentViewedStreamId)) {
    viewStream(id);
  } else {
    // Apenas atualiza a barra de troca de lives
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

function viewStream(id) {
  const streamData = activeStreams.get(id);
  if (!streamData) return;

  currentViewedStreamId = id;
  sharedScreenVideo.srcObject = streamData.stream;
  const config = getUserConfig(id);
  sharedScreenVideo.style.display = config.videoDisabled ? 'none' : 'block';
  sharedScreenVideo.play().catch(e => console.warn('Video play blocked:', e));

  screenSharerName.textContent = streamData.name;
  mainScreenTile.style.display = 'flex';
  videoStage.style.display = 'flex';
  messagesContainer.style.display = 'none';
  document.querySelector('.chat-input-wrapper').style.display = 'none';

  renderStreamSwitcherBar();
  renderVoiceStageCards();
  renderVoiceChannelUsers();
}

// Barra de seleção rápida quando 2 ou mais pessoas transmitem tela
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
    label.textContent = 'Transmissões:';
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

// Preview dinâmico de avatar
usernameInput.addEventListener('input', (e) => {
  const val = e.target.value.trim();
  avatarPreview.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(val || 'Gamezeda')}`;
});

// Entrar no servidor
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

// Inicialização com dados do servidor
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

// Quando alguém ativa/desativa tela
socket.on('voice:peer-screen-status', ({ peerId, isSharing }) => {
  console.log(`[Socket 📺] Peer ${peerId} screen status:`, isSharing);
  if (!isSharing) {
    unregisterStream(peerId);
  }
});

// ==========================================
// RENDERIZAÇÃO DE MEMBROS REAIS
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
    div.addEventListener('contextmenu', (e) => {
      openContextMenu(e, user.id, user.name);
    });
  }

  return div;
}

// Lista abaixo de 🔊 Gamezeda
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

    // Clicar no pill do usuário que está transmitindo troca para a live dele!
    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      if (activeStreams.has(streamKey)) {
        viewStream(streamKey);
      } else {
        channelGamezeda.click();
      }
    });

    // Botão direito abre menu de contexto
    if (!isLocal) {
      pill.addEventListener('contextmenu', (e) => {
        openContextMenu(e, user.id, user.name);
      });
    }

    voiceUsersContainer.appendChild(pill);
  });
}

// Cards dos participantes no palco
function renderVoiceStageCards() {
  if (!dynamicVoiceCards) return;
  dynamicVoiceCards.innerHTML = '';

  // Card do usuário local
  if (cardLocalUser) {
    const hasLocalStream = activeStreams.has('local');
    cardLocalUser.classList.toggle('has-stream', hasLocalStream);
    cardLocalUser.onclick = () => {
      if (activeStreams.has('local')) {
        viewStream('local');
      }
    };
  }

  // Cards dos outros participantes
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

    // Clicar no card do usuário troca para a live dele!
    card.addEventListener('click', () => {
      if (activeStreams.has(user.id)) {
        viewStream(user.id);
      }
    });

    // Botão direito abre menu de contexto
    card.addEventListener('contextmenu', (e) => {
      openContextMenu(e, user.id, user.name);
    });

    dynamicVoiceCards.appendChild(card);
  });
}

// ==========================================
// CANAIS DE TEXTO SEPARADOS
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

function renderCurrentChannelMessages() {
  messagesContainer.innerHTML = '';
  const messages = channelMessagesStore[currentTextChannel] || [];

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
  div.innerHTML = `
    <img class="message-avatar" src="${msg.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(msg.sender)}" alt="${msg.sender}">
    <div class="message-content">
      <div class="message-header">
        <span class="message-author" style="color: #5865F2;">${escapeHtml(msg.sender)}</span>
        <span class="message-time">${msg.timestamp}</span>
      </div>
      <div class="message-text">${escapeHtml(msg.text)}</div>
    </div>
  `;
  messagesContainer.appendChild(div);
}

// ==========================================
// CONEXÃO DE VOZ & TELA
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
  btnStageScreenText.textContent = 'Compartilhar Tela';

  myUserStatusEl.textContent = 'Online';
  socket.emit('voice:leave');
}

quickDisconnectBtn.addEventListener('click', leaveVoice);
btnStageDisconnect.addEventListener('click', leaveVoice);

// COMPARTILHAR TELA
async function toggleScreenShare() {
  if (!inVoice) {
    channelGamezeda.click();
  }

  if (isScreenSharing) {
    webrtc.stopScreenShare();
    unregisterStream('local');
    isScreenSharing = false;
    btnStageScreen.classList.remove('active-stream');
    btnStageScreenText.textContent = 'Compartilhar Tela';
  } else {
    const stream = await webrtc.startScreenShare();
    if (stream) {
      isScreenSharing = true;
      registerStream('local', stream, `${currentUser ? currentUser.name : 'Você'} (Sua Tela)`, currentUser ? currentUser.avatar : '', true);
      btnStageScreen.classList.add('active-stream');
      btnStageScreenText.textContent = 'Parar Tela';
    }
  }
}

quickScreenShareBtn.addEventListener('click', toggleScreenShare);
btnStageScreen.addEventListener('click', toggleScreenShare);
btnStopScreenTile.addEventListener('click', toggleScreenShare);

// Tela Cheia
btnFullscreenScreen.addEventListener('click', () => {
  if (sharedScreenVideo.requestFullscreen) {
    sharedScreenVideo.requestFullscreen();
  } else if (sharedScreenVideo.webkitRequestFullscreen) {
    sharedScreenVideo.webkitRequestFullscreen();
  }
});

// Mutar / Desmutar
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

// Fone
btnToggleDeaf.addEventListener('click', () => {
  isDeafened = !isDeafened;
  btnToggleDeaf.classList.toggle('active-muted', isDeafened);
  document.querySelectorAll('audio').forEach(a => {
    a.muted = isDeafened;
  });
});

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Alerta de HTTPS
if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
  const httpsBanner = document.getElementById('https-banner');
  const httpsLink = document.getElementById('https-link');
  if (httpsBanner && httpsLink) {
    httpsLink.href = `https://${location.hostname}:${location.port || '3050'}`;
    httpsBanner.style.display = 'block';
  }
}

// ==========================================
// MENU DE CONTEXTO DO USUÁRIO (DISCORD STYLE)
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

  // Sincroniza slider com volume atual
  ctxVolumeSlider.value = config.volume;
  ctxVolumeVal.textContent = `${config.volume}%`;
  updateSliderBackground(ctxVolumeSlider, config.volume, 200);

  // Sincroniza checkboxes
  ctxCheckMute.classList.toggle('checked', config.muted);
  ctxCheckSfx.classList.toggle('checked', config.sfxMuted);
  ctxCheckVideo.classList.toggle('checked', config.videoDisabled);

  // Exibe o menu e posiciona com ajuste inteligente para caber na janela
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
  if (userContextMenu) {
    userContextMenu.style.display = 'none';
  }
  currentContextPeerId = null;
}

// Fechar menu ao clicar fora
document.addEventListener('click', (e) => {
  if (userContextMenu && !userContextMenu.contains(e.target)) {
    closeContextMenu();
  }
});

// Fechar com Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeContextMenu();
  }
});

// Slider de volume (0% a 200%)
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

// Checkbox: Silenciar (Voz)
ctxItemMute.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!currentContextPeerId) return;
  const config = getUserConfig(currentContextPeerId);
  config.muted = !config.muted;
  ctxCheckMute.classList.toggle('checked', config.muted);
  webrtc.setUserMuted(currentContextPeerId, config.muted);
});

// Checkbox: Silenciar efeitos sonoros (Som da tela)
ctxItemSfx.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!currentContextPeerId) return;
  const config = getUserConfig(currentContextPeerId);
  config.sfxMuted = !config.sfxMuted;
  ctxCheckSfx.classList.toggle('checked', config.sfxMuted);
  webrtc.setUserScreenAudioMuted(currentContextPeerId, config.sfxMuted);
});

// Checkbox: Desativar vídeo
ctxItemVideo.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!currentContextPeerId) return;
  const config = getUserConfig(currentContextPeerId);
  config.videoDisabled = !config.videoDisabled;
  ctxCheckVideo.classList.toggle('checked', config.videoDisabled);

  // Aplica imediatamente se estiver visualizando o vídeo deste usuário
  if (currentViewedStreamId === currentContextPeerId) {
    sharedScreenVideo.style.display = config.videoDisabled ? 'none' : 'block';
  }
});

// Botão direito no player da tela também abre as opções do streamer
if (mainScreenTile) {
  mainScreenTile.addEventListener('contextmenu', (e) => {
    if (currentViewedStreamId && currentViewedStreamId !== 'local' && currentViewedStreamId !== socket.id) {
      const peer = allOnlineUsers.find(u => u.id === currentViewedStreamId);
      openContextMenu(e, currentViewedStreamId, peer ? peer.name : 'Participante');
    }
  });
}
