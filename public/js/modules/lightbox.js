// ==========================================================================
// FAKEDC - VISUALIZADOR DE IMAGENS EM TELA CHEIA (LIGHTBOX) & ÁREA DE TRANSFERÊNCIA
// ==========================================================================

let currentLightboxUrl = '';
let currentLightboxName = '';
let isLightboxZoomed = false;
let currentContextImageUrl = '';
let currentContextImageName = '';
let lightboxToastTimer = null;

export function showLightboxToast(message, duration = 2500) {
  const toast = document.getElementById('lightbox-toast');
  const toastMsg = document.getElementById('lightbox-toast-msg');
  if (!toast || !toastMsg) return;

  toastMsg.textContent = message;
  toast.style.display = 'flex';
  if (window.lucide) window.lucide.createIcons();

  if (lightboxToastTimer) clearTimeout(lightboxToastTimer);
  lightboxToastTimer = setTimeout(() => {
    toast.style.display = 'none';
  }, duration);
}

export async function copyImageToClipboard(imageUrl) {
  if (!imageUrl) return false;
  let fullUrl = imageUrl;
  try {
    fullUrl = new URL(imageUrl, window.location.href).href;
  } catch (e) {
    fullUrl = imageUrl;
  }

  // 1. Tentar via Electron Native API (se estiver rodando no app desktop)
  if (window.electronAPI && typeof window.electronAPI.copyImage === 'function') {
    try {
      const res = await window.electronAPI.copyImage({ url: fullUrl });
      if (res && res.success) {
        showLightboxToast('Imagem copiada para a área de transferência!');
        return true;
      }
    } catch (err) {
      console.warn('[Clipboard] Falha ao copiar via electronAPI:', err);
    }
  }

  // 2. Tentar via Web Clipboard API nativa (Blob PNG)
  try {
    const res = await fetch(fullUrl, { mode: 'cors' });
    const blob = await res.blob();

    if (blob.type === 'image/png' && typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      showLightboxToast('Imagem copiada para a área de transferência!');
      return true;
    }

    // Para JPG, WEBP, etc.: converter para PNG via Canvas
    const imgBitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = imgBitmap.width;
    canvas.height = imgBitmap.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgBitmap, 0, 0);

    const pngBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (pngBlob && typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': pngBlob })
      ]);
      showLightboxToast('Imagem copiada para a área de transferência!');
      return true;
    }
  } catch (err) {
    console.warn('[Clipboard] Falha ao converter imagem para clipboard nativo:', err);
  }

  // 3. Fallback: Copiar o link direto da imagem
  try {
    if (window.electronAPI && typeof window.electronAPI.copyText === 'function') {
      await window.electronAPI.copyText(fullUrl);
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(fullUrl);
    } else {
      const ta = document.createElement('textarea');
      ta.value = fullUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    showLightboxToast('Link da imagem copiado para a área de transferência!');
    return true;
  } catch (e) {
    console.error('[Clipboard] Falha total ao copiar:', e);
    showLightboxToast('Não foi possível copiar a imagem.');
    return false;
  }
}

