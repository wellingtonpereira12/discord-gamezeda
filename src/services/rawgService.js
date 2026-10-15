import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../data');
const CACHE_FILE = path.join(DATA_DIR, 'game_cache.json');
const RAWG_API_KEY = process.env.RAWG_API_KEY || 'e2406b1ec2b5400985e2c51e9a66b7d5';

// Catálogo pré-carregado dos jogos mais populares para resposta instantânea (0ms)
// e imunidade total a falhas ou rate-limits (502) da API externa RAWG
const POPULAR_GAMES_METADATA = {
  'counterstrike2': {
    officialName: 'Counter-Strike 2',
    coverUrl: 'https://media.rawg.io/media/games/ec4/ec4b02bdb3eb5c6212992c19bc05697e.jpg',
    genres: ['Shooter', 'Action'],
    steamUrl: 'https://store.steampowered.com/app/730/CounterStrike_2/'
  },
  'cs2': {
    officialName: 'Counter-Strike 2',
    coverUrl: 'https://media.rawg.io/media/games/ec4/ec4b02bdb3eb5c6212992c19bc05697e.jpg',
    genres: ['Shooter', 'Action'],
    steamUrl: 'https://store.steampowered.com/app/730/CounterStrike_2/'
  },
  'csgo': {
    officialName: 'Counter-Strike: Global Offensive',
    coverUrl: 'https://media.rawg.io/media/games/736/73619a8e34a40d6947d9e120a57ed4e5.jpg',
    genres: ['Shooter', 'Action'],
    steamUrl: 'https://store.steampowered.com/app/730/CounterStrike_Global_Offensive/'
  },
  'valorant': {
    officialName: 'Valorant',
    coverUrl: 'https://media.rawg.io/media/games/068/068b5a03e105e45a27230b05b45c2f35.jpg',
    genres: ['Shooter', 'Action'],
    steamUrl: 'https://playvalorant.com/'
  },
  'leagueoflegends': {
    officialName: 'League of Legends',
    coverUrl: 'https://media.rawg.io/media/games/78b/78bc81e247fc7e14570397576f7c5417.jpg',
    genres: ['MOBA', 'Strategy'],
    steamUrl: 'https://www.leagueoflegends.com/'
  },
  'lol': {
    officialName: 'League of Legends',
    coverUrl: 'https://media.rawg.io/media/games/78b/78bc81e247fc7e14570397576f7c5417.jpg',
    genres: ['MOBA', 'Strategy'],
    steamUrl: 'https://www.leagueoflegends.com/'
  },
  'grandtheftautov': {
    officialName: 'Grand Theft Auto V',
    coverUrl: 'https://media.rawg.io/media/games/456/456dea5e1c7e3cd070250866b7978c6a.jpg',
    genres: ['Action', 'Adventure'],
    steamUrl: 'https://store.steampowered.com/app/271590/Grand_Theft_Auto_V/'
  },
  'gta5': {
    officialName: 'Grand Theft Auto V',
    coverUrl: 'https://media.rawg.io/media/games/456/456dea5e1c7e3cd070250866b7978c6a.jpg',
    genres: ['Action', 'Adventure'],
    steamUrl: 'https://store.steampowered.com/app/271590/Grand_Theft_Auto_V/'
  },
  'fivem': {
    officialName: 'FiveM (GTA V)',
    coverUrl: 'https://media.rawg.io/media/games/456/456dea5e1c7e3cd070250866b7978c6a.jpg',
    genres: ['Action', 'Multiplayer'],
    steamUrl: 'https://fivem.net/'
  },
  'roblox': {
    officialName: 'Roblox',
    coverUrl: 'https://media.rawg.io/media/games/53f/53f65f1181f4f1345d16ccfa3f3445ef.jpg',
    genres: ['Adventure', 'Family'],
    steamUrl: 'https://www.roblox.com/'
  },
  'minecraft': {
    officialName: 'Minecraft',
    coverUrl: 'https://media.rawg.io/media/games/b4e/b4e4c73d5aa4ec66bbf7537d60f88a25.jpg',
    genres: ['Sandbox', 'Adventure'],
    steamUrl: 'https://www.minecraft.net/'
  },
  'fortnite': {
    officialName: 'Fortnite',
    coverUrl: 'https://media.rawg.io/media/games/d03/d0303d6393fad7aaab512a20a9a4b3d8.jpg',
    genres: ['Shooter', 'Battle Royale'],
    steamUrl: 'https://store.epicgames.com/p/fortnite'
  },
  'apexlegends': {
    officialName: 'Apex Legends',
    coverUrl: 'https://media.rawg.io/media/games/713/71326d908a0dbe4580fa734b69cf4f88.jpg',
    genres: ['Shooter', 'Battle Royale'],
    steamUrl: 'https://store.steampowered.com/app/1172470/Apex_Legends/'
  },
  'rocketleague': {
    officialName: 'Rocket League',
    coverUrl: 'https://media.rawg.io/media/games/8cc/8cce7c0e99dcc23d36dc323a04959ff1.jpg',
    genres: ['Sports', 'Racing'],
    steamUrl: 'https://store.epicgames.com/p/rocket-league'
  },
  'rainbowsixsiege': {
    officialName: "Tom Clancy's Rainbow Six Siege",
    coverUrl: 'https://media.rawg.io/media/games/1e5/1e5e33d9813932b1138871484296b2b6.jpg',
    genres: ['Shooter', 'Tactical'],
    steamUrl: 'https://store.steampowered.com/app/359550/Tom_Clancys_Rainbow_Six_Siege/'
  },
  'overwatch2': {
    officialName: 'Overwatch 2',
    coverUrl: 'https://media.rawg.io/media/games/c56/c562e92c2354cfa2285145b23d5d710d.jpg',
    genres: ['Shooter', 'Action'],
    steamUrl: 'https://store.steampowered.com/app/2357570/Overwatch_2/'
  },
  'deadlock': {
    officialName: 'Deadlock',
    coverUrl: 'https://media.rawg.io/media/screenshots/f46/f4658add0a9aae824f438ccfafa73eb7.jpg',
    genres: ['Shooter', 'MOBA'],
    steamUrl: 'https://store.steampowered.com/app/1422450/Deadlock/'
  },
  'marvelrivals': {
    officialName: 'Marvel Rivals',
    coverUrl: 'https://media.rawg.io/media/games/618/618c2031a8074fbede69c6f2974de61a.jpg',
    genres: ['Shooter', 'Action'],
    steamUrl: 'https://store.steampowered.com/app/2767030/Marvel_Rivals/'
  },
  'easportsfc25': {
    officialName: 'EA SPORTS FC 25',
    coverUrl: 'https://media.rawg.io/media/games/72c/72c4e6503c806ea9479b19e97c8d9dfb.jpg',
    genres: ['Sports'],
    steamUrl: 'https://store.steampowered.com/app/2669320/EA_SPORTS_FC_25/'
  },
  'fc25': {
    officialName: 'EA SPORTS FC 25',
    coverUrl: 'https://media.rawg.io/media/games/72c/72c4e6503c806ea9479b19e97c8d9dfb.jpg',
    genres: ['Sports'],
    steamUrl: 'https://store.steampowered.com/app/2669320/EA_SPORTS_FC_25/'
  },
  'easportsfc24': {
    officialName: 'EA SPORTS FC 24',
    coverUrl: 'https://media.rawg.io/media/games/53b/53b4b0e9b60d4e9b8970e7e1741cf58a.jpg',
    genres: ['Sports'],
    steamUrl: 'https://store.steampowered.com/app/2195250/EA_SPORTS_FC_24/'
  },
  'fc24': {
    officialName: 'EA SPORTS FC 24',
    coverUrl: 'https://media.rawg.io/media/games/53b/53b4b0e9b60d4e9b8970e7e1741cf58a.jpg',
    genres: ['Sports'],
    steamUrl: 'https://store.steampowered.com/app/2195250/EA_SPORTS_FC_24/'
  },
  'valheim': {
    officialName: 'Valheim',
    coverUrl: 'https://media.rawg.io/media/games/b5a/b5a230f904b6b45f44383a8b4172f3d6.jpg',
    genres: ['Survival', 'Indie'],
    steamUrl: 'https://store.steampowered.com/app/892970/Valheim/'
  },
  'rust': {
    officialName: 'Rust',
    coverUrl: 'https://media.rawg.io/media/games/997/997ab74c9de1500f0877570b94c478a5.jpg',
    genres: ['Survival', 'Action'],
    steamUrl: 'https://store.steampowered.com/app/252490/Rust/'
  },
  'seaofthieves': {
    officialName: 'Sea of Thieves',
    coverUrl: 'https://media.rawg.io/media/games/f8c/f8c6a0164101e4c731e0dd4b87232230.jpg',
    genres: ['Adventure', 'Action'],
    steamUrl: 'https://store.steampowered.com/app/1172620/Sea_of_Thieves/'
  },
  'left4dead2': {
    officialName: 'Left 4 Dead 2',
    coverUrl: 'https://media.rawg.io/media/games/d58/d588947d4286e7b5e0e12e1bea7d9844.jpg',
    genres: ['Shooter', 'Action'],
    steamUrl: 'https://store.steampowered.com/app/550/Left_4_Dead_2/'
  },
  'terraria': {
    officialName: 'Terraria',
    coverUrl: 'https://media.rawg.io/media/games/f46/f46e0a8739d4b406b952e98fa4ed1888.jpg',
    genres: ['Platformer', 'Indie'],
    steamUrl: 'https://store.steampowered.com/app/105600/Terraria/'
  },
  'stardewvalley': {
    officialName: 'Stardew Valley',
    coverUrl: 'https://media.rawg.io/media/games/713/713422778a31b69d63cba5270529e3a6.jpg',
    genres: ['RPG', 'Simulation'],
    steamUrl: 'https://store.steampowered.com/app/413150/Stardew_Valley/'
  },
  'projectzomboid': {
    officialName: 'Project Zomboid',
    coverUrl: 'https://media.rawg.io/media/games/b8c/b8c243ffe0fb819725464341534e95ac.jpg',
    genres: ['RPG', 'Survival'],
    steamUrl: 'https://store.steampowered.com/app/108600/Project_Zomboid/'
  },
  'lethalcompany': {
    officialName: 'Lethal Company',
    coverUrl: 'https://media.rawg.io/media/games/33d/33d67f1b1b369ec2e48cd11440a34079.jpg',
    genres: ['Indie', 'Horror'],
    steamUrl: 'https://store.steampowered.com/app/1966720/Lethal_Company/'
  },
  'phasmophobia': {
    officialName: 'Phasmophobia',
    coverUrl: 'https://media.rawg.io/media/games/25c/25c566538d5bc3fe61aa48a84794f02f.jpg',
    genres: ['Horror', 'Indie'],
    steamUrl: 'https://store.steampowered.com/app/739630/Phasmophobia/'
  },
  'eldenring': {
    officialName: 'ELDEN RING',
    coverUrl: 'https://media.rawg.io/media/games/b29/b29624510065275e3c79c3620216b251.jpg',
    genres: ['RPG', 'Action'],
    steamUrl: 'https://store.steampowered.com/app/1245620/ELDEN_RING/'
  },
  'baldursgate3': {
    officialName: "Baldur's Gate 3",
    coverUrl: 'https://media.rawg.io/media/games/699/69907e1d9159688d9d40721839958794.jpg',
    genres: ['RPG', 'Strategy'],
    steamUrl: 'https://store.steampowered.com/app/1086940/Baldurs_Gate_3/'
  },
  'bg3': {
    officialName: "Baldur's Gate 3",
    coverUrl: 'https://media.rawg.io/media/games/699/69907e1d9159688d9d40721839958794.jpg',
    genres: ['RPG', 'Strategy'],
    steamUrl: 'https://store.steampowered.com/app/1086940/Baldurs_Gate_3/'
  },
  'cyberpunk2077': {
    officialName: 'Cyberpunk 2077',
    coverUrl: 'https://media.rawg.io/media/games/26d/26d44377d59b077516000d1e29cec6f0.jpg',
    genres: ['RPG', 'Action'],
    steamUrl: 'https://store.steampowered.com/app/1091500/Cyberpunk_2077/'
  },
  'palworld': {
    officialName: 'Palworld',
    coverUrl: 'https://media.rawg.io/media/games/6cd/6cd0d9bb205b367098418a0ebc9164d1.jpg',
    genres: ['Action', 'Adventure'],
    steamUrl: 'https://store.steampowered.com/app/1623730/Palworld/'
  },
  'helldivers2': {
    officialName: 'HELLDIVERS™ 2',
    coverUrl: 'https://media.rawg.io/media/games/275/2759da014230f21d30f496a735c0a373.jpg',
    genres: ['Shooter', 'Action'],
    steamUrl: 'https://store.steampowered.com/app/553850/HELLDIVERS_2/'
  },
  'callofdutywarzone': {
    officialName: 'Call of Duty: Warzone',
    coverUrl: 'https://media.rawg.io/media/games/198/198421b8f8709320e83cf65d914d79a7.jpg',
    genres: ['Shooter', 'Battle Royale'],
    steamUrl: 'https://store.steampowered.com/app/1938090/Call_of_Duty/'
  },
  'callofduty': {
    officialName: 'Call of Duty',
    coverUrl: 'https://media.rawg.io/media/games/198/198421b8f8709320e83cf65d914d79a7.jpg',
    genres: ['Shooter'],
    steamUrl: 'https://store.steampowered.com/app/1938090/Call_of_Duty/'
  },
  'fallguys': {
    officialName: 'Fall Guys',
    coverUrl: 'https://media.rawg.io/media/games/5eb/5eb49eb2fa0738fdb5bacea550ba1b0f.jpg',
    genres: ['Platformer', 'Party'],
    steamUrl: 'https://store.epicgames.com/p/fall-guys'
  },
  'amongus': {
    officialName: 'Among Us',
    coverUrl: 'https://media.rawg.io/media/games/e74/e74458058b35e01018d98d46114130f2.jpg',
    genres: ['Casual', 'Indie'],
    steamUrl: 'https://store.steampowered.com/app/945360/Among_Us/'
  },
  'genshinimpact': {
    officialName: 'Genshin Impact',
    coverUrl: 'https://media.rawg.io/media/games/7ac/7aca7dac69ea21727c62b534e7bb1108.jpg',
    genres: ['Action', 'RPG'],
    steamUrl: 'https://genshin.hoyoverse.com/'
  },
  'honkaistarrail': {
    officialName: 'Honkai: Star Rail',
    coverUrl: 'https://media.rawg.io/media/games/9c9/9c9339247f070cb1b6a1e3ff2a76f23b.jpg',
    genres: ['RPG', 'Strategy'],
    steamUrl: 'https://hsr.hoyoverse.com/'
  },
  'starrail': {
    officialName: 'Honkai: Star Rail',
    coverUrl: 'https://media.rawg.io/media/games/9c9/9c9339247f070cb1b6a1e3ff2a76f23b.jpg',
    genres: ['RPG', 'Strategy'],
    steamUrl: 'https://hsr.hoyoverse.com/'
  },
  'brawlhalla': {
    officialName: 'Brawlhalla',
    coverUrl: 'https://media.rawg.io/media/games/a58/a58e6587428807d99547cb0a693c4a2a.jpg',
    genres: ['Fighting', 'Action'],
    steamUrl: 'https://store.steampowered.com/app/291550/Brawlhalla/'
  },
  'dota2': {
    officialName: 'Dota 2',
    coverUrl: 'https://media.rawg.io/media/games/6fc/6fcf4cd3b175e1610d4211a7240e281b.jpg',
    genres: ['MOBA', 'Strategy'],
    steamUrl: 'https://store.steampowered.com/app/570/Dota_2/'
  },
  'tarkov': {
    officialName: 'Escape from Tarkov',
    coverUrl: 'https://media.rawg.io/media/games/960/960b601d9541cec776c5fa42a00bf6c4.jpg',
    genres: ['Shooter', 'Survival'],
    steamUrl: 'https://www.escapefromtarkov.com/'
  },
  'escapefromtarkov': {
    officialName: 'Escape from Tarkov',
    coverUrl: 'https://media.rawg.io/media/games/960/960b601d9541cec776c5fa42a00bf6c4.jpg',
    genres: ['Shooter', 'Survival'],
    steamUrl: 'https://www.escapefromtarkov.com/'
  }
};

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

  // Para termos curtos (menos de 6 letras), exige correspondência exata
  if (q.length < 6 || c.length < 6) return false;

  // Para títulos longos, permite pequena variação de sequência ou sufixo
  if (c.startsWith(q) && (c.length - q.length <= 4)) return true;
  if (q.startsWith(c) && (q.length - c.length <= 4)) return true;
  return false;
}

