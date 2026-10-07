const { app, BrowserWindow, ipcMain, session, Menu, desktopCapturer, globalShortcut, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const { checkAndApplyUpdates, launchInstallerAndExit } = require('./updater');
const gameDetector = require('./gameDetector');

// Desabilita menus de barra de ferramentas padrão do Electron (File, Edit, View, etc)
Menu.setApplicationMenu(null);

let splashWindow = null;
let mainWindow = null;
let pendingDisplayMediaCallback = null;
let cachedScreenSources = [];
let screenPickerTimeout = null;
let lastSelectedSource = null;
let lastSelectedTime = 0;
let currentAudioRequested = true;

// Carrega configurações
let config = {
  appName: 'FakeDC',
  serverUrl: 'https://jogosbolados.duckdns.org',
  localServerUrl: 'http://localhost:3000'
};

const configPath = path.join(__dirname, 'config.json');
if (fs.existsSync(configPath)) {
  try {
    const fileData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config = { ...config, ...fileData };
  } catch (e) {
    console.warn('[Config] Erro ao ler config.json:', e.message);
  }
}

// Suporte a flags de aceleração por hardware e WebRTC
app.commandLine.appendSwitch('ignore-certificate-errors', 'true');
app.commandLine.appendSwitch('allow-insecure-localhost', 'true');
app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer');

// Ignora erros de SSL autoassinado do servidor VPS
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  event.preventDefault();
  callback(true);
});

const appIconIco = path.join(__dirname, 'assets', 'icon.ico');
const appIconPng = path.join(__dirname, 'assets', 'logo.png');
const appIconPath = fs.existsSync(appIconIco) ? appIconIco : appIconPng;

/**
 * Cria a Splash Screen de Inicialização e Verificação de Versão
 */
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 360,
    height: 440,
    resizable: false,
    frame: false,
    center: true,
    icon: fs.existsSync(appIconPath) ? appIconPath : undefined,
    backgroundColor: '#111214',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

/**
 * Cria a Janela Principal do Discord "FakeDC"
 */
function createMainWindow(targetUrl) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 940,
    minHeight: 600,
    title: 'FakeDC',
    icon: fs.existsSync(appIconPath) ? appIconPath : undefined,
    backgroundColor: '#111214',
    frame: false,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Garante que o menu nativo da janela não seja exibido
  mainWindow.setMenu(null);

  // Monitora alterações de estado Maximizado / Restaurado
  mainWindow.on('maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:maximized-change', true);
    }
  });

  mainWindow.on('unmaximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:maximized-change', false);
    }
  });

  // Concede automaticamente permissões de mídia (microfone, câmera, compartilhamento de tela)
  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission) => {
    return true;
  });

  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });

  // Habilita captura de tela moderna no Electron WebRTC com Seletor HD
  if (mainWindow.webContents.session.setDisplayMediaRequestHandler) {
    mainWindow.webContents.session.setDisplayMediaRequestHandler(async (request, callback) => {
      try {
        if (!request.videoRequested) {
          return callback();
        }
        currentAudioRequested = !!request.audioRequested;

        // Se for um fallback imediato sem áudio da mesma tela escolhida recentemente (< 4s)
        if (!request.audioRequested && lastSelectedSource && (Date.now() - lastSelectedTime < 4000)) {
          return callback({ video: lastSelectedSource });
        }

        const sources = await desktopCapturer.getSources({
          types: ['screen', 'window'],
          thumbnailSize: { width: 480, height: 270 }
        });

        if (!sources || sources.length === 0) {
          return callback();
        }

        if (pendingDisplayMediaCallback) {
          try { pendingDisplayMediaCallback(); } catch (e) {}
          pendingDisplayMediaCallback = null;
        }
        if (screenPickerTimeout) {
          clearTimeout(screenPickerTimeout);
          screenPickerTimeout = null;
        }

        pendingDisplayMediaCallback = callback;
        cachedScreenSources = sources;

        // Cancela com segurança após 90 segundos caso o usuário deixe o modal aberto
        screenPickerTimeout = setTimeout(() => {
          if (pendingDisplayMediaCallback) {
            try { pendingDisplayMediaCallback(); } catch (e) {}
            pendingDisplayMediaCallback = null;
            cachedScreenSources = [];
          }
        }, 90000);

        const serialized = sources.map(s => ({
          id: s.id,
          name: s.name,
          thumbnail: s.thumbnail ? s.thumbnail.toDataURL() : '',
          appIcon: s.appIcon ? s.appIcon.toDataURL() : null,
          isScreen: s.id.startsWith('screen:')
        }));

        if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
          mainWindow.webContents.send('electron:open-screen-picker', serialized);
        } else {
          callback();
        }
      } catch (err) {
        console.error('[Electron] Erro em setDisplayMediaRequestHandler:', err);
        callback();
      }
    });
  }

  // Abre links externos no navegador padrão do usuário
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const { shell } = require('electron');
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.loadURL(targetUrl);

  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
    mainWindow.show();
    mainWindow.focus();

    // Inicia monitoramento de jogos do Windows (Discord Rich Presence / Game Activity)
    gameDetector.start(10000);
  });

  mainWindow.on('closed', () => {
    gameDetector.stop();
    if (pendingDisplayMediaCallback) {
      try { pendingDisplayMediaCallback(); } catch (e) {}
      pendingDisplayMediaCallback = null;
      cachedScreenSources = [];
    }
    if (screenPickerTimeout) {
      clearTimeout(screenPickerTimeout);
      screenPickerTimeout = null;
    }
    mainWindow = null;
  });
}

