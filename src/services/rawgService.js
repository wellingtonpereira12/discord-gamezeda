import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../data');
const CACHE_FILE = path.join(DATA_DIR, 'game_cache.json');
const RAWG_API_KEY = process.env.RAWG_API_KEY || 'e2406b1ec2b5400985e2c51e9a66b7d5';

// Cache em memória para acesso com 0ms e economia estrita de requisições da cota RAWG
const memoryCache = new Map();

// Garante que o diretório data/ exista e carrega o cache persistido
function loadPersistedCache() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      for (const [key, val] of Object.entries(parsed)) {
        memoryCache.set(key, val);
      }
      console.log(`[RAWG 🎮] Cache carregado do disco com ${memoryCache.size} jogos catalogados.`);
    }
  } catch (err) {
    console.warn('[RAWG ⚠️] Não foi possível carregar cache persistido:', err.message);
  }
}

// Salva em disco de forma segura e debounced
let saveTimeout = null;
function persistCacheDebounced() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const obj = {};
      for (const [key, val] of memoryCache.entries()) {
        obj[key] = val;
      }
      fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), 'utf8');
    } catch (err) {
      console.warn('[RAWG ⚠️] Erro ao persistir cache de jogos:', err.message);
    }
  }, 3000);
}

loadPersistedCache();

function normalizeTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[™®©]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function isTitleMatch(query, candidate) {
  const q = normalizeTitle(query);
  const c = normalizeTitle(candidate);
  if (!q || !c) return false;
  if (q === c) return true;
  if (c.startsWith(q) && (c.length - q.length <= 6)) return true;
  if (q.startsWith(c) && (q.length - c.length <= 6)) return true;
  return false;
}

/**
 * Consulta a API do RAWG para validar o jogo, obter capa oficial e link da Steam
 * @param {string} rawTitle - Nome do jogo detectado
 * @returns {Promise<Object|null>}
 */
export async function getGameMetadata(rawTitle) {
  if (!rawTitle || typeof rawTitle !== 'string') return null;

  const trimmed = rawTitle.trim();
  const cacheKey = normalizeTitle(trimmed);
  if (!cacheKey) return null;

  // 1. Checa cache em memória
  if (memoryCache.has(cacheKey)) {
    const cached = memoryCache.get(cacheKey);
    // Se foi validado como falso, respeita tempo de expiração de 2 horas
    if (!cached.verified) {
      if (Date.now() - (cached.cachedAt || 0) < 2 * 60 * 60 * 1000) {
        return cached;
      }
    } else {
      return cached;
    }
  }

  // 2. Consulta à API RAWG
  try {
    const searchUrl = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(trimmed)}&search_precise=true&page_size=5`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(searchUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'FakeDC-App/1.4.1' }
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[RAWG ⚠️] Resposta não OK (${res.status}) para jogo: ${trimmed}`);
      return null;
    }

    const json = await res.json();
    const results = json.results || [];
    if (results.length === 0) {
      const negativeResult = {
        verified: false,
        name: trimmed,
        cachedAt: Date.now()
      };
      memoryCache.set(cacheKey, negativeResult);
      persistCacheDebounced();
      return negativeResult;
    }

    // Procura o melhor match nos resultados
    let matchedGame = results.find(g => isTitleMatch(trimmed, g.name));
    if (!matchedGame && results[0]) {
      // Se o primeiro resultado for bem similar
      if (isTitleMatch(trimmed, results[0].name)) {
        matchedGame = results[0];
      }
    }

    if (!matchedGame) {
      const negativeResult = {
        verified: false,
        name: trimmed,
        cachedAt: Date.now()
      };
      memoryCache.set(cacheKey, negativeResult);
      persistCacheDebounced();
      return negativeResult;
    }

    // Jogo validado! Extrai metadados oficiais
    let steamUrl = null;
    const hasSteam = matchedGame.stores && matchedGame.stores.some(s => s.store && (s.store.id === 1 || s.store.slug === 'steam'));

    // Tenta obter o link direto da loja Steam se disponível
    if (hasSteam) {
      try {
        const storeCtrl = new AbortController();
        const storeTimeout = setTimeout(() => storeCtrl.abort(), 4000);
        const storeRes = await fetch(`https://api.rawg.io/api/games/${matchedGame.id}/stores?key=${RAWG_API_KEY}`, {
          signal: storeCtrl.signal,
          headers: { 'User-Agent': 'FakeDC-App/1.4.1' }
        });
        clearTimeout(storeTimeout);
        if (storeRes.ok) {
          const storeJson = await storeRes.json();
          const steamEntry = (storeJson.results || []).find(r => r.store_id === 1);
          if (steamEntry && steamEntry.url) {
            steamUrl = steamEntry.url;
          }
        }
      } catch (err) {
        // Fallback para busca direta na Steam
      }
      if (!steamUrl) {
        steamUrl = `https://store.steampowered.com/search/?term=${encodeURIComponent(matchedGame.name)}`;
      }
    }

    const metadata = {
      verified: true,
      rawgId: matchedGame.id,
      officialName: matchedGame.name,
      coverUrl: matchedGame.background_image || null,
      genres: Array.isArray(matchedGame.genres) ? matchedGame.genres.map(g => g.name) : [],
      released: matchedGame.released || null,
      rating: matchedGame.rating || null,
      steamUrl: steamUrl || `https://store.steampowered.com/search/?term=${encodeURIComponent(matchedGame.name)}`,
      cachedAt: Date.now()
    };

    memoryCache.set(cacheKey, metadata);
    persistCacheDebounced();
    console.log(`[RAWG ✅] Jogo validado e cacheado: "${matchedGame.name}" (${metadata.genres.join(', ')})`);
    return metadata;
  } catch (err) {
    console.error(`[RAWG ❌] Erro ao consultar API para "${trimmed}":`, err.message);
    return null;
  }
}

/**
 * Enriquece o objeto de atividade com metadados do RAWG
 * @param {Object} activity - Objeto de atividade { game, startedAt, ... }
 * @returns {Promise<Object>} Objeto enriquecido
 */
export async function enrichGameActivity(activity) {
  if (!activity || !activity.game) return null;

  const meta = await getGameMetadata(activity.game);
  if (!meta || !meta.verified) {
    // Retorna a atividade original mesmo se não encontrada no RAWG para não quebrar a presença
    return {
      game: String(activity.game).slice(0, 80),
      startedAt: Number(activity.startedAt) || Date.now(),
      verified: false,
      coverUrl: null,
      genres: [],
      steamUrl: `https://store.steampowered.com/search/?term=${encodeURIComponent(activity.game)}`
    };
  }

  return {
    game: meta.officialName || activity.game,
    startedAt: Number(activity.startedAt) || Date.now(),
    verified: true,
    rawgId: meta.rawgId,
    coverUrl: meta.coverUrl,
    genres: meta.genres || [],
    steamUrl: meta.steamUrl
  };
}
