const { exec } = require('child_process');
const EventEmitter = require('events');

// Base de jogos conhecidos mapeando nomes de executáveis (em minúsculas) para seus títulos oficiais
const KNOWN_GAMES = {
  // Tiro / Competitivo
  'cs2.exe': 'Counter-Strike 2',
  'csgo.exe': 'Counter-Strike: Global Offensive',
  'valorant.exe': 'Valorant',
  'valorant-win64-shipping.exe': 'Valorant',
  'r5apex.exe': 'Apex Legends',
  'r5apex_dx12.exe': 'Apex Legends',
  'rainbowsix.exe': 'Rainbow Six Siege',
  'rainbowsix_vulkan.exe': 'Rainbow Six Siege',
  'overwatch.exe': 'Overwatch 2',
  'tslgame.exe': 'PUBG: BATTLEGROUNDS',
  'fortniteclient-win64-shipping.exe': 'Fortnite',
  'fortnite.exe': 'Fortnite',
  'cod.exe': 'Call of Duty',
  'cod22-cod.exe': 'Call of Duty: Warzone',
  'escapefromtarkov.exe': 'Escape from Tarkov',
  'project8.exe': 'Deadlock',
  'marvelrivals.exe': 'Marvel Rivals',
  'marvel-win64-shipping.exe': 'Marvel Rivals',
  'discovery.exe': 'The Finals',
  'bf2042.exe': 'Battlefield 2042',
  'bfv.exe': 'Battlefield V',
  'bf1.exe': 'Battlefield 1',

  // MOBA / Estratégia
  'leagueclient.exe': 'League of Legends',
  'league of legends.exe': 'League of Legends',
  'leagueclientux.exe': 'League of Legends',
  'dota2.exe': 'Dota 2',
  'smite.exe': 'SMITE',
  'smite2-win64-shipping.exe': 'SMITE 2',

  // Mundo Aberto / Sandbox / Co-op
  'gta5.exe': 'Grand Theft Auto V',
  'playgtav.exe': 'Grand Theft Auto V',
  'fivem.exe': 'FiveM',
  'fivem_b3095_gta.exe': 'FiveM',
  'fivem_b2944_gta.exe': 'FiveM',
  'robloxplayerbeta.exe': 'Roblox',
  'robloxplayer.exe': 'Roblox',
  'minecraft.exe': 'Minecraft',
  'bedrock.exe': 'Minecraft Bedrock',
  'palworld-win64-shipping.exe': 'Palworld',
  'helldivers2.exe': 'HELLDIVERS™ 2',
  'rustclient.exe': 'Rust',
  'lethal company.exe': 'Lethal Company',
  'phasmophobia.exe': 'Phasmophobia',
  'sea of thieves.exe': 'Sea of Thieves',
  'sotgame.exe': 'Sea of Thieves',
  'left4dead2.exe': 'Left 4 Dead 2',
  'terraria.exe': 'Terraria',
  'stardew valley.exe': 'Stardew Valley',
  'projectzomboid64.exe': 'Project Zomboid',
  'sonsoftheforest.exe': 'Sons of the Forest',
  'subnautica.exe': 'Subnautica',
  'arkascended.exe': 'ARK: Survival Ascended',
  'shootergame.exe': 'ARK: Survival Evolved',

  // Esportes / Luta / Party
  'rocketleague.exe': 'Rocket League',
  'fc25.exe': 'EA SPORTS FC 25',
  'fc24.exe': 'EA SPORTS FC 24',
  'fifa23.exe': 'FIFA 23',
  'brawlhalla.exe': 'Brawlhalla',
  'fallguys_client_game.exe': 'Fall Guys',
  'among us.exe': 'Among Us',

  // RPG / Aventura / Outros
  'bg3.exe': 'Baldur\'s Gate 3',
  'bg3_dx11.exe': 'Baldur\'s Gate 3',
  'eldenring.exe': 'ELDEN RING',
  'cyberpunk2077.exe': 'Cyberpunk 2077',
  'rdr2.exe': 'Red Dead Redemption 2',
  'b1-win64-shipping.exe': 'Black Myth: Wukong',
  'genshinimpact.exe': 'Genshin Impact',
  'starrail.exe': 'Honkai: Star Rail',
  'client-win64-shipping.exe': 'Wuthering Waves',
  'deadbydaylight-win64-shipping.exe': 'Dead by Daylight',
  'diablo iv.exe': 'Diablo IV',
  'wow.exe': 'World of Warcraft',
  'pathofexile.exe': 'Path of Exile',
  'pathofexile_x64.exe': 'Path of Exile',
  'destiny2.exe': 'Destiny 2',
  'monsterhunterworld.exe': 'Monster Hunter: World',
  'hades.exe': 'Hades',
  'hades2.exe': 'Hades II',
  'hollow_knight.exe': 'Hollow Knight',
  'deadcells.exe': 'Dead Cells',
  'eurotrucks2.exe': 'Euro Truck Simulator 2',
  'osu!.exe': 'osu!',
  'valheim.exe': 'Valheim'
};

