// ==========================================================================
// FAKEDC - CLIENTE ALFREDO BOT DE MÚSICA & ASSISTIR JUNTOS (WATCH PARTY)
// ==========================================================================

import { escapeHtml, formatMusicSecs } from './utils.js';

let activeSocket = null;
let getUserConfigFn = () => ({ volume: 100, muted: false });
let isDeafenedFn = () => false;
let getInVoiceFn = () => false;
let showToastFn = (msg) => console.log(msg);

// Alfredo Music Bot
let hlsMusicInstance = null;
let currentMusicTrack = null;
let musicProgressTimer = null;
let isMusicPlaying = false;
let isMusicPaused = false;

// YouTube Watch Party
let ytPlayer = null;
let isYtApiReady = false;
let ytApiPromise = null;
let isRemoteAction = false;
let currentWatchPartyVideoId = null;
let isWatchPartyMuted = false;
let watchPartyVolume = 100;
let musicAudioCtx = null;
let musicSourceNode = null;
let musicGainNode = null;

export function applyMusicBotVolume() {
  const musicAudio = document.getElementById('music-bot-audio');
  const cfg = getUserConfigFn('bot-alfredo');
  if (musicAudio) {
    const isMuted = !!cfg.muted || isDeafenedFn();
    const vol = (cfg.volume !== undefined ? cfg.volume : 100);
    const gainVal = isMuted ? 0 : (vol / 100);

    if (vol > 100 && !isMuted) {
      if (!musicAudioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          try {
            musicAudioCtx = new AudioContextClass();
            musicSourceNode = musicAudioCtx.createMediaElementSource(musicAudio);
            musicGainNode = musicAudioCtx.createGain();
            musicSourceNode.connect(musicGainNode);
            musicGainNode.connect(musicAudioCtx.destination);
          } catch (e) {
            console.warn('[MusicBot] Web Audio GainNode falhou:', e);
          }
        }
      }
      if (musicAudioCtx && musicAudioCtx.state === 'suspended') {
        musicAudioCtx.resume().catch(() => {});
      }
      if (musicGainNode && musicAudioCtx) {
        try {
          musicGainNode.gain.setValueAtTime(gainVal, musicAudioCtx.currentTime);
        } catch (e) {
          musicGainNode.gain.value = gainVal;
        }
        musicAudio.volume = 1.0;
        musicAudio.muted = false;
      } else {
        musicAudio.muted = isMuted;
        musicAudio.volume = Math.max(0, Math.min(1, gainVal));
      }
    } else {
      if (musicGainNode && musicAudioCtx) {
        try {
          musicGainNode.gain.setValueAtTime(isMuted ? 0 : 1.0, musicAudioCtx.currentTime);
        } catch (e) {
          musicGainNode.gain.value = isMuted ? 0 : 1.0;
        }
      }
      musicAudio.muted = isMuted;
      musicAudio.volume = Math.max(0, Math.min(1, gainVal));
    }
  }
}

export function updateMusicProgress() {
  const musicAudio = document.getElementById('music-bot-audio');
  const musicTimeCurrent = document.getElementById('music-time-current');
  const musicTimeTotal = document.getElementById('music-time-total');
  const musicProgressBarFill = document.getElementById('music-progress-bar-fill');

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

export function updatePlayPauseButtonIcon(paused) {
  const musicPlayPauseIcon = document.getElementById('music-play-pause-icon');
  if (!musicPlayPauseIcon) return;
  if (paused) {
    musicPlayPauseIcon.setAttribute('data-lucide', 'play');
  } else {
    musicPlayPauseIcon.setAttribute('data-lucide', 'pause');
  }
  if (window.lucide) window.lucide.createIcons();
}

function handleAutoplayBlocked() {
  const musicAudio = document.getElementById('music-bot-audio');
  const resumeOnGesture = () => {
    if (musicAudio && isMusicPlaying && !isMusicPaused && musicAudio.paused) {
      musicAudio.play().catch(() => {});
    }
  };
  document.addEventListener('click', resumeOnGesture, { once: true });
  document.addEventListener('keydown', resumeOnGesture, { once: true });
}

export function playMusicTrack(track, position = 0, isPaused = false) {
  const musicAudio = document.getElementById('music-bot-audio');
  const musicPlayerWidget = document.getElementById('music-player-widget');
  const musicWidgetThumb = document.getElementById('music-widget-thumb');
  const musicWidgetTitle = document.getElementById('music-widget-title');
  const musicWidgetArtist = document.getElementById('music-widget-artist');
  const musicTimeTotal = document.getElementById('music-time-total');

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
    if (musicAudio) {
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
  }

  if (musicProgressTimer) clearInterval(musicProgressTimer);
  musicProgressTimer = setInterval(updateMusicProgress, 500);
}

export function pauseMusicTrack() {
  const musicAudio = document.getElementById('music-bot-audio');
  isMusicPaused = true;
  if (musicAudio) musicAudio.pause();
  updatePlayPauseButtonIcon(true);
}

export function resumeMusicTrack() {
  const musicAudio = document.getElementById('music-bot-audio');
  isMusicPaused = false;
  applyMusicBotVolume();
  if (musicAudio) musicAudio.play().catch(e => console.log(e));
  updatePlayPauseButtonIcon(false);
}

export function stopMusicTrack() {
  const musicAudio = document.getElementById('music-bot-audio');
  const musicPlayerWidget = document.getElementById('music-player-widget');
  const musicProgressBarFill = document.getElementById('music-progress-bar-fill');
  const musicTimeCurrent = document.getElementById('music-time-current');

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

// YouTube Watch Party
export function ensureYouTubeApi() {
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

export function stopWatchPartyVideo() {
  const watchPartyTile = document.getElementById('watch-party-tile');
  const watchPartyTitleBadge = document.getElementById('watch-party-title-badge');

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

export async function loadOrUpdateWatchPartyPlayer(videoId, startSeconds = 0, isPaused = false) {
  const watchPartyTile = document.getElementById('watch-party-tile');

  if (!videoId) {
    stopWatchPartyVideo();
    return;
  }

  await ensureYouTubeApi();

  if (watchPartyTile) {
    watchPartyTile.style.display = 'flex';
  }

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
          if (isRemoteAction || !activeSocket) return;

          // YT.PlayerState.PLAYING = 1
          if (event.data === 1) {
            const time = Math.floor(event.target.getCurrentTime ? event.target.getCurrentTime() : 0);
            activeSocket.emit('watchparty:resume', { currentTime: time });
          }
          // YT.PlayerState.PAUSED = 2
          else if (event.data === 2) {
            const time = Math.floor(event.target.getCurrentTime ? event.target.getCurrentTime() : 0);
            activeSocket.emit('watchparty:pause', { currentTime: time });
          }
          // YT.PlayerState.ENDED = 0
          else if (event.data === 0) {
            activeSocket.emit('watchparty:skip');
          }
        }
      }
    });
  } catch (err) {
    console.error('[WatchParty ❌] Erro ao instanciar YT.Player:', err);
  }
}

