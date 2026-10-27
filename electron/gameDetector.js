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
  'amtrucks.exe': 'American Truck Simulator',
  'osu!.exe': 'osu!',
  'valheim.exe': 'Valheim',
  'javaw.exe': 'Minecraft',
  'minecraft.windows.exe': 'Minecraft Bedrock',
  'witcher3.exe': 'The Witcher 3: Wild Hunt',
  'sekiro.exe': 'Sekiro: Shadows Die Twice',
  'darksoulsiii.exe': 'Dark Souls III',
  'darksoulsremastered.exe': 'Dark Souls Remastered',
  'forzahorizon5.exe': 'Forza Horizon 5',
  'forzahorizon4.exe': 'Forza Horizon 4',
  'sims4.exe': 'The Sims 4',
  'ts4_x64.exe': 'The Sims 4',
  'warframe.x64.exe': 'Warframe',
  'tft.exe': 'Teamfight Tactics',
  'civ6.exe': 'Civilization VI',
  'factorio.exe': 'Factorio',
  'rimworldwin64.exe': 'RimWorld',
  'deeprockgalactic.exe': 'Deep Rock Galactic',
  'fsd-win64-shipping.exe': 'Deep Rock Galactic',
  'readyornot.exe': 'Ready or Not',
  'readyornot-win64-shipping.exe': 'Ready or Not',
  'squad.exe': 'Squad',
  'hellletloose.exe': 'Hell Let Loose',
  'bodycam.exe': 'Bodycam',
  'content warning.exe': 'Content Warning',
  'satisfactory.exe': 'Satisfactory',
  'factorygame-win64-shipping.exe': 'Satisfactory',
  'spectredivide.exe': 'Spectre Divide',
  'santorini-win64-shipping.exe': 'Spectre Divide',
  'tl.exe': 'Throne and Liberty',
  'beamng.drive.x64.exe': 'BeamNG.drive',
  'acs.exe': 'Assetto Corsa',
  'assetto corsa.exe': 'Assetto Corsa',
  'hl2.exe': 'Half-Life 2',
  'portal2.exe': 'Portal 2',
  'fivem_gamelauncher.exe': 'FiveM',
  'fivem_rosselauncher.exe': 'FiveM'
};

