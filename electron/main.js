const { app, BrowserWindow, ipcMain, session, Menu, desktopCapturer, globalShortcut, Notification, clipboard, nativeImage, Tray } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { checkAndApplyUpdates, launchInstallerAndExit } = require('./updater');
const gameDetector = require('./gameDetector');

const debugLogPath = path.join(os.tmpdir(), 'fakedc_debug.log');
function logDebug(...args) {
  const line = `[${new Date().toISOString()}] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}\r\n`;
  try { fs.appendFileSync(debugLogPath, line, 'utf8'); } catch (e) {}
  console.log(...args);
}

process.on('uncaughtException', (err) => {
  logDebug('UNCAUGHT EXCEPTION:', err && err.stack ? err.stack : err);
});

process.on('unhandledRejection', (reason) => {
  logDebug('UNHANDLED REJECTION:', reason);
});

// Desabilita menus de barra de ferramentas padrão do Electron (File, Edit, View, etc)
Menu.setApplicationMenu(null);

let splashWindow = null;
let mainWindow = null;
let tray = null;
let isQuitting = false;
let hasShownTrayBalloon = false;
let pendingDisplayMediaCallback = null;
let cachedScreenSources = [];
let screenPickerTimeout = null;
let lastSelectedSource = null;
let lastSelectedTime = 0;
let currentAudioRequested = true;

