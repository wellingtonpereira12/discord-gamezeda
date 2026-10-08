// ==========================================================================
// FAKEDC - MODAL DE DOWNLOAD MOBILE (QR CODE ANDROID / iOS)
// ==========================================================================

import { showSoundToast } from './soundboard.js';

let currentMobilePlatform = 'android';

export function updateMobileModal(platform) {
  currentMobilePlatform = platform;
  const origin = window.location.origin;
  const isAndroid = platform === 'android';

  const tabPlatformAndroid = document.getElementById('tab-platform-android');
  const tabPlatformIos = document.getElementById('tab-platform-ios');
  const qrCodeCaption = document.getElementById('qr-code-caption');
  const qrCodeUrlPill = document.getElementById('qr-code-url-pill');
  const btnDirectDownloadMobile = document.getElementById('btn-direct-download-mobile');
  const btnDirectDownloadLabel = document.getElementById('btn-direct-download-label');
  const mobilePlatformTip = document.getElementById('mobile-platform-tip');
  const qrCodeImg = document.getElementById('qr-code-img');

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
      qrCodeImg.src = `https://quickchart.io/qr?size=220&text=${encodeURIComponent(fullUrl)}`;
    };
  }
}

export function openMobileModal() {
  const modalDownloadMobile = document.getElementById('modal-download-mobile');
  if (!modalDownloadMobile) return;
  modalDownloadMobile.style.display = 'flex';
  updateMobileModal('android');
  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    lucide.createIcons();
  }
}

export function closeMobileModal() {
  const modalDownloadMobile = document.getElementById('modal-download-mobile');
  if (!modalDownloadMobile) return;
  modalDownloadMobile.style.display = 'none';
}

export function initMobileModal() {
  const btnDownloadMobile = document.getElementById('btn-download-mobile');
  const btnCloseMobileModal = document.getElementById('btn-close-mobile-modal');
  const btnDismissMobileModal = document.getElementById('btn-dismiss-mobile-modal');
  const modalDownloadMobile = document.getElementById('modal-download-mobile');
  const tabPlatformAndroid = document.getElementById('tab-platform-android');
  const tabPlatformIos = document.getElementById('tab-platform-ios');
  const btnCopyMobileLink = document.getElementById('btn-copy-mobile-link');

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
}