// Lista de executáveis de programas que NÃO são jogos (navegadores, chat, utilitários, SO)
const IGNORED_EXES = new Set([
  'explorer.exe', 'chrome.exe', 'firefox.exe', 'msedge.exe', 'brave.exe', 'opera.exe', 'opera_gx.exe', 'vivaldi.exe', 'tor.exe', 'safari.exe',
  'discord.exe', 'fakedc.exe', 'electron.exe', 'antigravity.exe', 'code.exe', 'devenv.exe', 'idea64.exe', 'pycharm64.exe',
  'cmd.exe', 'powershell.exe', 'windowsterminal.exe', 'taskmgr.exe', 'notepad.exe', 'notepad++.exe', 'calc.exe',
  'spotify.exe', 'vlc.exe', 'wmplayer.exe', 'mediaplayer.exe', 'microsoft.media.player.exe', 'music.ui.exe', 'video.ui.exe', 'foobar2000.exe', 'aimp.exe', 'potplayer64.exe', 'mpc-hc64.exe', 'mpc-be64.exe',
  'steam.exe', 'steamwebhelper.exe', 'gameoverlayui.exe', 'gameoverlayui64.exe',
  'epicgameslauncher.exe', 'riotclientservices.exe', 'battlenet.exe', 'origin.exe', 'ea.exe', 'upc.exe', 'ubisoftconnect.exe', 'gog galaxy.exe',
  'nvidia overlay.exe', 'lghub.exe', 'lghub_system_tray.exe', 'obs64.exe', 'obs32.exe', 'streamlabs obs.exe',
  'githubdesktop.exe', 'slack.exe', 'teams.exe', 'ms-teams.exe', 'telegram.exe', 'whatsapp.exe', 'skype.exe',
  'lightshot.exe', 'sharex.exe', 'greenshot.exe', 'lockapp.exe', 'searchhost.exe', 'startmenuexperiencehost.exe',
  'shellexperiencehost.exe', 'shellhost.exe', 'textinputhost.exe', 'applicationframehost.exe', 'xboxpcapp.exe',
  'm365copilot.exe', 'msedgewebview2.exe', 'jusched.exe', 'jucheck.exe', 'unsecapp.exe', 'crossdeviceservice.exe',
  'crossdeviceresume.exe', 'widgetservice.exe', 'monotificationux.exe', 'taskhostw.exe', 'atieclxx.exe'
]);

const IGNORED_PREFIXES = ['system', 'nv', 'svchost', 'dwm', 'dllhost', 'runtimebroker', 'csrss', 'wininit', 'winlogon', 'smss', 'services', 'lsass'];

const IGNORED_TITLE_STARTS = ['{', '.net', 'dwm notification', 'windows push', 'broadcastlistener', 'wuicon', 'olemainthread', 'task host', 'rtc video'];
const IGNORED_EXACT_TITLES = new Set([
  'n/a', 'olemainthreadwndname', 'task host window', 'quick settings', 'pesquisar', 'iniciar', 'search', 'start',
  'sem título', 'sem titulo', 'untitled', 'settings', 'configurações', 'configuracoes', 'xbox'
]);

function decodeWindowsText(str) {
  if (!str) return '';
  return str
    .replace(/\ufffd/g, 'í')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã£/g, 'ã')
    .replace(/Ãµ/g, 'õ')
    .replace(/Ã§/g, 'ç')
    .replace(/Ã€/g, 'À')
    .replace(/Ã‰/g, 'É')
    .replace(/Ã/g, 'Í')
    .trim();
}

/**
 * Limpa títulos de janelas de jogos no Windows para exibição limpa (estilo Discord)
 */