// Lista de executáveis de programas que NÃO são jogos (navegadores, chat, utilitários, SO, nuvem, hardware)
const IGNORED_EXES = new Set([
  'explorer.exe', 'chrome.exe', 'firefox.exe', 'msedge.exe', 'brave.exe', 'opera.exe', 'opera_gx.exe', 'vivaldi.exe', 'tor.exe', 'safari.exe',
  'discord.exe', 'fakedc.exe', 'electron.exe', 'antigravity.exe', 'code.exe', 'devenv.exe', 'idea64.exe', 'pycharm64.exe',
  'cmd.exe', 'powershell.exe', 'windowsterminal.exe', 'taskmgr.exe', 'notepad.exe', 'notepad++.exe', 'calc.exe', 'calculatorapp.exe',
  'spotify.exe', 'vlc.exe', 'wmplayer.exe', 'mediaplayer.exe', 'microsoft.media.player.exe', 'music.ui.exe', 'video.ui.exe', 'foobar2000.exe', 'aimp.exe', 'potplayer64.exe', 'mpc-hc64.exe', 'mpc-be64.exe',
  'steam.exe', 'steamwebhelper.exe', 'gameoverlayui.exe', 'gameoverlayui64.exe',
  'epicgameslauncher.exe', 'riotclientservices.exe', 'battlenet.exe', 'origin.exe', 'ea.exe', 'upc.exe', 'ubisoftconnect.exe', 'gog galaxy.exe',
  'nvidia overlay.exe', 'lghub.exe', 'lghub_system_tray.exe', 'obs64.exe', 'obs32.exe', 'streamlabs obs.exe',
  'githubdesktop.exe', 'slack.exe', 'teams.exe', 'ms-teams.exe', 'telegram.exe', 'whatsapp.exe', 'skype.exe', 'zoom.exe',
  'lightshot.exe', 'sharex.exe', 'greenshot.exe', 'lockapp.exe', 'searchhost.exe', 'searchapp.exe', 'searchui.exe', 'startmenuexperiencehost.exe',
  'shellexperiencehost.exe', 'shellhost.exe', 'textinputhost.exe', 'applicationframehost.exe', 'xboxpcapp.exe',
  'm365copilot.exe', 'msedgewebview2.exe', 'jusched.exe', 'jucheck.exe', 'unsecapp.exe', 'crossdeviceservice.exe',
  'crossdeviceresume.exe', 'widgetservice.exe', 'widgets.exe', 'widgetboard.exe', 'feedeaservice.exe', 'newsandinterests.exe',
  'monotificationux.exe', 'taskhostw.exe', 'atieclxx.exe',
  'rxdiag.exe', 'radeonsoftware.exe', 'amdrsserv.exe', 'amddvr.exe', 'amdow.exe', 'cnext.exe',
  'chatgpt.exe', 'chatgpt desktop.exe', 'copilot.exe', 'claude.exe', 'cursor.exe', 'windsurf.exe', 'postman.exe', 'insomnia.exe', 'docker desktop.exe', 'vmware.exe', 'virtualbox.exe',
  // Sincronização em Nuvem e Utilitários de Segundo Plano (OneDrive, GDrive, Dropbox)
  'onedrive.exe', 'onedrivesetup.exe', 'filecoauth.exe', 'googledrivesync.exe', 'googledrivefs.exe', 'dropbox.exe', 'dropboxupdate.exe', 'megasync.exe', 'icloudservices.exe', 'pcloud.exe', 'nextcloud.exe',
  // Segurança, Diagnóstico e Sistema Windows
  'securityhealthsystray.exe', 'securityhealthservice.exe', 'smartscreen.exe', 'msmpeng.exe',
  'phoneexperiencehost.exe', 'yourphone.exe', 'phonelink.exe', 'cortana.exe',
  'gameinputredistservice.exe', 'defendersessionhelper.exe', 'sihost.exe', 'fontdrvhost.exe', 'conhost.exe',
  // Consoles de Áudio e Software de Periféricos
  'ravcpl64.exe', 'rtkngui64.exe', 'audiodg.exe', 'nahimic.exe', 'steelseriesgg.exe', 'sonar.exe',
  'icue.exe', 'synapse.exe', 'razer synapse service.exe', 'armourycrate.exe', 'msiafterburner.exe', 'rtss.exe',
  // Ferramentas UWP e Produtividade
  'time.exe', 'windowscamera.exe', 'microsoft.photos.exe', 'winstore.app.exe',
  'winword.exe', 'excel.exe', 'powerpnt.exe', 'outlook.exe', 'onenote.exe', 'acrobat.exe', 'acrocheck.exe',
  'anydesk.exe', 'teamviewer.exe', 'parsec.exe', 'rustdesk.exe'
]);

const IGNORED_PREFIXES = ['system', 'nv', 'amd', 'radeon', 'ati', 'rxdiag', 'svchost', 'dwm', 'dllhost', 'runtimebroker', 'csrss', 'wininit', 'winlogon', 'smss', 'services', 'lsass', 'chatgpt', 'copilot', 'onedrive', 'widget', 'feed'];

const IGNORED_TITLE_STARTS = [
  '{', '.net', 'dwm notification', 'windows push', 'broadcastlistener', 'wuicon', 'olemainthread',
  'task host', 'rtc video', 'rxdiag', 'radeon', 'amd ', 'chatgpt', 'copilot', 'esc to cancel',
  'microsoft onedrive', 'onedrive', 'notícias', 'noticias', 'news', 'feeds', 'widgets',
  'segurança', 'windows security', 'vincular ao celular', 'phone link', 'calculadora', 'calculator',
  'gerenciador de tarefas', 'task manager', 'configurações', 'settings', 'pesquisar', 'iniciar'
];