/**
 * Identifica se uma string de título é lixo/janela utilitária do sistema e não jogo
 */
export function isGarbageTitle(rawTitle) {
  if (!rawTitle || typeof rawTitle !== 'string') return true;
  const t = rawTitle.trim();
  if (t.length < 2 || t.length > 55) return true;
  const lower = t.toLowerCase();

  // Utilitários de IA / Background / Diálogos do Windows
  if (lower.includes('is using your computer') || lower.includes('esc to cancel')) return true;
  if (lower.startsWith('chatgpt') || lower.startsWith('copilot') || lower.startsWith('rxdiag')) return true;
  if (lower.startsWith('task host') || lower.startsWith('olemainthread') || lower.startsWith('dwm notification')) return true;
  if (lower.startsWith('windows push') || lower.startsWith('broadcastlistener') || lower.startsWith('rtc video')) return true;
  if (lower.startsWith('radeon') || lower.startsWith('geforce experience') || lower.startsWith('nvidia')) return true;

  // Janelas sem título ou comuns
  const exactGarbage = new Set([
    'n/a', 'sem título', 'sem titulo', 'untitled', 'settings', 'configurações', 'configuracoes',
    'pesquisar', 'iniciar', 'search', 'start', 'quick settings', 'cortana'
  ]);
  if (exactGarbage.has(lower)) return true;

  return false;
}