export function openWatchPartyModal() {
  const inVoice = getInVoiceFn();
  if (!inVoice) {
    showToastFn('Você precisa estar conectado a um canal de voz para usar o Assistir Juntos!');
    return;
  }
  const modalWatchParty = document.getElementById('modal-watch-party');
  const inputWatchPartyQuery = document.getElementById('input-watch-party-query');
  if (modalWatchParty) {
    modalWatchParty.style.display = 'flex';
    if (inputWatchPartyQuery) {
      inputWatchPartyQuery.focus();
    }
  }
}

export function closeWatchPartyModal() {
  const modalWatchParty = document.getElementById('modal-watch-party');
  const inputWatchPartyQuery = document.getElementById('input-watch-party-query');
  if (modalWatchParty) {
    modalWatchParty.style.display = 'none';
  }
  if (inputWatchPartyQuery) inputWatchPartyQuery.value = '';
}

function renderWatchPartyResults(results) {
  const watchPartyResultsList = document.getElementById('watch-party-results-list');
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
      if (activeSocket) activeSocket.emit('watchparty:start', { query: video.videoId });
      closeWatchPartyModal();
    });

    watchPartyResultsList.appendChild(item);
  });

  if (window.lucide) window.lucide.createIcons();
}

export function initWatchParty({ socket, getUserConfig, isDeafened, getInVoice, showSoundToast }) {
  activeSocket = socket;
  if (typeof getUserConfig === 'function') getUserConfigFn = getUserConfig;
  if (typeof isDeafened === 'function') isDeafenedFn = isDeafened;
  if (typeof getInVoice === 'function') getInVoiceFn = getInVoice;
  if (typeof showSoundToast === 'function') showToastFn = showSoundToast;

  const musicBtnPlayPause = document.getElementById('music-btn-play-pause');
  const musicBtnSkip = document.getElementById('music-btn-skip');
  const musicBtnStop = document.getElementById('music-btn-stop');
  const musicProgressBarWrap = document.getElementById('music-progress-bar-wrap');
  const musicQuickSearchForm = document.getElementById('music-quick-search-form');
  const musicQuickInput = document.getElementById('music-quick-input');
  const musicPlayerWidget = document.getElementById('music-player-widget');
  const musicWidgetTitle = document.getElementById('music-widget-title');
  const musicWidgetArtist = document.getElementById('music-widget-artist');
  const musicAudio = document.getElementById('music-bot-audio');

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
  const btnStageWatchParty = document.getElementById('btn-stage-watch-party');
  const btnStageMusicBot = document.getElementById('btn-stage-music-bot');
  const modalWatchParty = document.getElementById('modal-watch-party');
  const btnCloseWatchPartyModal = document.getElementById('btn-close-watch-party-modal');
  const btnCancelWatchPartyModal = document.getElementById('btn-cancel-watch-party-modal');
  const watchPartySearchForm = document.getElementById('watch-party-search-form');
  const inputWatchPartyQuery = document.getElementById('input-watch-party-query');
  const watchPartyLoading = document.getElementById('watch-party-loading');
  const watchPartyResultsList = document.getElementById('watch-party-results-list');

  // Alfredo UI listeners
  if (musicBtnPlayPause) {
    musicBtnPlayPause.addEventListener('click', () => {
      if (isMusicPaused) {
        activeSocket.emit('music:action', { action: 'resume' });
      } else {
        activeSocket.emit('music:action', { action: 'pause' });
      }
    });
  }

  if (musicBtnSkip) {
    musicBtnSkip.addEventListener('click', () => {
      activeSocket.emit('music:action', { action: 'skip' });
    });
  }

  if (musicBtnStop) {
    musicBtnStop.addEventListener('click', () => {
      activeSocket.emit('music:action', { action: 'stop' });
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

      if (!getInVoiceFn()) {
        showToastFn('Você precisa estar em um canal de voz para tocar música!');
        return;
      }

      activeSocket.emit('music:action', { action: 'play', query });
      if (musicQuickInput) musicQuickInput.value = '';
    });
  }

  // Watch Party UI listeners
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
      activeSocket.emit('watchparty:stop');
      stopWatchPartyVideo();
    });
  }

  if (btnWatchPartySkip) {
    btnWatchPartySkip.addEventListener('click', () => {
      activeSocket.emit('watchparty:skip');
    });
  }

  if (btnWatchPartyAdd) {
    btnWatchPartyAdd.addEventListener('click', () => {
      openWatchPartyModal();
    });
  }

  if (btnStageWatchParty) {
    btnStageWatchParty.addEventListener('click', () => {
      openWatchPartyModal();
    });
  }

  if (btnStageMusicBot) {
    btnStageMusicBot.addEventListener('click', () => {
      if (!musicPlayerWidget) return;
      const isHidden = (musicPlayerWidget.style.display === 'none' || !musicPlayerWidget.style.display);
      if (isHidden) {
        musicPlayerWidget.style.display = 'flex';
        if (!currentMusicTrack) {
          if (musicWidgetTitle) musicWidgetTitle.textContent = 'Alfredo pronto para tocar';
          if (musicWidgetArtist) musicWidgetArtist.textContent = 'Digite uma música ou link à direita 👉';
        }
        if (musicQuickInput) {
          musicQuickInput.focus();
        }
      } else {
        if (!isMusicPlaying) {
          musicPlayerWidget.style.display = 'none';
        } else {
          if (musicQuickInput) musicQuickInput.focus();
        }
      }
    });
  }

  if (btnCloseWatchPartyModal) btnCloseWatchPartyModal.addEventListener('click', closeWatchPartyModal);
  if (btnCancelWatchPartyModal) btnCancelWatchPartyModal.addEventListener('click', closeWatchPartyModal);
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

      const isDirectLink = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/.test(query) || /^[a-zA-Z0-9_-]{11}$/.test(query);
      if (isDirectLink) {
        activeSocket.emit('watchparty:start', { query });
        closeWatchPartyModal();
        return;
      }

      if (watchPartyLoading) watchPartyLoading.style.display = 'block';
      if (watchPartyResultsList) watchPartyResultsList.innerHTML = '';

      activeSocket.emit('watchparty:search', { query }, (response) => {
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

  // Socket Listeners - Alfredo
  activeSocket.on('music:play', ({ track, position, isPaused }) => {
    playMusicTrack(track, position, isPaused);
  });

  activeSocket.on('music:pause', () => {
    pauseMusicTrack();
  });

  activeSocket.on('music:resume', () => {
    resumeMusicTrack();
  });

  activeSocket.on('music:stop', () => {
    stopMusicTrack();
  });

  activeSocket.on('music:queue-update', ({ currentTrack, queue, isPlaying, isPaused }) => {
    if (currentTrack && isPlaying) {
      if (!isMusicPlaying || (currentMusicTrack && currentMusicTrack.id !== currentTrack.id)) {
        playMusicTrack(currentTrack, 0, isPaused);
      }
    } else if (!isPlaying) {
      stopMusicTrack();
    }
  });

  // Socket Listeners - Watch Party
  activeSocket.on('watchparty:init', (state) => {
    if (!getInVoiceFn()) return;
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

  activeSocket.on('watchparty:pause', ({ currentTime }) => {
    if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
      isRemoteAction = true;
      if (currentTime !== undefined) {
        try { ytPlayer.seekTo(currentTime, true); } catch (e) {}
      }
      try { ytPlayer.pauseVideo(); } catch (e) {}
      setTimeout(() => { isRemoteAction = false; }, 800);
    }
  });

  activeSocket.on('watchparty:resume', ({ currentTime }) => {
    if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
      isRemoteAction = true;
      if (currentTime !== undefined) {
        try { ytPlayer.seekTo(currentTime, true); } catch (e) {}
      }
      try { ytPlayer.playVideo(); } catch (e) {}
      setTimeout(() => { isRemoteAction = false; }, 800);
    }
  });

  activeSocket.on('watchparty:seek', ({ currentTime }) => {
    if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
      isRemoteAction = true;
      try { ytPlayer.seekTo(currentTime, true); } catch (e) {}
      setTimeout(() => { isRemoteAction = false; }, 800);
    }
  });

  activeSocket.on('watchparty:stop', () => {
    stopWatchPartyVideo();
  });
}
