const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,

  // Eventos do Sistema de Atualização
  onUpdaterStatus: (callback) => {
    ipcRenderer.on('updater:status', (event, data) => callback(data));
  },
  onUpdaterProgress: (callback) => {
    ipcRenderer.on('updater:progress', (event, data) => callback(data));
  },
  onUpdaterReady: (callback) => {
    ipcRenderer.on('updater:ready', (event, data) => callback(data));
  },

  // Controles de Janela Personalizada (Minimizar, Maximizar / Tela Cheia, Fechar)
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onMaximizedChange: (callback) => {
    ipcRenderer.on('window:maximized-change', (event, isMax) => callback(isMax));
  },

  // Seletor de Telas e Janelas (Screen Share HD)
  getScreenSources: () => ipcRenderer.invoke('electron:get-screen-sources'),
  onOpenScreenPicker: (callback) => {
    ipcRenderer.on('electron:open-screen-picker', (event, sources) => callback(sources));
  },
  selectScreenSource: (sourceId) => ipcRenderer.send('electron:screen-source-selected', sourceId),
  cancelScreenPicker: () => ipcRenderer.send('electron:screen-picker-cancelled'),

  // Obter versão e atualização manual
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  checkForUpdates: () => ipcRenderer.invoke('app:check-for-updates'),

  // Detecção Automática de Jogos (Discord Game Activity / Rich Presence)
  onGameActivity: (callback) => {
    ipcRenderer.on('electron:game-activity', (event, data) => callback(data));
  },
  getGameActivity: () => ipcRenderer.invoke('electron:get-game-activity'),

  // Atalhos Globais de Teclado (Discord Global Shortcuts)
  onShortcutToggleMic: (callback) => {
    ipcRenderer.on('shortcut:toggle-mic', () => callback());
  },
  onShortcutToggleDeaf: (callback) => {
    ipcRenderer.on('shortcut:toggle-deaf', () => callback());
  },

  // Notificações Nativas e Foco na Barra de Tarefas (Fase 4)
  flashFrame: (flag) => ipcRenderer.send('window:flash-frame', flag),
  showFocus: () => ipcRenderer.send('window:show-focus'),
  showNotification: (data) => ipcRenderer.send('notification:show', data),
  onNotificationClicked: (callback) => {
    ipcRenderer.on('notification:clicked', (event, data) => callback(data));
  }
});