// Bloqueio de instância única: se o app já estiver rodando (inclusive na bandeja), restaura a janela
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  logDebug('[FakeDC] Outra instância já está em execução. Encerrando esta...');
  app.quit();
} else {
  app.on('second-instance', () => {
    logDebug('[FakeDC] Segunda instância detectada. Restaurando janela principal...');
    showMainWindow();
  });
}

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
// Desativa Windows Graphics Capture (WGC) para remover a borda amarela de captura do Windows
app.commandLine.appendSwitch('disable-features', 'WebRtcAllowWgcScreenCapturer,WebRtcAllowWgcWindowCapturer');

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

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    logDebug('mainWindow did-fail-load:', errorCode, errorDescription, validatedURL);
  });

  mainWindow.loadURL(targetUrl);

  const forceShowTimeout = setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      logDebug('forceShowTimeout disparado! Mostrando mainWindow forçadamente.');
      mainWindow.show();
      mainWindow.focus();
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
      }
    }
  }, 4000);

  mainWindow.once('ready-to-show', () => {
    logDebug('mainWindow ready-to-show disparado!');
    clearTimeout(forceShowTimeout);
    mainWindow.show();
    mainWindow.focus();
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }

    // Inicia monitoramento de jogos do Windows (Discord Rich Presence / Game Activity)
    gameDetector.start(10000);
  });

  // Ao clicar no X ou tentar fechar a janela, oculta para a bandeja do sistema se não for app.quit()
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      logDebug('[FakeDC] Janela principal minimizada para a bandeja do sistema.');

      if (!hasShownTrayBalloon && tray && process.platform === 'win32') {
        hasShownTrayBalloon = true;
        try {
          tray.displayBalloon({
            iconType: 'info',
            title: 'FakeDC',
            content: 'O FakeDC continua rodando em segundo plano na bandeja do sistema.'
          });
        } catch (e) {}
      }
      return false;
    }
  });

  mainWindow.on('closed', () => {
    logDebug('mainWindow closed disparado!');
    clearTimeout(forceShowTimeout);
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
    if (app && app.isPackaged && typeof app.getVersion === 'function') {
      const v = app.getVersion();
      if (v && v !== '0.0.0') return v;
    }
  } catch (e) {}
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
  return (app && typeof app.getVersion === 'function') ? app.getVersion() : '1.4.0';
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

  logDebug(`[FakeDC] Iniciando cliente desktop v${currentVersion}`);
  logDebug(`[FakeDC] Servidor conectado: ${serverUrl}`);

  // Aguarda janela de splash carregar DOM
  await new Promise(r => setTimeout(r, 600));

  try {
    const updateResult = await checkAndApplyUpdates({
      currentVersion,
      serverUrl,
      onStatus: (status) => {
        logDebug('[Updater Status]', status);
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
      logDebug('[FakeDC] Atualização baixada. Iniciando instalador...');
      launchInstallerAndExit(updateResult.installerPath);
      return;
    }
  } catch (err) {
    logDebug('[FakeDC] Erro ao verificar atualizações:', err.message);
  }

  logDebug('[FakeDC] Agendando createMainWindow em 800ms...');
  // Transição suave para a janela principal
  setTimeout(() => {
    logDebug('[FakeDC] Chamando createMainWindow...');
    createMainWindow(serverUrl);
  }, 800);
}

// Restaura e foca a janela principal
function showMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
}

// Cria o ícone e menu de contexto na bandeja do sistema (Windows System Tray)
function createTray() {
  if (tray && !tray.isDestroyed()) return;

  const trayIconPath = fs.existsSync(appIconPath) ? appIconPath : undefined;
  if (!trayIconPath) {
    logDebug('[Tray] Ícone não encontrado para a bandeja:', appIconPath);
    return;
  }

  try {
    tray = new Tray(trayIconPath);
    tray.setToolTip('FakeDC');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Abrir FakeDC',
        click: () => {
          showMainWindow();
        }
      },
      { type: 'separator' },
      {
        label: 'Sair do FakeDC',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      showMainWindow();
    });

    tray.on('double-click', () => {
      showMainWindow();
    });

    logDebug('[Tray] Bandeja do sistema configurada com sucesso.');
  } catch (err) {
    logDebug('[Tray] Erro ao criar ícone na bandeja:', err.message);
  }
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
  createTray();

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
    if (win) {
      if (win === splashWindow) {
        isQuitting = true;
        app.quit();
      } else {
        win.close();
      }
    }
  });

  ipcMain.handle('window:is-maximized', () => {
    const win = getActiveWindow();
    return win ? win.isMaximized() : false;
  });

  ipcMain.handle('app:get-version', () => {
    return getAppVersion();
  });

  ipcMain.handle('app:check-for-updates', async () => {
    try {
      const currentVersion = getAppVersion();
      const serverUrl = config.serverUrl || 'https://jogosbolados.duckdns.org';
      logDebug('[FakeDC] Verificação manual de atualizações solicitada...');
      const updateResult = await checkAndApplyUpdates({
        currentVersion,
        serverUrl,
        force: true,
        onStatus: (status) => {
          logDebug('[FakeDC Update Status]', status);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('updater:status', status);
          }
        },
        onProgress: (progress) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('updater:progress', progress);
          }
        }
      });

      if (updateResult && updateResult.updateAvailable && updateResult.installerPath) {
        logDebug('[FakeDC] Atualização encontrada! Iniciando instalador:', updateResult.installerPath);
        launchInstallerAndExit(updateResult.installerPath);
        return { updateAvailable: true, message: 'Nova versão baixada! Reiniciando para atualizar...' };
      }
      return { updateAvailable: false, message: `Seu aplicativo já está atualizado (v${currentVersion})!` };
    } catch (err) {
      logDebug('[FakeDC] Erro ao verificar atualização manual:', err.message);
      return { updateAvailable: false, error: err.message, message: 'Não foi possível verificar atualizações no momento.' };
    }
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

  // Handlers de Área de Transferência (Clipboard Nativo)
  ipcMain.handle('electron:copy-image', async (event, { url, dataUrl }) => {
    try {
      let img = null;
      if (dataUrl && dataUrl.startsWith('data:image')) {
        img = nativeImage.createFromDataURL(dataUrl);
      } else if (url) {
        if (url.startsWith('data:image')) {
          img = nativeImage.createFromDataURL(url);
        } else if (url.startsWith('http://') || url.startsWith('https://')) {
          const client = url.startsWith('https://') ? require('https') : require('http');
          const buf = await new Promise((resolve, reject) => {
            client.get(url, { rejectUnauthorized: false }, (res) => {
              if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                let loc = res.headers.location;
                if (loc.startsWith('/')) {
                  const u = new URL(url);
                  loc = `${u.origin}${loc}`;
                }
                const cl = loc.startsWith('https://') ? require('https') : require('http');
                cl.get(loc, { rejectUnauthorized: false }, (res2) => {
                  const chunks2 = [];
                  res2.on('data', c => chunks2.push(c));
                  res2.on('end', () => resolve(Buffer.concat(chunks2)));
                  res2.on('error', reject);
                }).on('error', reject);
                return;
              }
              const chunks = [];
              res.on('data', c => chunks.push(c));
              res.on('end', () => resolve(Buffer.concat(chunks)));
              res.on('error', reject);
            }).on('error', reject);
          });
          img = nativeImage.createFromBuffer(buf);
        } else if (fs.existsSync(url)) {
          img = nativeImage.createFromPath(url);
        }
      }

      if (img && !img.isEmpty()) {
        clipboard.writeImage(img);
        return { success: true };
      }
      return { success: false, error: 'Imagem vazia ou inválida' };
    } catch (err) {
      console.error('[Electron] Erro ao copiar imagem para clipboard:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('electron:copy-text', (event, text) => {
    try {
      clipboard.writeText(text || '');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
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
    if (mainWindow && !mainWindow.isDestroyed()) {
      showMainWindow();
    } else if (BrowserWindow.getAllWindows().length === 0) {
      startApplication();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  logDebug('EVENT will-quit disparado!');
  globalShortcut.unregisterAll();
  if (tray && !tray.isDestroyed()) {
    try { tray.destroy(); } catch (e) {}
    tray = null;
  }
});

app.on('window-all-closed', () => {
  logDebug('EVENT window-all-closed disparado! mainWindow existe?', !!(mainWindow && !mainWindow.isDestroyed()));
  if (mainWindow && !mainWindow.isDestroyed()) return;
  if (isQuitting || process.platform !== 'darwin') {
    logDebug('Executando app.quit() via window-all-closed');
    app.quit();
  }
});
