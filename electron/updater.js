const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
let electronApp = null;
try {
  electronApp = require('electron').app;
} catch (e) {
  // Fora do runtime do Electron (ex: testes de unidade)
}

/**
 * Compara versões semver simples (ex: "1.0.1" vs "1.0.0")
 * Retorna: 1 se v1 > v2, -1 se v1 < v2, 0 se iguais
 */
function compareVersions(v1, v2) {
  if (!v1 || !v2) return 0;
  const p1 = v1.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const p2 = v2.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const maxLen = Math.max(p1.length, p2.length);

  for (let i = 0; i < maxLen; i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Faz requisição HTTP/HTTPS com suporte a redirecionamento e certificados autoassinados
 */
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Jogos-Bolados-Desktop-Updater/1.0',
          'Accept': 'application/json'
        },
        rejectUnauthorized: false, // Permite SSL autoassinado do servidor VPS
        timeout: 8000
      };

      const req = client.request(options, (res) => {
        // Redirecionamento 301 / 302
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(fetchJson(res.headers.location));
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`Falha HTTP ${res.statusCode} ao consultar versão`));
        }

        let rawData = '';
        res.on('data', chunk => rawData += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(rawData);
            resolve(parsed);
          } catch (e) {
            reject(new Error(`Resposta JSON inválida: ${e.message}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout ao conectar no servidor de atualização'));
      });

      req.on('error', err => reject(err));
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Faz download de um arquivo com relatório de progresso contínuo
 */
function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Jogos-Bolados-Desktop-Updater/1.0'
        },
        rejectUnauthorized: false
      };

      const req = client.request(options, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let nextUrl = res.headers.location;
          if (nextUrl.startsWith('/')) {
            nextUrl = `${parsedUrl.origin}${nextUrl}`;
          }
          return resolve(downloadFile(nextUrl, destPath, onProgress));
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`Erro ao baixar instalador: status ${res.statusCode}`));
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
        let receivedBytes = 0;
        let lastReportTime = Date.now();
        let bytesSinceLastReport = 0;
        let downloadSpeed = 0; // Bytes por segundo

        const fileStream = fs.createWriteStream(destPath);

        res.on('data', (chunk) => {
          receivedBytes += chunk.length;
          bytesSinceLastReport += chunk.length;

          const now = Date.now();
          const elapsed = (now - lastReportTime) / 1000;
          if (elapsed >= 0.2) {
            downloadSpeed = bytesSinceLastReport / elapsed;
            bytesSinceLastReport = 0;
            lastReportTime = now;

            if (onProgress) {
              const percent = totalBytes > 0 ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100)) : 0;
              onProgress({
                percent,
                receivedBytes,
                totalBytes,
                speedBytes: Math.round(downloadSpeed)
              });
            }
          }
        });

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close(() => {
            if (onProgress) {
              onProgress({
                percent: 100,
                receivedBytes,
                totalBytes: totalBytes || receivedBytes,
                speedBytes: 0
              });
            }
            resolve(destPath);
          });
        });

        fileStream.on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      });

      req.on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });

      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

function getUpdaterStatePath() {
  try {
    if (electronApp && typeof electronApp.getPath === 'function') {
      return path.join(electronApp.getPath('userData'), 'updater-state.json');
    }
  } catch (e) {}
  return path.join(os.tmpdir(), 'jogos-bolados-updater-state.json');
}

function getUpdaterState() {
  try {
    const file = getUpdaterStatePath();
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (e) {}
  return {};
}

function saveUpdaterState(state) {
  try {
    const file = getUpdaterStatePath();
    fs.writeFileSync(file, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {}
}

/**
 * Verifica atualizações e faz download caso uma nova versão seja detectada
 */
async function checkAndApplyUpdates({ currentVersion, serverUrl, onStatus, onProgress }) {
  if (onStatus) onStatus({ step: 'checking', message: 'Verificando atualizações...' });

  let versionInfo = null;

  // 1. Tenta endpoint principal (/api/desktop/version)
  try {
    const versionUrl = `${serverUrl.replace(/\/+$/, '')}/api/desktop/version`;
    versionInfo = await fetchJson(versionUrl);
  } catch (err1) {
    // 2. Fallback para (/version.json)
    try {
      const fallbackUrl = `${serverUrl.replace(/\/+$/, '')}/version.json`;
      versionInfo = await fetchJson(fallbackUrl);
    } catch (err2) {
      console.warn('[Updater] Não foi possível obter versão remota:', err2.message);
      if (onStatus) onStatus({ step: 'up-to-date', message: 'Iniciando aplicação...' });
      return { updateAvailable: false };
    }
  }

  if (!versionInfo || !versionInfo.version) {
    if (onStatus) onStatus({ step: 'up-to-date', message: 'Iniciando FakeDC...' });
    return { updateAvailable: false };
  }

  const remoteVersion = versionInfo.version;
  console.log(`[Updater] Versão local: ${currentVersion} | Versão remota: ${remoteVersion}`);

  const state = getUpdaterState();
  if (state.lastAttemptedVersion && compareVersions(currentVersion, state.lastAttemptedVersion) >= 0) {
    saveUpdaterState({});
  }

  // Se versão remota é superior à atual
  if (compareVersions(remoteVersion, currentVersion) > 0) {
    // Proteção Anti-Loop: se a atualização falhou 3 ou mais vezes para a mesma versão
    if (state.lastAttemptedVersion === remoteVersion && (state.attemptCount || 0) >= 3) {
      const timeSinceAttempt = Date.now() - (state.lastAttemptTime || 0);
      if (timeSinceAttempt < 3 * 60 * 1000) { // 3 minutos
        console.warn(`[Updater] Atualização para v${remoteVersion} já foi tentada 3 vezes. Abrindo versão atual.`);
        if (onStatus) {
          onStatus({
            step: 'up-to-date',
            message: 'Iniciando FakeDC...',
            currentVersion
          });
        }
        return { updateAvailable: false };
      }
    }

    if (onStatus) {
      onStatus({
        step: 'downloading',
        message: `Nova versão encontrada (v${remoteVersion})! Baixando atualização...`,
        remoteVersion
      });
    }

    // Monta URL de download
    let downloadUrl = versionInfo.downloadUrl || '/download/windows';
    if (!downloadUrl.startsWith('http://') && !downloadUrl.startsWith('https://')) {
      downloadUrl = `${serverUrl.replace(/\/+$/, '')}${downloadUrl.startsWith('/') ? '' : '/'}${downloadUrl}`;
    }

    const installerBaseName = versionInfo.installerName ? versionInfo.installerName.replace(/\.exe$/i, '') : 'FakeDC-Setup';
    const tempInstaller = path.join(os.tmpdir(), `${installerBaseName}-v${remoteVersion}.exe`);

    try {
      await downloadFile(downloadUrl, tempInstaller, onProgress);

      if (onStatus) {
        onStatus({
          step: 'installing',
          message: 'Download concluído! Instalando nova versão...',
          remoteVersion
        });
      }

      saveUpdaterState({
        lastAttemptedVersion: remoteVersion,
        lastAttemptTime: Date.now(),
        attemptCount: (state.lastAttemptedVersion === remoteVersion ? (state.attemptCount || 0) : 0) + 1
      });

      return {
        updateAvailable: true,
        installerPath: tempInstaller,
        remoteVersion
      };
    } catch (err) {
      console.error('[Updater] Erro durante o download do instalador:', err);
      if (onStatus) onStatus({ step: 'error', message: 'Erro no download. Iniciando versão atual...' });
      return { updateAvailable: false, error: err };
    }
  } else {
    if (onStatus) {
      onStatus({
        step: 'up-to-date',
        message: 'Versão atualizada! Carregando...',
        currentVersion
      });
    }
    return { updateAvailable: false };
  }
}

/**
 * Executa o instalador baixado e encerra o aplicativo atual com liberação limpa de arquivos
 */
function launchInstallerAndExit(installerPath) {
  console.log(`[Updater] Executando instalador: ${installerPath}`);
  try {
    if (process.platform === 'win32') {
      // Espera 2 segundos para liberar locks de arquivos, executa com /S para instalação silenciosa e reabre o app
      const appExe = process.execPath;
      const cmd = `timeout /t 2 /nobreak >nul & "${installerPath}" /S & timeout /t 3 /nobreak >nul & start "" "${appExe}"`;
      const child = spawn('cmd.exe', ['/c', cmd], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      });
      child.unref();
    } else {
      const child = spawn(installerPath, [], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
    }

    setTimeout(() => {
      if (electronApp && typeof electronApp.quit === 'function') {
        electronApp.quit();
      }
    }, 600);
  } catch (e) {
    console.error('[Updater] Falha ao executar instalador:', e);
  }
}

module.exports = {
  compareVersions,
  checkAndApplyUpdates,
  launchInstallerAndExit
};
