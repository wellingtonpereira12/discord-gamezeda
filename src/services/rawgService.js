import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../data');
const CACHE_FILE = path.join(DATA_DIR, 'game_cache.json');
const RAWG_API_KEY = process.env.RAWG_API_KEY || 'e2406b1ec2b5400985e2c51e9a66b7d5';

// Catálogo com URLs 100% permanentes e estáveis (CDN oficial da Steam e RAWG verificado)
// que nunca expiram e respondem com 0ms e status 200 OK
const POPULAR_GAMES_METADATA = {
  'counterstrike2': {
    officialName: 'Counter-Strike 2',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg',
    genres: ['Shooter', 'Action'],
    steamUrl: 'https://store.steampowered.com/app/730/CounterStrike_2/'
  },
  'cs2': {
    officialName: 'Counter-Strike 2',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg',
    genres: ['Shooter', 'Action'],
    steamUrl: 'https://store.steampowered.com/app/730/CounterStrike_2/'
  },
  'csgo': {
    officialName: 'Counter-Strike: Global Offensive',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg',
    genres: ['Shooter', 'Action'],
    steamUrl: 'https://store.steampowered.com/app/730/CounterStrike_2/'
  },
  'valheim': {
    officialName: 'Valheim',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/892970/header.jpg',
    genres: ['Survival', 'Indie'],
    steamUrl: 'https://store.steampowered.com/app/892970/Valheim/'
  },
  'grandtheftautov': {
    officialName: 'Grand Theft Auto V',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/271590/header.jpg',
    genres: ['Action', 'Adventure'],
    steamUrl: 'https://store.steampowered.com/app/271590/Grand_Theft_Auto_V/'
  },
  'gta5': {
    officialName: 'Grand Theft Auto V',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/271590/header.jpg',
    genres: ['Action', 'Adventure'],
    steamUrl: 'https://store.steampowered.com/app/271590/Grand_Theft_Auto_V/'
  },
  'fivem': {
    officialName: 'FiveM (GTA V)',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/271590/header.jpg',
    genres: ['Action', 'Multiplayer'],
    steamUrl: 'https://fivem.net/'
  },
  'deadlock': {
    officialName: 'Deadlock',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1422450/header.jpg',
    genres: ['Shooter', 'MOBA'],
    steamUrl: 'https://store.steampowered.com/app/1422450/Deadlock/'
  },
  'apexlegends': {
    officialName: 'Apex Legends',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1172470/header.jpg',
    genres: ['Shooter', 'Battle Royale'],
    steamUrl: 'https://store.steampowered.com/app/1172470/Apex_Legends/'
  },
  'rainbowsixsiege': {
    officialName: "Tom Clancy's Rainbow Six Siege",
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/359550/header.jpg',
    genres: ['Shooter', 'Tactical'],
    steamUrl: 'https://store.steampowered.com/app/359550/Tom_Clancys_Rainbow_Six_Siege/'
  },
  'rust': {
    officialName: 'Rust',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/252490/header.jpg',
    genres: ['Survival', 'Action'],
    steamUrl: 'https://store.steampowered.com/app/252490/Rust/'
  },
  'left4dead2': {
    officialName: 'Left 4 Dead 2',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/550/header.jpg',
    genres: ['Shooter', 'Action'],
    steamUrl: 'https://store.steampowered.com/app/550/Left_4_Dead_2/'
  },
  'terraria': {
    officialName: 'Terraria',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/105600/header.jpg',
    genres: ['Platformer', 'Indie'],
    steamUrl: 'https://store.steampowered.com/app/105600/Terraria/'
  },
  'stardewvalley': {
    officialName: 'Stardew Valley',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/413150/header.jpg',
    genres: ['RPG', 'Simulation'],
    steamUrl: 'https://store.steampowered.com/app/413150/Stardew_Valley/'
  },
  'palworld': {
    officialName: 'Palworld',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1623730/header.jpg',
    genres: ['Action', 'Adventure'],
    steamUrl: 'https://store.steampowered.com/app/1623730/Palworld/'
  },
  'baldursgate3': {
    officialName: "Baldur's Gate 3",
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/header.jpg',
    genres: ['RPG', 'Strategy'],
    steamUrl: 'https://store.steampowered.com/app/1086940/Baldurs_Gate_3/'
  },
  'bg3': {
    officialName: "Baldur's Gate 3",
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/header.jpg',
    genres: ['RPG', 'Strategy'],
    steamUrl: 'https://store.steampowered.com/app/1086940/Baldurs_Gate_3/'
  },
  'cyberpunk2077': {
    officialName: 'Cyberpunk 2077',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg',
    genres: ['RPG', 'Action'],
    steamUrl: 'https://store.steampowered.com/app/1091500/Cyberpunk_2077/'
  },
  'eldenring': {
    officialName: 'ELDEN RING',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg',
    genres: ['RPG', 'Action'],
    steamUrl: 'https://store.steampowered.com/app/1245620/ELDEN_RING/'
  },
  'projectzomboid': {
    officialName: 'Project Zomboid',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/108600/header.jpg',
    genres: ['RPG', 'Survival'],
    steamUrl: 'https://store.steampowered.com/app/108600/Project_Zomboid/'
  },
  'lethalcompany': {
    officialName: 'Lethal Company',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1966720/header.jpg',
    genres: ['Indie', 'Horror'],
    steamUrl: 'https://store.steampowered.com/app/1966720/Lethal_Company/'
  },
  'phasmophobia': {
    officialName: 'Phasmophobia',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/739630/header.jpg',
    genres: ['Horror', 'Indie'],
    steamUrl: 'https://store.steampowered.com/app/739630/Phasmophobia/'
  },
  'seaofthieves': {
    officialName: 'Sea of Thieves',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1172620/header.jpg',
    genres: ['Adventure', 'Action'],
    steamUrl: 'https://store.steampowered.com/app/1172620/Sea_of_Thieves/'
  },
  'helldivers2': {
    officialName: 'HELLDIVERS™ 2',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/553850/header.jpg',
    genres: ['Shooter', 'Action'],
    steamUrl: 'https://store.steampowered.com/app/553850/HELLDIVERS_2/'
  },
  'dota2': {
    officialName: 'Dota 2',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg',
    genres: ['MOBA', 'Strategy'],
    steamUrl: 'https://store.steampowered.com/app/570/Dota_2/'
  },
  'brawlhalla': {
    officialName: 'Brawlhalla',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/291550/header.jpg',
    genres: ['Fighting', 'Action'],
    steamUrl: 'https://store.steampowered.com/app/291550/Brawlhalla/'
  },
  'amongus': {
    officialName: 'Among Us',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/945360/header.jpg',
    genres: ['Casual', 'Indie'],
    steamUrl: 'https://store.steampowered.com/app/945360/Among_Us/'
  },
  'overwatch2': {
    officialName: 'Overwatch 2',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2357570/header.jpg',
    genres: ['Shooter', 'Action'],
    steamUrl: 'https://store.steampowered.com/app/2357570/Overwatch_2/'
  },
  'easportsfc25': {
    officialName: 'EA SPORTS FC 25',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2669320/header.jpg',
    genres: ['Sports'],
    steamUrl: 'https://store.steampowered.com/app/2669320/EA_SPORTS_FC_25/'
  },
  'fc25': {
    officialName: 'EA SPORTS FC 25',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2669320/header.jpg',
    genres: ['Sports'],
    steamUrl: 'https://store.steampowered.com/app/2669320/EA_SPORTS_FC_25/'
  },
  'easportsfc24': {
    officialName: 'EA SPORTS FC 24',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2195250/header.jpg',
    genres: ['Sports'],
    steamUrl: 'https://store.steampowered.com/app/2195250/EA_SPORTS_FC_24/'
  },
  'fc24': {
    officialName: 'EA SPORTS FC 24',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2195250/header.jpg',
    genres: ['Sports'],
    steamUrl: 'https://store.steampowered.com/app/2195250/EA_SPORTS_FC_24/'
  },
  'marvelrivals': {
    officialName: 'Marvel Rivals',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2767030/header.jpg',
    genres: ['Shooter', 'Action'],
    steamUrl: 'https://store.steampowered.com/app/2767030/Marvel_Rivals/'
  },
  'callofdutywarzone': {
    officialName: 'Call of Duty: Warzone',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1938090/header.jpg',
    genres: ['Shooter', 'Battle Royale'],
    steamUrl: 'https://store.steampowered.com/app/1938090/Call_of_Duty/'
  },
  'callofduty': {
    officialName: 'Call of Duty',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1938090/header.jpg',
    genres: ['Shooter'],
    steamUrl: 'https://store.steampowered.com/app/1938090/Call_of_Duty/'
  },
  'valorant': {
    officialName: 'Valorant',
    coverUrl: 'https://media.rawg.io/media/games/b11/b11127b9ee3c3701bd15b9af3286d20e.jpg',
    genres: ['Shooter', 'Action'],
    steamUrl: 'https://playvalorant.com/'
  },
  'leagueoflegends': {
    officialName: 'League of Legends',
    coverUrl: 'https://media.rawg.io/media/games/78b/78bc81e247fc7e77af700cbd632a9297.jpg',
    genres: ['MOBA', 'Strategy'],
    steamUrl: 'https://www.leagueoflegends.com/'
  },
  'lol': {
    officialName: 'League of Legends',
    coverUrl: 'https://media.rawg.io/media/games/78b/78bc81e247fc7e77af700cbd632a9297.jpg',
    genres: ['MOBA', 'Strategy'],
    steamUrl: 'https://www.leagueoflegends.com/'
  },
  'roblox': {
    officialName: 'Roblox',
    coverUrl: 'https://media.rawg.io/media/games/3af/3af386b6e26be6741b711ae6215ef42f.jpg',
    genres: ['Adventure', 'Family'],
    steamUrl: 'https://www.roblox.com/'
  },
  'minecraft': {
    officialName: 'Minecraft',
    coverUrl: 'https://media.rawg.io/media/games/b4e/b4e4c73d5aa4ec66bbf75375c4847a2b.jpg',
    genres: ['Sandbox', 'Adventure'],
    steamUrl: 'https://www.minecraft.net/'
  },
  'fortnite': {
    officialName: 'Fortnite',
    coverUrl: 'https://media.rawg.io/media/games/dcb/dcbb67f371a9a28ea38ffd73ee0f53f3.jpg',
    genres: ['Shooter', 'Battle Royale'],
    steamUrl: 'https://store.epicgames.com/p/fortnite'
  },
  'genshinimpact': {
    officialName: 'Genshin Impact',
    coverUrl: 'https://media.rawg.io/media/games/c38/c38bdb5da139005777176d33c463d70f.jpg',
    genres: ['Action', 'RPG'],
    steamUrl: 'https://genshin.hoyoverse.com/'
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

  // Serviços e utilitários da Microsoft / Windows / Nuvem / Notícias / Widgets
  if (
    lower.includes('onedrive') ||
    lower.includes('sync service') ||
    lower.includes('notícia') ||
    lower.includes('noticia') ||
    lower.includes('news') ||
    lower.includes('widget') ||
    lower.includes('feed') ||
    lower.includes('cortana') ||
    lower.includes('windows update') ||
    lower.includes('smartscreen') ||
    lower.includes('segurança do windows') ||
    lower.includes('windows security') ||
    lower.includes('vincular ao celular') ||
    lower.includes('phone link') ||
    lower.includes('your phone') ||
    lower.includes('gerenciador de tarefas') ||
    lower.includes('task manager') ||
    lower.includes('painel de controle') ||
    lower.includes('control panel') ||
    lower.includes('calculadora') ||
    lower.includes('calculator') ||
    lower.includes('bloco de notas') ||
    lower.includes('notepad') ||
    lower.includes('prompt de comando') ||
    lower.includes('powershell') ||
    lower.includes('terminal')
  ) {
    return true;
  }

  // Utilitários de produtividade, nuvem, comunicadores, áudio, navegadores, editores e o próprio FakeDC
  if (
    lower.includes('google drive') ||
    lower.includes('dropbox') ||
    lower.includes('icloud') ||
    lower.includes('whatsapp') ||
    lower.includes('telegram') ||
    lower.includes('teams') ||
    lower.includes('slack') ||
    lower.includes('zoom') ||
    lower.includes('skype') ||
    lower.includes('anydesk') ||
    lower.includes('teamviewer') ||
    lower.includes('realtek') ||
    lower.includes('sound blaster') ||
    lower.includes('steelseries') ||
    lower.includes('razer synapse') ||
    lower.includes('logitech g hub') ||
    lower.includes('corsair icue') ||
    lower.includes('armoury crate') ||
    lower.includes('afterburner') ||
    lower.includes('discord') ||
    lower.includes('fakedc') ||
    lower.includes('fake dc') ||
    lower.includes('visual studio') ||
    lower.includes('vscode') ||
    lower.includes('github') ||
    lower.includes('google chrome') ||
    lower.endsWith(' - chrome') ||
    lower.includes('microsoft edge') ||
    lower.endsWith(' - edge') ||
    lower.includes('mozilla firefox') ||
    lower.endsWith(' - firefox') ||
    lower.includes('brave browser') ||
    lower.endsWith(' - brave') ||
    lower.includes('opera gx') ||
    lower.includes('opera browser') ||
    lower.endsWith(' - opera') ||
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('187.127.17.88')
  ) {
    return true;
  }

  // Janelas sem título ou comuns
  const exactGarbage = new Set([
    'n/a', 'sem título', 'sem titulo', 'untitled', 'settings', 'configurações', 'configuracoes',
    'pesquisar', 'iniciar', 'search', 'start', 'quick settings', 'cortana', 'xbox', 'microsoft store',
    'fotos', 'photos', 'relógio', 'relogio', 'clock', 'alarms', 'câmera', 'camera',
    'fakedc', 'discord', 'discord clone', 'chrome', 'edge', 'firefox', 'brave', 'opera', 'terminal', 'powershell', 'cmd'
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

  // Fallback Resiliente APENAS para executáveis comprovados de jogos (ex: mods, servidores FiveM, emuladores)
  if (activity && activity.isKnownGame === true) {
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

  // Se não foi verificado na RAWG nem no catálogo popular, e NÃO é um executável de jogo comprovado:
  // DESCARTA! Não é um jogo (ex: janelas de utilitários, serviços em segundo plano como OneDrive, Notícias, etc).
  console.log(`[RAWG 🚫] Título não reconhecido como jogo nem verificado na RAWG: "${rawTitle}". Descartado.`);
  return null;
}
