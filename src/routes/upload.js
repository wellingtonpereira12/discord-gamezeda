import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { addSoundboardSound, getSoundboardSounds, updateSoundboardSound } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '../../public');

const soundsUploadDir = path.join(publicDir, 'uploads/sounds');
const chatUploadDir = path.join(publicDir, 'uploads/chat');
const avatarsUploadDir = path.join(publicDir, 'uploads/avatars');

[soundsUploadDir, chatUploadDir, avatarsUploadDir].forEach(dir => {
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

// Listar sons do Soundboard
uploadRouter.get('/soundboard', async (req, res) => {
  try {
    const sounds = await getSoundboardSounds();
    res.json({ success: true, sounds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cadastrar novo som no Soundboard
uploadRouter.post('/soundboard', uploadSound.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo de áudio enviado.' });
    }

    const { name, emoji, created_by } = req.body;
    const cleanName = (name || 'Efeito Sonoro').trim().substring(0, 40);
    const cleanEmoji = (emoji || '🔊').trim().substring(0, 8);
    const cleanCreator = (created_by || 'Usuário').trim().substring(0, 30);
    const fileUrl = `/uploads/sounds/${req.file.filename}`;

    const newSound = await addSoundboardSound({
      id: `sfx-${Date.now()}`,
      name: cleanName,
      emoji: cleanEmoji,
      file_url: fileUrl,
      created_by: cleanCreator
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('soundboard:added', newSound);
    }

    res.json({ success: true, sound: newSound });
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
      io.emit('soundboard:updated', updatedSound);
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