/**
 * Consulta metadados (cache popular local -> cache persistido -> API do RAWG)
 * @param {string} rawTitle - Nome do jogo detectado
 * @returns {Promise<Object|null>}
 */
export async function getGameMetadata(rawTitle) {
  if (!rawTitle || typeof rawTitle !== 'string') return null;

  const trimmed = rawTitle.trim();
  const cacheKey = normalizeTitle(trimmed);
  if (!cacheKey) return null;

  // 1. Checa catálogo popular pré-carregado (0ms, 100% confiável)
  if (POPULAR_GAMES_METADATA[cacheKey]) {
    const p = POPULAR_GAMES_METADATA[cacheKey];
    return {
      verified: true,
      rawgId: null,
      officialName: p.officialName,
      coverUrl: p.coverUrl,
      genres: p.genres,
      released: null,
      rating: null,
      steamUrl: p.steamUrl,
      cachedAt: Date.now()
    };
  }

  // 2. Checa cache persistido em memória
  if (memoryCache.has(cacheKey)) {
    const cached = memoryCache.get(cacheKey);
    if (cached && cached.verified) {
      return cached;
    }
  }

  // 3. Consulta à API RAWG para jogos novos / menos comuns (com timeout seguro de 4s)
  try {
    const searchUrl = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(trimmed)}&search_precise=true&page_size=5`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(searchUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'FakeDC-App/1.4.1' }
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[RAWG ⚠️] Resposta status (${res.status}) para jogo: ${trimmed}`);
      return null;
    }

    const json = await res.json();
    const results = json.results || [];
    if (results.length === 0) {
      return null;
    }

    // Procura o melhor match nos resultados
    let matchedGame = results.find(g => isTitleMatch(trimmed, g.name));
    if (!matchedGame && results[0] && isTitleMatch(trimmed, results[0].name)) {
      matchedGame = results[0];
    }

    if (!matchedGame) {
      return null;
    }

    // Jogo validado pelo RAWG!
    let steamUrl = null;
    const hasSteam = matchedGame.stores && matchedGame.stores.some(s => s.store && (s.store.id === 1 || s.store.slug === 'steam'));

    if (hasSteam) {
      steamUrl = `https://store.steampowered.com/search/?term=${encodeURIComponent(matchedGame.name)}`;
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
    console.log(`[RAWG ✅] Jogo validado na API RAWG: "${matchedGame.name}" (${metadata.genres.join(', ')})`);
    return metadata;
  } catch (err) {
    console.warn(`[RAWG ⚠️] Consulta externa indisponível para "${trimmed}":`, err.message);
    return null;
  }
}