function cleanGameTitle(rawTitle, exeName) {
  let title = decodeWindowsText(rawTitle.replace(/["“”]/g, '').trim());

  // Remove sufixos técnicos comuns adicionados por engines
  title = title.replace(/\s*-\s*Unreal\s*Engine.*$/i, '');
  title = title.replace(/\s*-\s*Unity.*$/i, '');
  title = title.replace(/\s*\(64-bit.*?\)$/i, '');
  title = title.replace(/\s*\(32-bit.*?\)$/i, '');
  title = title.replace(/\s*v\d+(\.\d+)*.*$/i, ''); // Remove "v1.2.3"
  title = title.trim();

  // Se o título ficou vazio ou curto demais, formata o nome do arquivo .exe
  if (!title || title.length < 2) {
    title = exeName.replace(/\.exe$/i, '');
    title = title.replace(/[-_]/g, ' ');
    title = title.replace(/\b\w/g, l => l.toUpperCase());
  }

  // Limita tamanho para não quebrar a interface
  if (title.length > 45) {
    title = title.substring(0, 42) + '...';
  }

  return title;
}

class GameDetector extends EventEmitter {
  constructor() {
    super();
    this.currentActivity = null; // { game: string, exe: string, startedAt: number }
    this.timer = null;
    this.isChecking = false;
  }

  start(intervalMs = 10000) {
    if (this.timer) return;
    this.check();
    this.timer = setInterval(() => this.check(), intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getCurrentActivity() {
    return this.currentActivity;
  }

  setActivity(game, exe) {
    if (game) {
      if (!this.currentActivity || this.currentActivity.game !== game) {
        this.currentActivity = {
          game,
          exe,
          startedAt: (this.currentActivity && this.currentActivity.exe === exe)
            ? this.currentActivity.startedAt
            : Date.now()
        };
        this.emit('change', this.currentActivity);
      }
    } else if (this.currentActivity) {
      this.currentActivity = null;
      this.emit('change', null);
    }
  }

  check() {
    if (this.isChecking) return;
    if (process.platform !== 'win32') return;

    this.isChecking = true;

    // Etapa 1: Leitura rápida ultraleve (200ms) dos processos ativos da sessão
    exec('tasklist /fo csv /nh /fi "SESSIONNAME eq Console"', { windowsHide: true, timeout: 5000 }, (err, stdout) => {
      if (err || !stdout) {
        this.isChecking = false;
        return;
      }

      const lines = stdout.split(/\r?\n/);
      const runningExes = new Set();
      for (const line of lines) {
        if (!line.trim()) continue;
        const match = line.match(/^"([^"]+)"/);
        if (match && match[1]) {
          runningExes.add(match[1].toLowerCase());
        }
      }

      // 1. Estabilidade e Desempenho: Se o jogo atual ainda está em execução, mantém ele ativo sem gastar CPU
      if (this.currentActivity && runningExes.has(this.currentActivity.exe)) {
        this.isChecking = false;
        return;
      }

      // 2. Checagem instantânea na lista de jogos conhecidos
      let foundKnown = null;
      for (const [knownExe, knownTitle] of Object.entries(KNOWN_GAMES)) {
        if (runningExes.has(knownExe.toLowerCase())) {
          foundKnown = { game: knownTitle, exe: knownExe.toLowerCase() };
          break;
        }
      }

      if (foundKnown) {
        this.setActivity(foundKnown.game, foundKnown.exe);
        this.isChecking = false;
        return;
      }

      // 3. Fallback Universal Dinâmico: Se não está no catálogo, analisa títulos de janelas abertas no Windows
      exec('chcp 65001 >nul & tasklist /v /fo csv /nh /fi "SESSIONNAME eq Console"', { windowsHide: true, timeout: 15000, encoding: 'utf8' }, (vErr, vStdout) => {
        this.isChecking = false;
        if (vErr || !vStdout) {
          this.setActivity(null, null);
          return;
        }

        const vLines = vStdout.split(/\r?\n/);
        let dynamicGame = null;

        for (const line of vLines) {
          const match = line.match(/^"([^"]+)","([^"]+)","([^"]+)","([^"]+)","([^"]+)","([^"]+)","([^"]+)","([^"]+)","(.*)"$/);
          if (!match) continue;

          const exe = match[1].toLowerCase();
          const title = match[9].trim();

          // Ignora navegadores, IDEs, Discord, ferramentas de sistema
          if (IGNORED_EXES.has(exe)) continue;
          if (IGNORED_PREFIXES.some(p => exe.startsWith(p))) continue;

          const titleLower = title.toLowerCase();
          if (!title || IGNORED_EXACT_TITLES.has(titleLower)) continue;
          if (IGNORED_TITLE_STARTS.some(p => titleLower.startsWith(p))) continue;

          dynamicGame = {
            game: cleanGameTitle(title, exe),
            exe
          };
          break;
        }

        if (dynamicGame) {
          this.setActivity(dynamicGame.game, dynamicGame.exe);
        } else {
          this.setActivity(null, null);
        }
      });
    });
  }
}

module.exports = new GameDetector();
