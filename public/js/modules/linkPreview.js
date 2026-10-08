// ==========================================================================
// FAKEDC - OPEN GRAPH & DISCORD LINK EMBED PREVIEW
// ==========================================================================

import { escapeHtml } from './utils.js';
import { openImageLightbox } from './lightbox.js';

export const linkPreviewCache = new Map();

export function extractFirstPreviewUrl(text) {
  if (!text) return null;

  // 1. Markdown link explícito: [Título](URL)
  const mdMatch = text.match(/\[[^\]]+\]\(((?:https?:\/\/|www\.)[^\s)]+)\)/i);
  if (mdMatch) {
    let url = mdMatch[1];
    if (url.startsWith('www.')) url = 'https://' + url;
    if (!/\.(png|jpe?g|gif|webp|svg|mp3|wav|ogg|m4a)$/i.test(url)) {
      return url;
    }
  }

  // 2. URLs normais: https://, http://, www.
  const rawMatch = text.match(/(https?:\/\/[^\s<]+|www\.[^\s<]+)/i);
  if (rawMatch) {
    let url = rawMatch[1];
    while (url.length > 0 && /[.,;:!?)}\]*_]$/.test(url)) {
      url = url.slice(0, -1);
    }
    if (url.startsWith('www.')) url = 'https://' + url;
    if (!/\.(png|jpe?g|gif|webp|svg|mp3|wav|ogg|m4a)$/i.test(url)) {
      return url;
    }
  }

  return null;
}

export async function loadLinkPreview(slotEl, url) {
  if (!slotEl || !url) return;

  if (linkPreviewCache.has(url)) {
    const cached = linkPreviewCache.get(url);
    if (cached && cached.success) {
      renderEmbedCard(slotEl, cached);
    }
    return;
  }

  try {
    const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
    if (!res.ok) {
      linkPreviewCache.set(url, { success: false });
      return;
    }
    const data = await res.json();
    linkPreviewCache.set(url, data);
    if (data && data.success) {
      renderEmbedCard(slotEl, data);
    }
  } catch (err) {
    linkPreviewCache.set(url, { success: false });
  }
}

export function renderEmbedCard(slotEl, data) {
  if (!slotEl || !data || !data.success) return;

  const card = document.createElement('div');
  card.className = 'discord-embed-card';
  card.style.setProperty('--embed-border-color', data.themeColor || '#5865f2');

  const providerHtml = data.siteName
    ? `<a href="${escapeHtml(data.url)}" target="_blank" rel="noopener noreferrer" class="discord-embed-provider">${escapeHtml(data.siteName)}</a>`
    : '';

  const authorHtml = (data.author && data.author !== data.siteName)
    ? `<a href="${escapeHtml(data.authorUrl || data.url)}" target="_blank" rel="noopener noreferrer" class="discord-embed-author">${escapeHtml(data.author)}</a>`
    : '';

  const titleHtml = data.title
    ? `<a href="${escapeHtml(data.url)}" target="_blank" rel="noopener noreferrer" class="discord-embed-title">${escapeHtml(data.title)}</a>`
    : '';

  const descHtml = data.description
    ? `<div class="discord-embed-description">${escapeHtml(data.description)}</div>`
    : '';

  let thumbHtml = '';
  if (data.image) {
    const isVideo = data.mediaType === 'video';
    thumbHtml = `
      <div class="discord-embed-thumb-container" data-target-url="${escapeHtml(data.url)}" data-img-url="${escapeHtml(data.image)}" title="${isVideo ? 'Assistir no YouTube' : 'Abrir imagem'}">
        <img class="discord-embed-thumb" src="${escapeHtml(data.image)}" alt="${escapeHtml(data.title || 'Embed')}" loading="lazy" onerror="this.parentElement.style.display='none'">
        ${isVideo ? `
          <div class="discord-embed-play-badge">
            <svg viewBox="0 0 24 24"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>
          </div>
        ` : ''}
      </div>
    `;
  }

  card.innerHTML = `
    ${providerHtml}
    ${authorHtml}
    ${titleHtml}
    ${descHtml}
    ${thumbHtml}
  `;

  // Clique na thumbnail (Vídeo inline ou Lightbox de imagem)
  const thumbContainer = card.querySelector('.discord-embed-thumb-container');
  if (thumbContainer) {
    thumbContainer.addEventListener('click', (e) => {
      e.stopPropagation();
      if (data.mediaType === 'video' && data.videoId) {
        startInlineVideoPlayer(thumbContainer, data);
      } else {
        openImageLightbox(data.image, data.title || 'Imagem');
      }
    });
  }

  slotEl.innerHTML = '';
  slotEl.appendChild(card);
}

export function startInlineVideoPlayer(thumbContainer, data) {
  if (!thumbContainer || !data.videoId) return;

  const playerWrapper = document.createElement('div');
  playerWrapper.className = 'discord-embed-video-wrapper';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'discord-embed-close-video';
  closeBtn.title = 'Fechar player de vídeo';
  closeBtn.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    <span>Fechar</span>
  `;

  const iframe = document.createElement('iframe');
  iframe.className = 'discord-embed-video-iframe';
  iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(data.videoId)}?autoplay=1&rel=0&modestbranding=1`;
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.allowFullscreen = true;
  iframe.title = data.title || 'YouTube Video Player';

  playerWrapper.appendChild(closeBtn);
  playerWrapper.appendChild(iframe);

  thumbContainer.style.display = 'none';
  thumbContainer.parentNode.insertBefore(playerWrapper, thumbContainer.nextSibling);

  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    playerWrapper.remove();
    thumbContainer.style.display = 'block';
  });
}
