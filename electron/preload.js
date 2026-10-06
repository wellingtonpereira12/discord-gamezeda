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

  // Controles de Janela
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // Obter versão
  getVersion: () => ipcRenderer.invoke('app:get-version')
});