export async function copyLinkToClipboard(linkUrl) {
  if (!linkUrl) return false;
  let fullUrl = linkUrl;
  try {
    fullUrl = new URL(linkUrl, window.location.href).href;
  } catch (e) {
    fullUrl = linkUrl;
  }

  try {
    if (window.electronAPI && typeof window.electronAPI.copyText === 'function') {
      await window.electronAPI.copyText(fullUrl);
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(fullUrl);
    } else {
      const ta = document.createElement('textarea');
      ta.value = fullUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    showLightboxToast('Link copiado para a área de transferência!');
    return true;
  } catch (e) {
    console.error('[Clipboard] Falha ao copiar link:', e);
    showLightboxToast('Erro ao copiar link.');
    return false;
  }
}

export function downloadImageFile(imageUrl, filename) {
  if (!imageUrl) return;
  const link = document.createElement('a');
  link.href = imageUrl;
  link.download = filename || imageUrl.split('/').pop().split('?')[0] || 'imagem.png';
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function openImageLightbox(imageUrl, imageName) {
  const modal = document.getElementById('modal-image-lightbox');
  const img = document.getElementById('lightbox-img');
  const nameEl = document.getElementById('lightbox-image-name');
  const linkEl = document.getElementById('lightbox-open-original');
  if (!modal || !img) return;

  currentLightboxUrl = imageUrl;
  currentLightboxName = imageName || imageUrl.split('/').pop().split('?')[0] || 'Imagem';

  img.src = imageUrl;
  img.alt = currentLightboxName;
  if (nameEl) nameEl.textContent = currentLightboxName;
  if (linkEl) {
    linkEl.href = imageUrl;
  }

  isLightboxZoomed = false;
  img.classList.remove('is-zoomed');
  updateLightboxZoomButton();

  modal.style.display = 'flex';
  if (window.lucide) window.lucide.createIcons();
}

export function closeImageLightbox() {
  const modal = document.getElementById('modal-image-lightbox');
  if (!modal || modal.style.display === 'none') return;

  if (document.fullscreenElement) {
    try { document.exitFullscreen(); } catch (e) {}
  }

  modal.style.display = 'none';
  const img = document.getElementById('lightbox-img');
  if (img) img.src = '';
  isLightboxZoomed = false;
}

export function toggleLightboxZoom() {
  const img = document.getElementById('lightbox-img');
  if (!img) return;

  isLightboxZoomed = !isLightboxZoomed;
  if (isLightboxZoomed) {
    img.classList.add('is-zoomed');
  } else {
    img.classList.remove('is-zoomed');
  }
  updateLightboxZoomButton();
}

export function updateLightboxZoomButton() {
  const zoomIcon = document.getElementById('lightbox-zoom-icon');
  const zoomText = document.getElementById('lightbox-zoom-text');
  if (!zoomIcon || !zoomText) return;

  if (isLightboxZoomed) {
    zoomIcon.setAttribute('data-lucide', 'zoom-out');
    zoomText.textContent = 'Ajustar';
  } else {
    zoomIcon.setAttribute('data-lucide', 'zoom-in');
    zoomText.textContent = 'Zoom';
  }
  if (window.lucide) window.lucide.createIcons();
}

export function toggleLightboxFullscreen() {
  const modal = document.getElementById('modal-image-lightbox');
  if (!modal) return;

  if (!document.fullscreenElement) {
    if (modal.requestFullscreen) {
      modal.requestFullscreen().catch(() => {});
    } else if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }
}

export function closeImageContextMenu() {
  const ctx = document.getElementById('image-context-menu');
  if (ctx) ctx.style.display = 'none';
}

export function openImageContextMenu(e, imageUrl, imageName) {
  const ctx = document.getElementById('image-context-menu');
  if (!ctx) return;

  currentContextImageUrl = imageUrl;
  currentContextImageName = imageName || 'imagem.png';

  let posX = e.clientX;
  let posY = e.clientY;

  const menuWidth = 200;
  const menuHeight = 160;

  if (posX + menuWidth > window.innerWidth) {
    posX = window.innerWidth - menuWidth - 10;
  }
  if (posY + menuHeight > window.innerHeight) {
    posY = window.innerHeight - menuHeight - 10;
  }

  ctx.style.left = `${Math.max(10, posX)}px`;
  ctx.style.top = `${Math.max(10, posY)}px`;
  ctx.style.display = 'block';

  if (window.lucide) window.lucide.createIcons();
}

export function initImageLightboxAndClipboard(messagesContainer = document.getElementById('messages-container')) {
  const modalLightbox = document.getElementById('modal-image-lightbox');
  const btnClose = document.getElementById('btn-lightbox-close');
  const contentArea = document.getElementById('lightbox-content-area');
  const lightboxImg = document.getElementById('lightbox-img');
  const btnZoom = document.getElementById('btn-lightbox-zoom');
  const btnFs = document.getElementById('btn-lightbox-fullscreen');
  const btnCopy = document.getElementById('btn-lightbox-copy');
  const btnCopyLink = document.getElementById('btn-lightbox-copy-link');
  const btnDownload = document.getElementById('btn-lightbox-download');

  const ctxMenu = document.getElementById('image-context-menu');
  const ctxOpenFs = document.getElementById('ctx-open-fullscreen');
  const ctxCopy = document.getElementById('ctx-copy-image');
  const ctxCopyLink = document.getElementById('ctx-copy-link');
  const ctxDownload = document.getElementById('ctx-download-image');

  if (btnClose) btnClose.addEventListener('click', closeImageLightbox);

  if (contentArea) {
    contentArea.addEventListener('click', (e) => {
      if (e.target === contentArea || e.target.id === 'lightbox-wrapper') {
        closeImageLightbox();
      }
    });
  }

  if (lightboxImg) {
    lightboxImg.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLightboxZoom();
    });
  }

  if (btnZoom) btnZoom.addEventListener('click', toggleLightboxZoom);
  if (btnFs) btnFs.addEventListener('click', toggleLightboxFullscreen);
  if (btnCopy) btnCopy.addEventListener('click', () => copyImageToClipboard(currentLightboxUrl));
  if (btnCopyLink) btnCopyLink.addEventListener('click', () => copyLinkToClipboard(currentLightboxUrl));
  if (btnDownload) btnDownload.addEventListener('click', () => downloadImageFile(currentLightboxUrl, currentLightboxName));

  document.addEventListener('fullscreenchange', () => {
    const fsIcon = document.getElementById('lightbox-fullscreen-icon');
    if (!fsIcon) return;
    if (document.fullscreenElement) {
      fsIcon.setAttribute('data-lucide', 'minimize');
    } else {
      fsIcon.setAttribute('data-lucide', 'maximize');
    }
    if (window.lucide) window.lucide.createIcons();
  });

  if (ctxOpenFs) {
    ctxOpenFs.addEventListener('click', () => {
      openImageLightbox(currentContextImageUrl, currentContextImageName);
      closeImageContextMenu();
    });
  }
  if (ctxCopy) {
    ctxCopy.addEventListener('click', () => {
      copyImageToClipboard(currentContextImageUrl);
      closeImageContextMenu();
    });
  }
  if (ctxCopyLink) {
    ctxCopyLink.addEventListener('click', () => {
      copyLinkToClipboard(currentContextImageUrl);
      closeImageContextMenu();
    });
  }
  if (ctxDownload) {
    ctxDownload.addEventListener('click', () => {
      downloadImageFile(currentContextImageUrl, currentContextImageName);
      closeImageContextMenu();
    });
  }

  document.addEventListener('click', (e) => {
    if (ctxMenu && ctxMenu.style.display !== 'none' && !ctxMenu.contains(e.target)) {
      closeImageContextMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (modalLightbox && modalLightbox.style.display === 'flex') {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        closeImageLightbox();
      } else if (e.key === 'f' || e.key === 'F') {
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault();
          toggleLightboxZoom();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault();
          copyImageToClipboard(currentLightboxUrl);
        }
      }
    } else if (ctxMenu && ctxMenu.style.display === 'block') {
      if (e.key === 'Escape' || e.key === 'Esc') {
        closeImageContextMenu();
      }
    }
  });

  if (messagesContainer) {
    messagesContainer.addEventListener('click', (e) => {
      const quickBtn = e.target.closest('.image-quick-btn');
      if (quickBtn) {
        e.stopPropagation();
        e.preventDefault();
        const container = quickBtn.closest('.message-image-container');
        const imgUrl = container ? container.getAttribute('data-img-url') : '';
        const imgName = container ? container.getAttribute('data-img-name') : '';

        if (quickBtn.classList.contains('quick-open-lightbox')) {
          openImageLightbox(imgUrl, imgName);
        } else if (quickBtn.classList.contains('quick-copy-image')) {
          copyImageToClipboard(imgUrl);
        } else if (quickBtn.classList.contains('quick-download-image')) {
          downloadImageFile(imgUrl, imgName);
        }
        return;
      }

      const imgEl = e.target.closest('.chat-clickable-image') || e.target.closest('.message-image-container') || (e.target.tagName === 'IMG' && e.target.closest('.message-attachment'));
      if (imgEl) {
        e.stopPropagation();
        e.preventDefault();
        const container = imgEl.classList.contains('message-image-container') ? imgEl : imgEl.closest('.message-image-container');
        const imgTag = container ? container.querySelector('img') : (imgEl.tagName === 'IMG' ? imgEl : null);
        const imgUrl = (container && container.getAttribute('data-img-url')) || (imgTag ? imgTag.src : '');
        const imgName = (container && container.getAttribute('data-img-name')) || (imgTag ? imgTag.alt : 'Imagem');
        if (imgUrl) {
          openImageLightbox(imgUrl, imgName);
        }
      }
    });

    messagesContainer.addEventListener('contextmenu', (e) => {
      const imgTarget = e.target.closest('.chat-clickable-image') || e.target.closest('.message-image-container') || (e.target.tagName === 'IMG' && e.target.closest('.message-attachment'));
      if (imgTarget) {
        e.preventDefault();
        e.stopPropagation();
        const container = imgTarget.classList.contains('message-image-container') ? imgTarget : imgTarget.closest('.message-image-container');
        const imgTag = container ? container.querySelector('img') : (imgTarget.tagName === 'IMG' ? imgTarget : null);
        const imgUrl = (container && container.getAttribute('data-img-url')) || (imgTag ? imgTag.src : '');
        const imgName = (container && container.getAttribute('data-img-name')) || (imgTag ? imgTag.alt : 'Imagem');
        if (imgUrl) {
          copyImageToClipboard(imgUrl);
          openImageContextMenu(e, imgUrl, imgName);
        }
      }
    });
  }
}