function getAppVersion() {
  try {
    const rootPkgPath = path.join(__dirname, '..', 'package.json');
    if (fs.existsSync(rootPkgPath)) {
      const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
      if (rootPkg.version) return rootPkg.version;
    }
  } catch (e) {}
  try {
    const localPkgPath = path.join(__dirname, 'package.json');
    if (fs.existsSync(localPkgPath)) {
      const localPkg = JSON.parse(fs.readFileSync(localPkgPath, 'utf8'));
      if (localPkg.version) return localPkg.version;
    }
  } catch (e) {}
  return app.getVersion();
}

/**
 * Fluxo de Inicialização:
 * 1. Abre Splash
 * 2. Checa versão remota via JSON
 * 3. Se houver nova versão, baixa com tubinho de progresso e instala
 * 4. Se não, abre a tela principal do FakeDC
 */
async function startApplication() {
  createSplashWindow();

  const currentVersion = getAppVersion();
  try {
    app.setVersion(currentVersion);
  } catch (e) {}
  const serverUrl = process.env.SERVER_URL || config.serverUrl;

  console.log(`[FakeDC] Iniciando cliente desktop v${currentVersion}`);
  console.log(`[FakeDC] Servidor conectado: ${serverUrl}`);

  // Aguarda janela de splash carregar DOM
  await new Promise(r => setTimeout(r, 600));

  try {
    const updateResult = await checkAndApplyUpdates({
      currentVersion,
      serverUrl,
      onStatus: (status) => {
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.webContents.send('updater:status', status);
        }
      },
      onProgress: (progress) => {
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.webContents.send('updater:progress', progress);
        }
      }
    });

    if (updateResult && updateResult.updateAvailable && updateResult.installerPath) {
      console.log('[FakeDC] Atualização baixada. Iniciando instalador...');
      launchInstallerAndExit(updateResult.installerPath);
      return;
    }
  } catch (err) {
    console.error('[FakeDC] Erro ao verificar atualizações:', err.message);
  }

  // Transição suave para a janela principal
  setTimeout(() => {
    createMainWindow(serverUrl);
  }, 800);
}

// Função auxiliar para obter a janela ativa ou principal
function getActiveWindow() {
  const focused = BrowserWindow.getFocusedWindow();
  if (focused && !focused.isDestroyed()) return focused;
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
  if (splashWindow && !splashWindow.isDestroyed()) return splashWindow;
  return null;
}

