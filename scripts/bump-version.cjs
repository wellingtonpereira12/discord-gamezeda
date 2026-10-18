const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const arg = (process.argv[2] || 'patch').trim().toLowerCase();

// 1. Ler versão atual do package.json
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const currentVersion = pkg.version || '1.0.0';

let [major, minor, patch] = [1, 0, 0];
const semverMatch = currentVersion.match(/^(\d+)\.(\d+)\.(\d+)/);
if (semverMatch) {
  major = parseInt(semverMatch[1], 10);
  minor = parseInt(semverMatch[2], 10);
  patch = parseInt(semverMatch[3], 10);
}

// 2. Calcular nova versão
let newVersion = '';
if (/^\d+\.\d+\.\d+$/.test(arg)) {
  newVersion = arg;
} else if (arg === 'major') {
  newVersion = `${major + 1}.0.0`;
} else if (arg === 'minor') {
  newVersion = `${major}.${minor + 1}.0`;
} else {
  // Padrão: patch
  newVersion = `${major}.${minor}.${patch + 1}`;
}

const todayStr = new Date().toISOString().slice(0, 10);
const dateTag = todayStr.replace(/-/g, '');

console.log(`[Version Bump] Atualizando versão de v${currentVersion} para v${newVersion}...`);

// 3. Atualizar package.json
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log(`[OK] package.json -> ${newVersion}`);

// 4. Atualizar electron/package.json
const electronPkgPath = path.join(rootDir, 'electron', 'package.json');
if (fs.existsSync(electronPkgPath)) {
  try {
    const electronPkg = JSON.parse(fs.readFileSync(electronPkgPath, 'utf8'));
    electronPkg.version = newVersion;
    fs.writeFileSync(electronPkgPath, JSON.stringify(electronPkg, null, 2) + '\n', 'utf8');
    console.log(`[OK] electron/package.json -> ${newVersion}`);
  } catch (err) {
    console.warn(`[WARN] Falha ao atualizar electron/package.json:`, err.message);
  }
}

// 5. Atualizar public/version.json
const versionJsonPath = path.join(rootDir, 'public', 'version.json');
if (fs.existsSync(versionJsonPath)) {
  try {
    const vJson = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
    vJson.version = newVersion;
    vJson.releaseDate = todayStr;
    vJson.notes = (process.env.RELEASE_NOTES && process.env.RELEASE_NOTES.trim())
      ? process.env.RELEASE_NOTES.trim()
      : `FakeDC v${newVersion}: Compilação e atualização automática via GitHub Actions.`;
    fs.writeFileSync(versionJsonPath, JSON.stringify(vJson, null, 2) + '\n', 'utf8');
    console.log(`[OK] public/version.json -> ${newVersion}`);
  } catch (err) {
    console.warn(`[WARN] Falha ao atualizar public/version.json:`, err.message);
  }
}

// 6. Atualizar public/index.html
const indexHtmlPath = path.join(rootDir, 'public', 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  try {
    let html = fs.readFileSync(indexHtmlPath, 'utf8');
    // Atualiza badge de versão nas configurações
    html = html.replace(/(<strong id="settings-app-version"[^>]*>)[^<]+(<\/strong>)/g, `$1v${newVersion}$2`);
    // Atualiza cache buster do app.js
    html = html.replace(/(src="app\.js\?v=)[^"]+(")/g, `$1${dateTag}_v${newVersion}$2`);
    fs.writeFileSync(indexHtmlPath, html, 'utf8');
    console.log(`[OK] public/index.html -> v${newVersion}`);
  } catch (err) {
    console.warn(`[WARN] Falha ao atualizar public/index.html:`, err.message);
  }
}

// 7. Atualizar public/app.js (cache buster desktopClient)
const appJsPath = path.join(rootDir, 'public', 'app.js');
if (fs.existsSync(appJsPath)) {
  try {
    let appJs = fs.readFileSync(appJsPath, 'utf8');
    appJs = appJs.replace(/(\.\/js\/modules\/desktopClient\.js\?v=)[^"']+/g, `$1${dateTag}_v${newVersion}`);
    fs.writeFileSync(appJsPath, appJs, 'utf8');
    console.log(`[OK] public/app.js cache buster -> ${dateTag}_v${newVersion}`);
  } catch (err) {
    console.warn(`[WARN] Falha ao atualizar public/app.js:`, err.message);
  }
}

// 8. Atualizar electron/main.js fallback
const mainJsPath = path.join(rootDir, 'electron', 'main.js');
if (fs.existsSync(mainJsPath)) {
  try {
    let mainJs = fs.readFileSync(mainJsPath, 'utf8');
    mainJs = mainJs.replace(/(return \(app && typeof app\.getVersion === 'function'\) \? app\.getVersion\(\) : ')[^']+(';)/g, `$1${newVersion}$2`);
    fs.writeFileSync(mainJsPath, mainJs, 'utf8');
    console.log(`[OK] electron/main.js fallback -> ${newVersion}`);
  } catch (err) {
    console.warn(`[WARN] Falha ao atualizar electron/main.js:`, err.message);
  }
}

// 9. Se estiver rodando dentro do GitHub Actions, expõe as variáveis de saída
if (process.env.GITHUB_OUTPUT) {
  try {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `VERSION=${newVersion}\nOLD_VERSION=${currentVersion}\n`, 'utf8');
  } catch (err) {
    console.warn(`[WARN] Não foi possível escrever em GITHUB_OUTPUT:`, err.message);
  }
}

console.log(`[SUCCESS] Versão atualizada com sucesso para ${newVersion}!`);
