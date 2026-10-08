import express from 'express';
import { URL } from 'url';

const router = express.Router();

// Cache em memória com TTL de 24 horas
const previewCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_SIZE = 2000;

function cleanCacheIfNeeded() {
  if (previewCache.size > MAX_CACHE_SIZE) {
    const now = Date.now();
    for (const [key, item] of previewCache.entries()) {
      if (now - item.timestamp > CACHE_TTL_MS) {
        previewCache.delete(key);
      }
    }
    // Se ainda estiver muito grande, apaga os 500 mais antigos
    if (previewCache.size > MAX_CACHE_SIZE) {
      let count = 0;
      for (const key of previewCache.keys()) {
        previewCache.delete(key);
        count++;
        if (count >= 500) break;
      }
    }
  }
}

// Sanitização e decodificação de entidades HTML
function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, dec) => {
      try { return String.fromCharCode(dec); } catch (e) { return ''; }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try { return String.fromCharCode(parseInt(hex, 16)); } catch (e) { return ''; }
    })
    .replace(/<[^>]*>/g, '') // Remove quaisquer tags HTML residuais
    .replace(/\s+/g, ' ')    // Normaliza múltiplos espaços
    .trim();
}

// Helper para extrair meta tags de HTML bruto
function extractMetaTag(html, propertyOrName) {
  const p = propertyOrName.replace(':', '\\:');
  const reg1 = new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]+content=["']([^"']*)["']`, 'i');
  const reg2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${p}["']`, 'i');
  
  const m1 = html.match(reg1);
  if (m1 && m1[1]) return decodeHtmlEntities(m1[1]);
  
  const m2 = html.match(reg2);
  if (m2 && m2[1]) return decodeHtmlEntities(m2[1]);
  
  return null;
}

// Helper para extrair ID de vídeos do YouTube
function extractYoutubeVideoId(urlStr) {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    if (host.includes('youtube.com')) {
      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v');
      }
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'v') {
        return parts[1] || null;
      }
    } else if (host === 'youtu.be') {
      const parts = parsed.pathname.split('/').filter(Boolean);
      return parts[0] || null;
    }
  } catch (e) {
    return null;
  }
  return null;
}

// Validação Anti-SSRF para segurança
function isRestrictedHost(hostname) {
  const lower = (hostname || '').toLowerCase();
  if (!lower) return true;
  if (lower === 'localhost' || lower === '127.0.0.1' || lower === '0.0.0.0' || lower === '::1') return true;
  if (lower.endsWith('.local') || lower.endsWith('.internal')) return true;
  if (lower.startsWith('10.') || lower.startsWith('192.168.') || lower.startsWith('169.254.')) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(lower)) return true;
  return false;
}

router.get('/link-preview', async (req, res) => {
  const rawUrl = (req.query.url || '').trim();
  if (!rawUrl) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ success: false, error: 'Invalid protocol' });
    }
    if (isRestrictedHost(parsedUrl.hostname)) {
      return res.status(403).json({ success: false, error: 'Restricted host' });
    }
  } catch (e) {
    return res.status(400).json({ success: false, error: 'Malformed URL' });
  }

  const normalizedUrl = parsedUrl.href;

  // Verifica cache
  const cached = previewCache.get(normalizedUrl);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return res.json(cached.data);
  }

  try {
    // 1. Tratamento dedicado para YouTube
    const ytVideoId = extractYoutubeVideoId(normalizedUrl);
    if (ytVideoId) {
      let ytTitle = 'Vídeo do YouTube';
      let ytAuthor = 'YouTube';
      let ytThumb = `https://i.ytimg.com/vi/${ytVideoId}/hqdefault.jpg`;

      try {
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytVideoId}&format=json`, {
          signal: AbortSignal.timeout(4000)
        });
        if (oembedRes.ok) {
          const odata = await oembedRes.json();
          if (odata.title) ytTitle = decodeHtmlEntities(odata.title);
          if (odata.author_name) ytAuthor = decodeHtmlEntities(odata.author_name);
          if (odata.thumbnail_url) ytThumb = odata.thumbnail_url;
        }
      } catch (e) {
        // Usa fallback
      }

      const previewData = {
        success: true,
        url: `https://www.youtube.com/watch?v=${ytVideoId}`,
        siteName: 'YouTube',
        themeColor: '#ff0000',
        title: ytTitle,
        author: ytAuthor,
        description: ytAuthor ? `Canal: ${ytAuthor}` : '',
        image: ytThumb,
        mediaType: 'video',
        videoId: ytVideoId
      };

      cleanCacheIfNeeded();
      previewCache.set(normalizedUrl, { timestamp: Date.now(), data: previewData });
      return res.json(previewData);
    }

    // 2. Páginas e sites genéricos via Open Graph
    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 FakeDC-PreviewBot/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      signal: AbortSignal.timeout(4500),
      redirect: 'follow'
    });

    if (!response.ok) {
      return res.json({ success: false, error: `HTTP ${response.status}` });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return res.json({ success: false, error: 'Not an HTML page' });
    }

    // Lê os primeiros 150 KB para capturar o <head>
    let html = '';
    if (response.body && response.body.getReader) {
      const reader = response.body.getReader();
      let bytesCount = 0;
      const MAX_BYTES = 160 * 1024;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          html += Buffer.from(value).toString('utf8');
          bytesCount += value.length;
          if (bytesCount >= MAX_BYTES || html.includes('</head>') || html.includes('</HEAD>')) {
            reader.cancel();
            break;
          }
        }
      } catch (err) {
        // Buffer parcial é suficiente
      }
    } else {
      html = await response.text();
    }

    // Extração de tags
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const rawTitle = extractMetaTag(html, 'og:title') || extractMetaTag(html, 'twitter:title') || (titleMatch ? decodeHtmlEntities(titleMatch[1]) : '');
    const rawDescription = extractMetaTag(html, 'og:description') || extractMetaTag(html, 'twitter:description') || extractMetaTag(html, 'description') || '';
    let rawImage = extractMetaTag(html, 'og:image') || extractMetaTag(html, 'twitter:image') || extractMetaTag(html, 'og:image:url') || '';
    const rawSiteName = extractMetaTag(html, 'og:site_name') || parsedUrl.hostname.replace(/^www\./, '');
    const rawThemeColor = extractMetaTag(html, 'theme-color') || '#5865F2';

    // Resolver URL relativa da imagem
    if (rawImage) {
      try {
        rawImage = new URL(rawImage, normalizedUrl).href;
      } catch (e) {
        rawImage = '';
      }
    }

    const title = (rawTitle || '').slice(0, 150);
    const description = (rawDescription || '').slice(0, 320);

    if (!title && !description && !rawImage) {
      return res.json({ success: false, error: 'No OpenGraph metadata found' });
    }

    const previewData = {
      success: true,
      url: normalizedUrl,
      siteName: rawSiteName,
      themeColor: rawThemeColor.startsWith('#') ? rawThemeColor : '#5865F2',
      title: title || rawSiteName,
      description: description,
      image: rawImage || null,
      mediaType: 'website'
    };

    cleanCacheIfNeeded();
    previewCache.set(normalizedUrl, { timestamp: Date.now(), data: previewData });
    return res.json(previewData);

  } catch (err) {
    return res.json({ success: false, error: err.message || 'Fetch error' });
  }
});

export { router as linkPreviewRouter };
