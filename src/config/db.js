import mysql from 'mysql2/promise';
import crypto from 'crypto';

const DB_HOST = process.env.DB_HOST || 'host.docker.internal';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'discord_user';
const DB_PASSWORD = process.env.DB_PASSWORD || 'DiscordGamezeda2026!';
const DB_NAME = process.env.DB_NAME || 'discord_gamezeda';

let pool = null;
let isConnected = false;

// Fallback em memória caso o banco esteja indisponível
const memoryStore = {
  users: {}, // username_lower -> { id, username, password_hash, avatar, devices: [] }
  channels: [
    'geral', 'links', 'meme-imagem-videos', 'musicas',
    'novo-video-youtube', 'clips-twitch', 'blogger',
    'informacoes-eventos-regras', 'nova-live', 'vendo-mousepad',
    'to-sem-mic'
  ],
  messages: {},
  soundboard: [
    {
      id: 'default-airhorn',
      name: 'Buzina',
      emoji: '📯',
      file_url: '/assets/sounds/airhorn.mp3',
      created_by: 'Sistema'
    },
    {
      id: 'default-cricket',
      name: 'Grilo',
      emoji: '🦗',
      file_url: '/assets/sounds/cricket.mp3',
      created_by: 'Sistema'
    },
    {
      id: 'default-applause',
      name: 'Palmas',
      emoji: '👏',
      file_url: '/assets/sounds/applause.mp3',
      created_by: 'Sistema'
    }
  ]
};

memoryStore.channels.forEach(ch => {
  memoryStore.messages[ch] = [];
});

export async function initDatabase() {
  try {
    console.log(`[*] Conectando ao MariaDB em ${DB_HOST}:${DB_PORT}/${DB_NAME}...`);
    pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 5000
    });

    const conn = await pool.getConnection();
    console.log('[+] Conectado com sucesso ao MariaDB!');
    isConnected = true;

    // Criação das tabelas
    await conn.query(`
      CREATE TABLE IF NOT EXISTS channels (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(20) DEFAULT 'text',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(64) PRIMARY KEY,
        channel_id VARCHAR(64) NOT NULL,
        sender_name VARCHAR(64) NOT NULL,
        avatar VARCHAR(255),
        is_system BOOLEAN DEFAULT FALSE,
        text TEXT NOT NULL,
        attachment_url VARCHAR(255) NULL,
        timestamp VARCHAR(64) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_channel_created (channel_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS soundboard_sounds (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(64) NOT NULL,
        emoji VARCHAR(32) NOT NULL,
        file_url VARCHAR(255) NOT NULL,
        created_by VARCHAR(64) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        username VARCHAR(64) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NULL,
        avatar VARCHAR(255) NULL,
        devices JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Semeia canais iniciais se a tabela estiver vazia
    const [rows] = await conn.query('SELECT COUNT(*) as count FROM channels');
    if (rows[0].count === 0) {
      console.log('[*] Populando canais padrão no MariaDB...');
      for (const ch of memoryStore.channels) {
        await conn.query('INSERT IGNORE INTO channels (id, name, type) VALUES (?, ?, ?)', [ch, ch, 'text']);
      }
    }

    // Semeia sons iniciais no Soundboard se vazio
    const [soundRows] = await conn.query('SELECT COUNT(*) as count FROM soundboard_sounds');
    if (soundRows[0].count === 0) {
      for (const s of memoryStore.soundboard) {
        await conn.query(
          'INSERT IGNORE INTO soundboard_sounds (id, name, emoji, file_url, created_by) VALUES (?, ?, ?, ?, ?)',
          [s.id, s.name, s.emoji, s.file_url, s.created_by]
        );
      }
    }

    conn.release();
    return true;
  } catch (err) {
    console.warn(`[!] MariaDB não disponível (${err.message}). Operando em modo de memória.`);
    isConnected = false;
    return false;
  }
}

export async function getChannels() {
  if (!isConnected || !pool) return memoryStore.channels;
  try {
    const [rows] = await pool.query('SELECT id FROM channels ORDER BY created_at ASC');
    return rows.map(r => r.id);
  } catch (e) {
    return memoryStore.channels;
  }
}

export async function saveMessage({ id, channelId, sender, avatar, isSystem, text, attachmentUrl, timestamp }) {
  const msgObj = {
    id,
    channelId,
    sender,
    avatar,
    isSystem: !!isSystem,
    text,
    attachmentUrl: attachmentUrl || null,
    timestamp
  };

  if (!memoryStore.messages[channelId]) {
    memoryStore.messages[channelId] = [];
  }
  memoryStore.messages[channelId].push(msgObj);
  if (memoryStore.messages[channelId].length > 100) memoryStore.messages[channelId].shift();

  if (isConnected && pool) {
    try {
      await pool.query(
        `INSERT INTO messages (id, channel_id, sender_name, avatar, is_system, text, attachment_url, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, channelId, sender, avatar, isSystem ? 1 : 0, text, attachmentUrl || null, timestamp]
      );
    } catch (e) {
      console.warn('Erro ao salvar mensagem no MariaDB:', e.message);
    }
  }
  return msgObj;
}

export async function getChannelMessages(channelId, limit = 50) {
  if (isConnected && pool) {
    try {
      const [rows] = await pool.query(
        `SELECT id, channel_id as channelId, sender_name as sender, avatar, is_system as isSystem, text, attachment_url as attachmentUrl, timestamp
         FROM messages WHERE channel_id = ? ORDER BY created_at DESC LIMIT ?`,
        [channelId, limit]
      );
      return rows.reverse().map(r => ({
        ...r,
        isSystem: !!r.isSystem
      }));
    } catch (e) {
      console.warn('Erro ao carregar mensagens do MariaDB:', e.message);
    }
  }
  return memoryStore.messages[channelId] || [];
}

