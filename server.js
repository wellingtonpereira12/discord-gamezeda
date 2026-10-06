import express from 'express';
import http from 'http';
import https from 'https';
import fs from 'fs';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDatabase } from './src/config/db.js';
import { uploadRouter } from './src/routes/upload.js';
import { setupSockets } from './src/sockets/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

let server;
const keyPath = path.join(__dirname, 'key.pem');
const certPath = path.join(__dirname, 'cert.pem');

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log('[+] SSL ativo! Iniciando HTTPS.');
  server = https.createServer({
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  }, app);
} else {
  console.log('[!] Sem SSL. Iniciando HTTP.');
  server = http.createServer(app);
}

const io = new Server(server, {
  cors: { origin: "*" }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Força no-cache em desenvolvimento e deploy contínuo
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  maxAge: 0
}));

// Rotas de Upload e Soundboard API
app.use('/api', uploadRouter);

// Rota de consulta de versão do Cliente Desktop Electron
app.get('/api/desktop/version', (req, res) => {
  const versionFilePath = path.join(__dirname, 'public', 'version.json');
  if (fs.existsSync(versionFilePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));
      return res.json(data);
    } catch (e) {
      console.error('Erro ao ler public/version.json:', e);
    }
  }
  return res.json({
    name: 'Jogos Bolados',
    version: '1.0.0',
    downloadUrl: '/download/windows',
    installerName: 'Jogos-Bolados-Setup.exe'
  });
});

// Rota de Download do Executável Windows (Jogos Bolados PC)
app.get('/download/windows', (req, res) => {
  const localExePath = path.join(__dirname, 'public', 'downloads', 'Jogos-Bolados-Setup.exe');
  if (fs.existsSync(localExePath)) {
    return res.download(localExePath, 'Jogos-Bolados-Setup.exe');
  }
  // Se ainda não existir localmente no container, redireciona para a release mais recente no GitHub
  const githubReleaseUrl = 'https://github.com/wellingtonpereira12/discord-gamezeda/releases/latest/download/Jogos-Bolados-Setup.exe';
  return res.redirect(302, githubReleaseUrl);
});

// Rota de Download do Aplicativo Android (APK)
app.get('/download/android', (req, res) => {
  const localApkPath = path.join(__dirname, 'public', 'downloads', 'Jogos-Bolados.apk');
  if (fs.existsSync(localApkPath)) {
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    return res.download(localApkPath, 'Jogos-Bolados.apk');
  }
  // Fallback: Redireciona para o release mais recente no GitHub
  const githubReleaseUrl = 'https://github.com/wellingtonpereira12/discord-gamezeda/releases/latest/download/Jogos-Bolados.apk';
  return res.redirect(302, githubReleaseUrl);
});

// Rota de Download / Acesso do Aplicativo iOS
app.get('/download/ios', (req, res) => {
  const localIpaPath = path.join(__dirname, 'public', 'downloads', 'Jogos-Bolados.ipa');
  if (fs.existsSync(localIpaPath)) {
    return res.download(localIpaPath, 'Jogos-Bolados.ipa');
  }
  // Fallback: Redireciona para o release mais recente ou Expo
  const githubReleaseUrl = 'https://github.com/wellingtonpereira12/discord-gamezeda/releases/latest/download/Jogos-Bolados.ipa';
  return res.redirect(302, githubReleaseUrl);
});

// Rota de Informações de Versão Mobile
app.get('/api/mobile/version', (req, res) => {
  return res.json({
    name: 'Jogos Bolados Mobile',
    version: '1.0.0',
    android: {
      downloadUrl: '/download/android',
      filename: 'Jogos-Bolados.apk'
    },
    ios: {
      downloadUrl: '/download/ios',
      filename: 'Jogos-Bolados.ipa'
    }
  });
});

// Inicialização do Banco MariaDB
await initDatabase();

// Configuração do Socket.IO
setupSockets(io);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🎮 DISCORD CLONE (gamezeda) ONLINE NA PORTA ${PORT}!`);
  console.log(`=======================================================`);
});