const IGNORED_EXACT_TITLES = new Set([
  'n/a', 'olemainthreadwndname', 'task host window', 'quick settings', 'pesquisar', 'iniciar', 'search', 'start',
  'sem título', 'sem titulo', 'untitled', 'settings', 'configurações', 'configuracoes', 'xbox', 'microsoft store',
  'fotos', 'photos', 'relógio', 'relogio', 'clock', 'alarms', 'câmera', 'camera'
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
  const lower = title.toLowerCase();

  // Rejeita utilitários de IA, diálogos do Windows, serviços e nuvem
  if (
    lower.includes('is using your computer') ||
    lower.includes('esc to cancel') ||
    lower.includes('onedrive') ||
    lower.includes('sync service') ||
    lower.includes('notícia') ||
    lower.includes('noticia') ||
    lower.includes('news') ||
    lower.includes('widget') ||
    lower.includes('feed') ||
    lower.includes('microsoft') ||
    lower.includes('windows update') ||
    lower.includes('gerenciador de tarefas') ||
    lower.includes('segurança')
  ) {
    return '';
  }

  // Remove sufixos técnicos comuns adicionados por engines
  title = title.replace(/\s*-\s*Unreal\s*Engine.*$/i, '');
  title = title.replace(/\s*-\s*Unity.*$/i, '');
  title = title.replace(/\s*\(64-bit.*?\)$/i, '');
  title = title.replace(/\s*\(32-bit.*?\)$/i, '');
  title = title.replace(/\s*v\d+(\.\d+)*.*$/i, ''); // Remove "v1.2.3"
  title = title.trim();

  // Se o título ficou vazio ou curto demais, não força conversão de .exe aleatório em jogo
  if (!title || title.length < 2) {
    return '';
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
    this.currentActivity = null; // { game: string, exe: string, isKnownGame: boolean, startedAt: number }
    this.timer = null;
    this.isChecking = false;
  }

  start(intervalMs = 5000) {
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

  setActivity(game, exe, isKnownGame = false) {
    if (game) {
      if (!this.currentActivity || this.currentActivity.game !== game) {
        this.currentActivity = {
          game,
          exe,
          isKnownGame,
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

  getRunningProcesses() {
    return new Promise((resolve) => {
      exec('tasklist /fo csv /nh', { windowsHide: true, timeout: 4000 }, (err, stdout) => {
        const runningExes = new Set();
        if (!err && stdout) {
          const lines = stdout.split(/\r?\n/);
          for (const line of lines) {
            if (!line.trim()) continue;
            const match = line.match(/^"([^"]+)"/);
            if (match && match[1]) {
              runningExes.add(match[1].toLowerCase());
            }
          }
        }
        resolve(runningExes);
      });
    });
  }

  async getOpenWindows() {
    try {
      let desktopCapturer = null;
      try {
        desktopCapturer = require('electron').desktopCapturer;
      } catch (e) {}

      if (desktopCapturer && typeof desktopCapturer.getSources === 'function') {
        const sources = await desktopCapturer.getSources({
          types: ['window'],
          thumbnailSize: { width: 1, height: 1 },
          fetchWindowIcons: false
        });
        return sources.map(s => (s.name || '').trim()).filter(Boolean);
      }
    } catch (e) {}
    return [];
  }

  async check() {
    if (this.isChecking) return;
    if (process.platform !== 'win32') return;

    this.isChecking = true;
    try {
      // Etapa 1: Leitura rápida e não-bloqueante dos processos ativos da máquina (~200ms)
      const runningExes = await this.getRunningProcesses();
      if (!runningExes || runningExes.size === 0) {
        return;
      }

      // 1. Otimização de estabilidade: se o jogo atual ainda está em execução, mantém ativo sem reprocessar
      if (this.currentActivity && this.currentActivity.exe && this.currentActivity.exe !== 'window') {
        if (runningExes.has(this.currentActivity.exe.toLowerCase())) {
          return;
        }
      }

      // 2. Busca instantânea na lista de jogos catalogados e conhecidos
      let foundKnown = null;
      for (const [knownExe, knownTitle] of Object.entries(KNOWN_GAMES)) {
        if (runningExes.has(knownExe.toLowerCase())) {
          foundKnown = { game: knownTitle, exe: knownExe.toLowerCase(), isKnownGame: true };
          break;
        }
      }

      if (foundKnown) {
        this.setActivity(foundKnown.game, foundKnown.exe, true);
        return;
      }

      // 3. Fallback Universal Nativo: Analisa títulos de janelas abertas via desktopCapturer (10ms, sem cmd/tasklist /v)
      const windowTitles = await this.getOpenWindows();
      let dynamicGame = null;

      for (const title of windowTitles) {
        const titleLower = title.toLowerCase();
        if (IGNORED_EXACT_TITLES.has(titleLower)) continue;
        if (IGNORED_TITLE_STARTS.some(p => titleLower.startsWith(p))) continue;

        const cleaned = cleanGameTitle(title, '');
        if (!cleaned) continue;

        dynamicGame = {
          game: cleaned,
          exe: 'window',
          isKnownGame: false
        };
        break;
      }

      if (dynamicGame) {
        this.setActivity(dynamicGame.game, dynamicGame.exe, false);
      } else {
        this.setActivity(null, null, false);
      }
    } catch (err) {
      console.warn('[GameDetector ⚠️] Erro na verificação:', err.message);
    } finally {
      this.isChecking = false;
    }
  }
}

module.exports = new GameDetector();
