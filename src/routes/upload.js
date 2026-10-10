import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { addSoundboardSound, getSoundboardSounds, updateSoundboardSound, deleteSoundboardSound } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '../../public');

const soundsUploadDir = path.join(publicDir, 'uploads/sounds');
const chatUploadDir = path.join(publicDir, 'uploads/chat');
const avatarsUploadDir = path.join(publicDir, 'uploads/avatars');
const serversUploadDir = path.join(publicDir, 'uploads/servers');

[soundsUploadDir, chatUploadDir, avatarsUploadDir, serversUploadDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarsUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `avatar-${Date.now()}-${Math.random().toString(36).substring(2, 7)}${ext}`;
    cb(null, safeName);
  }
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB máx para avatar
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de imagem inválido! Use PNG, JPG, GIF ou WEBP.'));
    }
  }
});

const soundStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, soundsUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `sfx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}${ext}`;
    cb(null, safeName);
  }
});

const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, chatUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}${ext}`;
    cb(null, safeName);
  }
});

const uploadSound = multer({
  storage: soundStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB máx para som
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp3', '.wav', '.ogg', '.m4a', '.webm'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de áudio não suportado! Use MP3, WAV, OGG ou WEBM.'));
    }
  }
});

const uploadChat = multer({
  storage: chatStorage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB para arquivos de chat
});

export const uploadRouter = express.Router();

// Helper para resolver URL de áudio ou link de página do Myinstants
async function resolveAudioUrl(inputUrl) {
  let targetUrl = (inputUrl || '').trim();
  let title = '';

  if (targetUrl.includes('myinstants.com') && !targetUrl.includes('/media/sounds/')) {
    try {
      const parsed = new URL(targetUrl);
      const match = parsed.pathname.match(/\/instant\/([^/?#]+)/);
      if (match) {
        const slug = match[1];
        const cleanSlug = slug.replace(/-\d+$/, '');
        title = cleanSlug.replace(/[-_]+/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        const candidates = [
          `https://www.myinstants.com/media/sounds/${cleanSlug}.mp3`,
          `https://www.myinstants.com/media/sounds/${slug}.mp3`,
          `https://www.myinstants.com/media/sounds/${cleanSlug.replace(/-/g, '_')}.mp3`,
          `https://www.myinstants.com/media/sounds/${slug.replace(/-/g, '_')}.mp3`
        ];

        for (const cand of candidates) {
          try {
            const head = await fetch(cand, {
              method: 'HEAD',
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
              signal: AbortSignal.timeout(3500)
            });
            if (head.status === 200) {
              targetUrl = cand;
              break;
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
  } else {
    try {
      const parsed = new URL(targetUrl);
      const filename = path.basename(parsed.pathname);
      const withoutExt = filename.replace(/\.[a-zA-Z0-9]+$/, '');
      if (withoutExt) {
        title = withoutExt.replace(/[-_]+/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
    } catch (e) {}
  }

  return { audioUrl: targetUrl, title };
}

// Resolver URL de som (Myinstants ou áudio direto) para teste e prévia rápida
uploadRouter.get('/soundboard/resolve-url', async (req, res) => {
  try {
    const rawUrl = req.query.url;
    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.startsWith('http')) {
      return res.status(400).json({ error: 'URL inválida. Forneça um link válido iniciado por http:// ou https://.' });
    }
    const resolved = await resolveAudioUrl(rawUrl);
    res.json({ success: true, audioUrl: resolved.audioUrl, title: resolved.title });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar sons do Soundboard (filtrado por servidor/guildId)
uploadRouter.get('/soundboard', async (req, res) => {
  try {
    const guildId = req.query.guildId || req.query.guild_id || 'gamezeda';
    const sounds = await getSoundboardSounds(guildId);
    res.json({ success: true, sounds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cadastrar novo som no Soundboard (upload de arquivo)
uploadRouter.post('/soundboard', uploadSound.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo de áudio enviado.' });
    }

    const { name, emoji, created_by, guild_id, guildId } = req.body;
    const cleanGuildId = (guild_id || guildId || 'gamezeda').trim().substring(0, 64);
    const cleanName = (name || 'Efeito Sonoro').trim().substring(0, 40);
    const cleanEmoji = (emoji || '🔊').trim().substring(0, 8);
    const cleanCreator = (created_by || 'Usuário').trim().substring(0, 30);
    const fileUrl = `/uploads/sounds/${req.file.filename}`;

    const newSound = await addSoundboardSound({
      id: `sfx-${Date.now()}`,
      guild_id: cleanGuildId,
      name: cleanName,
      emoji: cleanEmoji,
      file_url: fileUrl,
      created_by: cleanCreator
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('soundboard:added', { sound: newSound, guildId: cleanGuildId });
    }

    res.json({ success: true, sound: newSound });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Importar som por URL (Myinstants ou link direto de áudio)
uploadRouter.post('/soundboard/import-url', async (req, res) => {
  try {
    const { url, name, emoji, created_by, guild_id, guildId } = req.body;
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return res.status(400).json({ error: 'URL inválida. Forneça um link válido iniciado por http:// ou https://.' });
    }

    const cleanGuildId = (guild_id || guildId || 'gamezeda').trim().substring(0, 64);
    const resolved = await resolveAudioUrl(url);
    const targetUrl = resolved.audioUrl;

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) {
      return res.status(400).json({ error: `Não foi possível baixar o áudio da URL informada (HTTP ${response.status}).` });
    }

    const contentType = response.headers.get('content-type') || '';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'O áudio excede o limite máximo permitido de 5 MB.' });
    }

    if (buffer.length < 500) {
      return res.status(400).json({ error: 'O arquivo baixado é inválido ou está corrompido.' });
    }

    // Identifica extensão
    let ext = '.mp3';
    try {
      const parsed = new URL(targetUrl);
      const urlExt = path.extname(parsed.pathname).toLowerCase();
      if (['.mp3', '.wav', '.ogg', '.m4a', '.webm'].includes(urlExt)) {
        ext = urlExt;
      } else if (contentType.includes('audio/wav')) {
        ext = '.wav';
      } else if (contentType.includes('audio/ogg')) {
        ext = '.ogg';
      }
    } catch (e) {}

    const filename = `sfx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}${ext}`;
    const filePath = path.join(soundsUploadDir, filename);
    await fs.promises.writeFile(filePath, buffer);

    const cleanName = (name || resolved.title || 'Efeito Sonoro').trim().substring(0, 40);
    const cleanEmoji = (emoji || '🔊').trim().substring(0, 8);
    const cleanCreator = (created_by || 'Usuário').trim().substring(0, 30);
    const fileUrl = `/uploads/sounds/${filename}`;

    const newSound = await addSoundboardSound({
      id: `sfx-${Date.now()}`,
      guild_id: cleanGuildId,
      name: cleanName,
      emoji: cleanEmoji,
      file_url: fileUrl,
      created_by: cleanCreator
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('soundboard:added', { sound: newSound, guildId: cleanGuildId });
    }

    res.json({ success: true, sound: newSound });
  } catch (err) {
    console.error('[Soundboard Import URL Error]:', err);
    res.status(500).json({ error: err.message || 'Erro ao importar som da URL.' });
  }
});

// Excluir som do Soundboard
uploadRouter.delete('/soundboard/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteSoundboardSound(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Som não encontrado.' });
    }

    if (deleted.file_url && deleted.file_url.startsWith('/uploads/sounds/')) {
      const filename = path.basename(deleted.file_url);
      const filePath = path.join(soundsUploadDir, filename);
      fs.promises.unlink(filePath).catch(() => {});
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('soundboard:deleted', { soundId: id, guildId: deleted.guild_id || 'gamezeda' });
    }

    res.json({ success: true, message: 'Som excluído com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Editar som existente no Soundboard (nome, emoji e opcionalmente novo áudio)
async function handleSoundEdit(req, res) {
  try {
    const { id } = req.params;
    const { name, emoji } = req.body;

    const cleanName = name !== undefined ? name.trim().substring(0, 40) : undefined;
    const cleanEmoji = emoji !== undefined ? emoji.trim().substring(0, 8) : undefined;
    const fileUrl = req.file ? `/uploads/sounds/${req.file.filename}` : undefined;

    const updatedSound = await updateSoundboardSound({
      id,
      name: cleanName,
      emoji: cleanEmoji,
      file_url: fileUrl
    });

    if (!updatedSound) {
      return res.status(404).json({ error: 'Efeito sonoro não encontrado.' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('soundboard:updated', { sound: updatedSound, guildId: updatedSound.guild_id || 'gamezeda' });
    }

    res.json({ success: true, sound: updatedSound });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

uploadRouter.post('/soundboard/:id/edit', uploadSound.single('audio'), handleSoundEdit);
uploadRouter.put('/soundboard/:id', uploadSound.single('audio'), handleSoundEdit);

// Upload de avatar personalizado do usuário
uploadRouter.post('/user/avatar', uploadAvatar.single('avatar'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
    }
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    res.json({
      success: true,
      url: avatarUrl,
      filename: req.file.filename
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload de anexo para o Chat
uploadRouter.post('/chat-file', uploadChat.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }
    const fileUrl = `/uploads/chat/${req.file.filename}`;
    res.json({
      success: true,
      url: fileUrl,
      filename: req.file.originalname,
      size: req.file.size
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload de Ícone de Servidor (Guild Icon)
const serverIconStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, serversUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `server-${Date.now()}-${Math.random().toString(36).substring(2, 7)}${ext}`;
    cb(null, safeName);
  }
});

const uploadServerIcon = multer({
  storage: serverIconStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB máx
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de imagem inválido! Use PNG, JPG, GIF ou WEBP.'));
    }
  }
});

uploadRouter.post('/upload/server-icon', uploadServerIcon.single('icon'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
    }
    const serverIconUrl = `/uploads/servers/${req.file.filename}`;
    res.json({
      success: true,
      url: serverIconUrl,
      filename: req.file.filename
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


