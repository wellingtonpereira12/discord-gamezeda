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
  onOpenScreenPicker: (callback) => {
    ipcRenderer.on('electron:open-screen-picker', (event, sources) => callback(sources));
  },
  selectScreenSource: (sourceId) => ipcRenderer.send('electron:screen-source-selected', sourceId),
  cancelScreenPicker: () => ipcRenderer.send('electron:screen-picker-cancelled'),

  // Obter versão
  getVersion: () => ipcRenderer.invoke('app:get-version')
});
