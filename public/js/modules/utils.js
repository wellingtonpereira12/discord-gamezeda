// ==========================================================================
// FAKEDC - UTILITÁRIOS GERAIS
// ==========================================================================

export function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

export function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatMusicSecs(sec) {
  if (!sec || isNaN(sec) || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function isMobileView() {
  return window.innerWidth <= 768;
}

export function getOrCreateDeviceId() {
  let devId = localStorage.getItem('gamezeda_device_id');
  if (!devId) {
    devId = 'dev_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
    localStorage.setItem('gamezeda_device_id', devId);
  }
  return devId;
}

export function regenerateDeviceId() {
  const newDeviceId = 'dev_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
  localStorage.setItem('gamezeda_device_id', newDeviceId);
  return newDeviceId;
}

export function updateAppHeight() {
  const vh = window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${vh}px`);
}

export function applyMobileAppFixes() {
  const isRN = typeof window.ReactNativeWebView !== 'undefined';
  const isAndroidWV = /Android.*(wv|Version\/[0-9])/i.test(navigator.userAgent);
  const isKnownWV = /wv|WebView/i.test(navigator.userAgent);
  const isStandAlone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  if (isRN || isAndroidWV || isKnownWV || isStandAlone) {
    document.body.classList.add('is-mobile-app');
  }
}

export function formatGameDuration(startedAt) {
  if (!startedAt) return '';
  const diffMs = Math.max(0, Date.now() - Number(startedAt));
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);

  if (diffHours >= 1) {
    const remainingMin = diffMin % 60;
    if (remainingMin > 0) {
      return `há ${diffHours}h ${remainingMin}m`;
    }
    return `há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  }
  if (diffMin >= 1) {
    return `há ${diffMin} ${diffMin === 1 ? 'minuto' : 'minutos'}`;
  }
  return 'jogando agora';
}