// Configurações do ciclo de vida do Electron
app.whenReady().then(() => {
  // IPC Handlers de Controle de Janela Personalizada
  ipcMain.on('window:minimize', () => {
    const win = getActiveWindow();
    if (win) win.minimize();
  });

  ipcMain.on('window:maximize', () => {
    const win = getActiveWindow();
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });

  ipcMain.on('window:close', () => {
    const win = getActiveWindow();
    if (win) win.close();
  });

  ipcMain.handle('window:is-maximized', () => {
    const win = getActiveWindow();
    return win ? win.isMaximized() : false;
  });

  ipcMain.handle('app:get-version', () => {
    return getAppVersion();
  });

  // Handlers do Seletor de Telas e Janelas (Screen Share)
  ipcMain.handle('electron:get-screen-sources', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 480, height: 270 }
      });
      return sources.map(s => ({
        id: s.id,
        name: s.name,
        thumbnail: (s.thumbnail && !s.thumbnail.isEmpty()) ? s.thumbnail.toDataURL() : '',
        appIcon: null,
        isScreen: s.id.startsWith('screen:')
      }));
    } catch (err) {
      console.error('[Electron] Erro em desktopCapturer.getSources:', err);
      return [];
    }
  });

  ipcMain.on('electron:screen-source-selected', (event, sourceId) => {
    if (screenPickerTimeout) {
      clearTimeout(screenPickerTimeout);
      screenPickerTimeout = null;
    }
    if (pendingDisplayMediaCallback) {
      const selectedSource = cachedScreenSources.find(s => s.id === sourceId) || cachedScreenSources[0];
      if (selectedSource) {
        lastSelectedSource = selectedSource;
        lastSelectedTime = Date.now();
        const response = { video: selectedSource };
        if (currentAudioRequested) {
          response.audio = 'loopback';
        }
        pendingDisplayMediaCallback(response);
      } else {
        pendingDisplayMediaCallback();
      }
      pendingDisplayMediaCallback = null;
      cachedScreenSources = [];
    }
  });

  ipcMain.on('electron:screen-picker-cancelled', () => {
    if (screenPickerTimeout) {
      clearTimeout(screenPickerTimeout);
      screenPickerTimeout = null;
    }
    if (pendingDisplayMediaCallback) {
      try { pendingDisplayMediaCallback(); } catch (e) {}
      pendingDisplayMediaCallback = null;
      cachedScreenSources = [];
    }
  });

  // Notifica o renderer quando o jogo em execução mudar ou for fechado
  gameDetector.on('change', (activity) => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send('electron:game-activity', activity);
    }
  });

  ipcMain.handle('electron:get-game-activity', () => {
    return gameDetector.getCurrentActivity();
  });

  // Piscar ícone na barra de tarefas (flashFrame - Fase 4)
  ipcMain.on('window:flash-frame', (event, flag) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.flashFrame(Boolean(flag));
    }
  });

  // Trazer janela para primeiro plano ao clicar em notificação
  ipcMain.on('window:show-focus', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Notificação Nativa do Windows Toast (Fase 4)
  ipcMain.on('notification:show', (event, { title, body, icon, channelId }) => {
    try {
      if (Notification && Notification.isSupported()) {
        const notif = new Notification({
          title: title || 'FakeDC',
          body: body || '',
          icon: fs.existsSync(appIconPath) ? appIconPath : undefined,
          silent: false
        });
        notif.on('click', () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
            if (channelId && !mainWindow.webContents.isDestroyed()) {
              mainWindow.webContents.send('notification:clicked', { channelId });
            }
          }
        });
        notif.show();
      }
    } catch (err) {
      console.warn('[Notification] Erro ao disparar notificação nativa:', err.message);
    }
  });

  startApplication();

  // Atalhos Globais de Teclado (Discord Global Shortcuts: Ctrl+Shift+M e Ctrl+Shift+D)
  try {
    globalShortcut.register('CommandOrControl+Shift+M', () => {
      if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
        mainWindow.webContents.send('shortcut:toggle-mic');
      }
    });
    globalShortcut.register('CommandOrControl+Shift+D', () => {
      if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
        mainWindow.webContents.send('shortcut:toggle-deaf');
      }
    });
  } catch (err) {
    console.warn('[Shortcuts] Erro ao registrar atalhos globais:', err.message);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      startApplication();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