export async function getAllMessagesByChannel() {
  const channels = await getChannels();
  const result = {};
  for (const ch of channels) {
    result[ch] = await getChannelMessages(ch, 50);
  }
  return result;
}

export async function getSoundboardSounds() {
  if (isConnected && pool) {
    try {
      const [rows] = await pool.query('SELECT * FROM soundboard_sounds ORDER BY created_at ASC');
      return rows;
    } catch (e) {
      console.warn('Erro ao carregar soundboard do MariaDB:', e.message);
    }
  }
  return memoryStore.soundboard;
}

export async function addSoundboardSound({ id, name, emoji, file_url, created_by }) {
  const sound = { id, name, emoji, file_url, created_by };
  memoryStore.soundboard.push(sound);

  if (isConnected && pool) {
    try {
      await pool.query(
        'INSERT INTO soundboard_sounds (id, name, emoji, file_url, created_by) VALUES (?, ?, ?, ?, ?)',
        [id, name, emoji, file_url, created_by]
      );
    } catch (e) {
      console.warn('Erro ao salvar som no MariaDB:', e.message);
    }
  }
  return sound;
}

// ==========================================
// MÉTODOS DE USUÁRIOS E AUTENTICAÇÃO
// ==========================================
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHash] = parts;
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

export async function findUser(username) {
  const clean = (username || '').trim();
  const lower = clean.toLowerCase();

  if (isConnected && pool) {
    try {
      const [rows] = await pool.query(
        'SELECT id, username, password_hash, avatar, devices, created_at FROM users WHERE LOWER(username) = ? LIMIT 1',
        [lower]
      );
      if (rows.length > 0) {
        const u = rows[0];
        let devicesArr = [];
        try {
          devicesArr = typeof u.devices === 'string' ? JSON.parse(u.devices || '[]') : (u.devices || []);
        } catch (e) {
          devicesArr = [];
        }
        return {
          id: u.id,
          username: u.username,
          password_hash: u.password_hash,
          avatar: u.avatar,
          devices: Array.isArray(devicesArr) ? devicesArr : []
        };
      }
    } catch (e) {
      console.warn('Erro ao buscar usuário no MariaDB:', e.message);
    }
  }

  return memoryStore.users[lower] || null;
}

export async function saveUser({ id, username, password_hash = null, avatar = '', deviceId = null }) {
  const clean = (username || '').trim();
  const lower = clean.toLowerCase();
  const userId = id || `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const devices = deviceId ? [deviceId] : [];

  const userObj = {
    id: userId,
    username: clean,
    password_hash,
    avatar,
    devices
  };

  memoryStore.users[lower] = userObj;

  if (isConnected && pool) {
    try {
      await pool.query(
        `INSERT INTO users (id, username, password_hash, avatar, devices)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           avatar = VALUES(avatar),
           devices = VALUES(devices)`,
        [userId, clean, password_hash, avatar, JSON.stringify(devices)]
      );
    } catch (e) {
      console.warn('Erro ao salvar usuário no MariaDB:', e.message);
    }
  }

  return userObj;
}

export async function setUserPassword(username, passwordHash, deviceId = null) {
  const clean = (username || '').trim();
  const lower = clean.toLowerCase();
  let user = await findUser(clean);

  if (!user) {
    user = await saveUser({ username: clean, password_hash: passwordHash, deviceId });
    return user;
  }

  user.password_hash = passwordHash;
  if (deviceId && !user.devices.includes(deviceId)) {
    user.devices.push(deviceId);
  }
  memoryStore.users[lower] = user;

  if (isConnected && pool) {
    try {
      await pool.query(
        'UPDATE users SET password_hash = ?, devices = ? WHERE LOWER(username) = ?',
        [passwordHash, JSON.stringify(user.devices), lower]
      );
    } catch (e) {
      console.warn('Erro ao atualizar senha no MariaDB:', e.message);
    }
  }

  return user;
}

export async function addAuthorizedDevice(username, deviceId) {
  if (!deviceId) return;
  const clean = (username || '').trim();
  const lower = clean.toLowerCase();
  const user = await findUser(clean);
  if (!user) return;

  if (!user.devices.includes(deviceId)) {
    user.devices.push(deviceId);
    memoryStore.users[lower] = user;

    if (isConnected && pool) {
      try {
        await pool.query(
          'UPDATE users SET devices = ? WHERE LOWER(username) = ?',
          [JSON.stringify(user.devices), lower]
        );
      } catch (e) {
        console.warn('Erro ao registrar dispositivo no MariaDB:', e.message);
      }
    }
  }
}

export async function removeAuthorizedDevice(username, deviceId) {
  if (!deviceId) return;
  const clean = (username || '').trim();
  const lower = clean.toLowerCase();
  const user = await findUser(clean);
  if (!user || !user.devices) return;

  if (user.devices.includes(deviceId)) {
    user.devices = user.devices.filter(d => d !== deviceId);
    if (memoryStore.users[lower]) {
      memoryStore.users[lower].devices = user.devices;
    }

    if (isConnected && pool) {
      try {
        await pool.query(
          'UPDATE users SET devices = ? WHERE LOWER(username) = ?',
          [JSON.stringify(user.devices), lower]
        );
      } catch (e) {
        console.warn('Erro ao desautorizar dispositivo no MariaDB:', e.message);
      }
    }
  }
}