/**
 * Enriquece o objeto de atividade com metadados e garante fallback resiliente
 * @param {Object} activity - Objeto de atividade { game, startedAt, ... }
 * @returns {Promise<Object|null>} Objeto enriquecido e garantido
 */
export async function enrichGameActivity(activity) {
  if (!activity || !activity.game) return null;

  const rawTitle = String(activity.game).trim();
  if (isGarbageTitle(rawTitle)) {
    console.log(`[RAWG 🚫] Processo descartado por ser utilitário/janela de sistema: "${rawTitle}"`);
    return null;
  }

  try {
    const meta = await getGameMetadata(rawTitle);
    if (meta && meta.verified) {
      return {
        game: meta.officialName || rawTitle,
        startedAt: Number(activity.startedAt) || Date.now(),
        verified: true,
        rawgId: meta.rawgId || null,
        coverUrl: meta.coverUrl || null,
        genres: meta.genres || [],
        steamUrl: meta.steamUrl || `https://store.steampowered.com/search/?term=${encodeURIComponent(meta.officialName || rawTitle)}`
      };
    }
  } catch (err) {
    console.warn(`[RAWG ⚠️] Erro ao enriquecer jogo "${rawTitle}":`, err.message);
  }

  // Fallback Resiliente: NUNCA apaga o jogo do usuário!
  // Se a RAWG estiver fora do ar (502/timeout) ou for jogo independente/mod (ex: FiveM),
  // exibe o jogo com o nome detectado e o ícone padrão de controle verde oficial.
  return {
    game: rawTitle,
    startedAt: Number(activity.startedAt) || Date.now(),
    verified: true,
    rawgId: null,
    coverUrl: null,
    genres: [],
    steamUrl: `https://store.steampowered.com/search/?term=${encodeURIComponent(rawTitle)}`
  };
}
