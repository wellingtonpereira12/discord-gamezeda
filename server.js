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
app.use(express.static(path.join(__dirname, 'public')));

// Rotas de Upload e Soundboard API
app.use('/api', uploadRouter);

// Inicialização do Banco MariaDB
await initDatabase();

// Configuração do Socket.IO
setupSockets(io);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🎮 DISCORD CLONE (gamezeda) ONLINE NA PORTA ${PORT}!`);
  console.log(`=======================================================`);
});
