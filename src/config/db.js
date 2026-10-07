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
  categories: [
    { id: 'cat-text', name: 'Canais de Texto', position: 0 },
    { id: 'cat-voice', name: 'Canais de Voz', position: 1 }
  ],
  channels: [
    { id: 'geral', name: 'geral', type: 'text', categoryId: 'cat-text', position: 0 },
    { id: 'links', name: 'links', type: 'text', categoryId: 'cat-text', position: 1 },
    { id: 'meme-imagem-videos', name: 'meme-imagem-videos', type: 'text', categoryId: 'cat-text', position: 2 },
    { id: 'musicas', name: 'musicas', type: 'text', categoryId: 'cat-text', position: 3 },
    { id: 'novo-video-youtube', name: 'novo-video-youtube', type: 'text', categoryId: 'cat-text', position: 4 },
    { id: 'clips-twitch', name: 'clips twitch', type: 'text', categoryId: 'cat-text', position: 5 },
    { id: 'blogger', name: 'blogger', type: 'text', categoryId: 'cat-text', position: 6 },
    { id: 'informacoes-eventos-regras', name: 'informações-eventos-regras', type: 'text', categoryId: 'cat-text', position: 7 },
    { id: 'nova-live', name: 'nova-live', type: 'text', categoryId: 'cat-text', position: 8 },
    { id: 'vendo-mousepad', name: 'vendo-mousepad', type: 'text', categoryId: 'cat-text', position: 9 },
    { id: 'to-sem-mic', name: 'to-sem-mic', type: 'text', categoryId: 'cat-text', position: 10 },
    { id: 'gamezeda', name: 'Gamezeda', type: 'voice', categoryId: 'cat-voice', position: 0 }
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
  if (ch.type === 'text') {
    memoryStore.messages[ch.id] = [];
  }
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
      connectTimeout: 5000,
      timezone: '-03:00'
    });

    const conn = await pool.getConnection();
    console.log('[+] Conectado com sucesso ao MariaDB!');
    isConnected = true;

    // Garante timezone -03:00 (Brasília) na sessão do MariaDB
    try {
      await conn.query("SET time_zone = '-03:00'");
    } catch (tzErr) {
      console.warn('[!] Falha ao definir time_zone no MariaDB:', tzErr.message);
    }

    // Criação das tabelas
    await conn.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        position INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS channels (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(20) DEFAULT 'text',
        category_id VARCHAR(64) DEFAULT 'cat-text',
        position INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Migração de colunas caso a tabela channels já existisse previamente
    try {
      await conn.query(`ALTER TABLE channels ADD COLUMN IF NOT EXISTS category_id VARCHAR(64) DEFAULT 'cat-text'`);
      await conn.query(`ALTER TABLE channels ADD COLUMN IF NOT EXISTS position INT DEFAULT 0`);
    } catch (e) {
      // Ignora caso já existam ou versão antiga de engine
    }

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
        reply_to JSON NULL,
        reactions JSON NULL,
        edited BOOLEAN DEFAULT FALSE,
        pinned BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_channel_created (channel_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Migrações seguras caso a tabela já existisse
    try { await conn.query('ALTER TABLE messages ADD COLUMN reply_to JSON NULL'); } catch (e) {}
    try { await conn.query('ALTER TABLE messages ADD COLUMN reactions JSON NULL'); } catch (e) {}
    try { await conn.query('ALTER TABLE messages ADD COLUMN edited BOOLEAN DEFAULT FALSE'); } catch (e) {}
    try { await conn.query('ALTER TABLE messages ADD COLUMN pinned BOOLEAN DEFAULT FALSE'); } catch (e) {}

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
        banner_color VARCHAR(32) DEFAULT '#5865F2',
        bio TEXT NULL,
        custom_status_text VARCHAR(128) NULL,
        status_mode VARCHAR(32) DEFAULT 'online',
        devices JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Migrações seguras de perfil para instalações existentes
    try { await conn.query("ALTER TABLE users ADD COLUMN banner_color VARCHAR(32) DEFAULT '#5865F2'"); } catch (e) {}
    try { await conn.query("ALTER TABLE users ADD COLUMN bio TEXT NULL"); } catch (e) {}
    try { await conn.query("ALTER TABLE users ADD COLUMN custom_status_text VARCHAR(128) NULL"); } catch (e) {}
    try { await conn.query("ALTER TABLE users ADD COLUMN status_mode VARCHAR(32) DEFAULT 'online'"); } catch (e) {}

    // Semeia categorias se a tabela estiver vazia
    const [catRows] = await conn.query('SELECT COUNT(*) as count FROM categories');
    if (catRows[0].count === 0) {
      console.log('[*] Populando categorias padrão no MariaDB...');
      for (const cat of memoryStore.categories) {
        await conn.query(
          'INSERT IGNORE INTO categories (id, name, position) VALUES (?, ?, ?)',
          [cat.id, cat.name, cat.position]
        );
      }
    }

    // Semeia canais iniciais se a tabela estiver vazia
    const [rows] = await conn.query('SELECT COUNT(*) as count FROM channels');
    if (rows[0].count === 0) {
      console.log('[*] Populando canais padrão no MariaDB...');
      for (const ch of memoryStore.channels) {
        await conn.query(
          'INSERT IGNORE INTO channels (id, name, type, category_id, position) VALUES (?, ?, ?, ?, ?)',
          [ch.id, ch.name, ch.type, ch.categoryId, ch.position]
        );
      }
    } else {
      // Garante integridade de dados e canal oficial de voz
      await conn.query("UPDATE channels SET category_id = 'cat-text' WHERE category_id IS NULL OR category_id = ''");
      await conn.query("INSERT IGNORE INTO channels (id, name, type, category_id, position) VALUES ('gamezeda', 'Gamezeda', 'voice', 'cat-voice', 0)");
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

// ==========================================
// CATEGORIAS & CANAIS
// ==========================================
export async function getCategories() {
  if (isConnected && pool) {
    try {
      const [rows] = await pool.query('SELECT id, name, position FROM categories ORDER BY position ASC, created_at ASC');
      if (rows && rows.length > 0) return rows;
    } catch (e) {
      console.warn('Erro ao obter categorias do MariaDB:', e.message);
    }
  }
  return [...memoryStore.categories];
}

export async function createCategory({ name }) {
  const cleanName = (name || '').trim();
  if (!cleanName) throw new Error('Nome da categoria é obrigatório.');

  let slug = cleanName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!slug) slug = 'cat-' + Date.now().toString(36);
  const id = `cat-${slug}-${Date.now().toString(36).substring(2, 6)}`;
  const position = memoryStore.categories.length;

  const catObj = { id, name: cleanName, position };
  memoryStore.categories.push(catObj);

  if (isConnected && pool) {
    try {
      await pool.query('INSERT INTO categories (id, name, position) VALUES (?, ?, ?)', [id, cleanName, position]);
    } catch (e) {
      console.warn('Erro ao salvar categoria no MariaDB:', e.message);
    }
  }
  return catObj;
}

export async function deleteCategory(categoryId) {
  memoryStore.categories = memoryStore.categories.filter(c => c.id !== categoryId);
  // Reatribui canais órfãos para cat-text
  memoryStore.channels.forEach(ch => {
    if (ch.categoryId === categoryId) {
      ch.categoryId = 'cat-text';
    }
  });

  if (isConnected && pool) {
    try {
      await pool.query("UPDATE channels SET category_id = 'cat-text' WHERE category_id = ?", [categoryId]);
      await pool.query('DELETE FROM categories WHERE id = ?', [categoryId]);
    } catch (e) {
      console.warn('Erro ao excluir categoria do MariaDB:', e.message);
    }
  }
  return true;
}

export async function getChannelsFull() {
  if (isConnected && pool) {
    try {
      const [rows] = await pool.query('SELECT id, name, type, category_id as categoryId, position FROM channels ORDER BY position ASC, created_at ASC');
      if (rows && rows.length > 0) return rows;
    } catch (e) {
      console.warn('Erro ao obter canais completos do MariaDB:', e.message);
    }
  }
  return [...memoryStore.channels];
}

export async function getChannels() {
  const full = await getChannelsFull();
  return full.filter(c => c.type === 'text').map(c => c.id);
}

export async function createChannel({ name, type = 'text', categoryId }) {
  const cleanName = (name || '').trim();
  if (!cleanName) throw new Error('Nome do canal é obrigatório.');
  const cleanType = type === 'voice' ? 'voice' : 'text';
  const defaultCat = cleanType === 'voice' ? 'cat-voice' : 'cat-text';
  const targetCat = categoryId || defaultCat;

  // Slug identificador
  let slug = cleanName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!slug) slug = `canal-${Date.now().toString(36)}`;

  // Evita duplicatas de id
  const existing = memoryStore.channels.find(c => c.id === slug);
  const id = existing ? `${slug}-${Date.now().toString(36).substring(2, 6)}` : slug;

  const position = memoryStore.channels.filter(c => c.categoryId === targetCat).length;
  const chObj = { id, name: cleanName, type: cleanType, categoryId: targetCat, position };

  memoryStore.channels.push(chObj);
  if (cleanType === 'text') {
    memoryStore.messages[id] = [];
  }

  if (isConnected && pool) {
    try {
      await pool.query(
        'INSERT INTO channels (id, name, type, category_id, position) VALUES (?, ?, ?, ?, ?)',
        [id, cleanName, cleanType, targetCat, position]
      );
    } catch (e) {
      console.warn('Erro ao salvar canal no MariaDB:', e.message);
    }
  }
  return chObj;
}

export async function deleteChannel(channelId) {
  if (channelId === 'geral') {
    throw new Error('O canal geral não pode ser excluído.');
  }

  memoryStore.channels = memoryStore.channels.filter(c => c.id !== channelId);
  delete memoryStore.messages[channelId];

  if (isConnected && pool) {
    try {
      await pool.query('DELETE FROM messages WHERE channel_id = ?', [channelId]);
      await pool.query('DELETE FROM channels WHERE id = ?', [channelId]);
    } catch (e) {
      console.warn('Erro ao excluir canal no MariaDB:', e.message);
    }
  }
  return true;
}

export async function saveMessage({ id, channelId, sender, avatar, isSystem, text, attachmentUrl, timestamp, replyTo = null, reactions = {}, edited = false, pinned = false }) {
  const msgObj = {
    id,
    channelId,
    sender,
    avatar,
    isSystem: !!isSystem,
    text,
    attachmentUrl: attachmentUrl || null,
    timestamp,
    replyTo: replyTo || null,
    reactions: reactions || {},
    edited: !!edited,
    pinned: !!pinned
  };

  if (!memoryStore.messages[channelId]) {
    memoryStore.messages[channelId] = [];
  }
  memoryStore.messages[channelId].push(msgObj);
  if (memoryStore.messages[channelId].length > 100) memoryStore.messages[channelId].shift();

  if (isConnected && pool) {
    try {
      await pool.query(
        `INSERT INTO messages (id, channel_id, sender_name, avatar, is_system, text, attachment_url, timestamp, reply_to, reactions, edited, pinned)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          channelId,
          sender,
          avatar,
          isSystem ? 1 : 0,
          text,
          attachmentUrl || null,
          timestamp,
          replyTo ? JSON.stringify(replyTo) : null,
          reactions ? JSON.stringify(reactions) : null,
          edited ? 1 : 0,
          pinned ? 1 : 0
        ]
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
        `SELECT id, channel_id as channelId, sender_name as sender, avatar, is_system as isSystem, text, attachment_url as attachmentUrl, timestamp, reply_to as replyTo, reactions, edited, pinned, created_at as createdAt
         FROM messages WHERE channel_id = ? ORDER BY created_at DESC LIMIT ?`,
        [channelId, limit]
      );
      return rows.reverse().map(r => ({
        ...r,
        isSystem: !!r.isSystem,
        edited: !!r.edited,
        pinned: !!r.pinned,
        replyTo: typeof r.replyTo === 'string' ? JSON.parse(r.replyTo || 'null') : (r.replyTo || null),
        reactions: typeof r.reactions === 'string' ? JSON.parse(r.reactions || '{}') : (r.reactions || {})
      }));
    } catch (e) {
      console.warn('Erro ao carregar mensagens do MariaDB:', e.message);
    }
  }
  return memoryStore.messages[channelId] || [];
}

export async function editMessage(messageId, channelId, newText) {
  let updatedMsg = null;
  const list = memoryStore.messages[channelId] || [];
  const found = list.find(m => m.id === messageId);
  if (found) {
    found.text = newText;
    found.edited = true;
    updatedMsg = found;
  }

  if (isConnected && pool) {
    try {
      await pool.query(
        'UPDATE messages SET text = ?, edited = 1 WHERE id = ?',
        [newText, messageId]
      );
      if (!updatedMsg) {
        const [rows] = await pool.query(
          `SELECT id, channel_id as channelId, sender_name as sender, avatar, is_system as isSystem, text, attachment_url as attachmentUrl, timestamp, reply_to as replyTo, reactions, edited, pinned, created_at as createdAt
           FROM messages WHERE id = ?`,
          [messageId]
        );
        if (rows && rows[0]) {
          const r = rows[0];
          updatedMsg = {
            ...r,
            isSystem: !!r.isSystem,
            edited: !!r.edited,
            pinned: !!r.pinned,
            replyTo: typeof r.replyTo === 'string' ? JSON.parse(r.replyTo || 'null') : (r.replyTo || null),
            reactions: typeof r.reactions === 'string' ? JSON.parse(r.reactions || '{}') : (r.reactions || {})
          };
        }
      }
    } catch (e) {
      console.warn('Erro ao editar mensagem no MariaDB:', e.message);
    }
  }
  return updatedMsg;
}

export async function deleteMessage(messageId, channelId) {
  if (memoryStore.messages[channelId]) {
    memoryStore.messages[channelId] = memoryStore.messages[channelId].filter(m => m.id !== messageId);
  }

  if (isConnected && pool) {
    try {
      await pool.query('DELETE FROM messages WHERE id = ?', [messageId]);
    } catch (e) {
      console.warn('Erro ao excluir mensagem no MariaDB:', e.message);
    }
  }
  return true;
}

export async function toggleReaction(messageId, channelId, emoji, username) {
  let msg = null;
  const list = memoryStore.messages[channelId] || [];
  msg = list.find(m => m.id === messageId);

  if (!msg && isConnected && pool) {
    try {
      const [rows] = await pool.query(
        `SELECT id, channel_id as channelId, sender_name as sender, avatar, is_system as isSystem, text, attachment_url as attachmentUrl, timestamp, reply_to as replyTo, reactions, edited, pinned, created_at as createdAt
         FROM messages WHERE id = ?`,
        [messageId]
      );
      if (rows && rows[0]) {
        const r = rows[0];
        msg = {
          ...r,
          isSystem: !!r.isSystem,
          edited: !!r.edited,
          pinned: !!r.pinned,
          replyTo: typeof r.replyTo === 'string' ? JSON.parse(r.replyTo || 'null') : (r.replyTo || null),
          reactions: typeof r.reactions === 'string' ? JSON.parse(r.reactions || '{}') : (r.reactions || {})
        };
        list.push(msg);
      }
    } catch (e) {}
  }

  if (!msg) return null;

  if (!msg.reactions || typeof msg.reactions !== 'object') {
    msg.reactions = {};
  }

  let usersList = Array.isArray(msg.reactions[emoji]) ? [...msg.reactions[emoji]] : [];
  const userIdx = usersList.indexOf(username);
  if (userIdx >= 0) {
    usersList.splice(userIdx, 1);
  } else {
    usersList.push(username);
  }

  if (usersList.length === 0) {
    delete msg.reactions[emoji];
  } else {
    msg.reactions[emoji] = usersList;
  }

  if (isConnected && pool) {
    try {
      await pool.query('UPDATE messages SET reactions = ? WHERE id = ?', [JSON.stringify(msg.reactions), messageId]);
    } catch (e) {
      console.warn('Erro ao atualizar reações no MariaDB:', e.message);
    }
  }

  return msg;
}

export async function togglePinMessage(messageId, channelId) {
  let msg = null;
  const list = memoryStore.messages[channelId] || [];
  msg = list.find(m => m.id === messageId);

  if (!msg && isConnected && pool) {
    try {
      const [rows] = await pool.query(
        `SELECT id, channel_id as channelId, sender_name as sender, avatar, is_system as isSystem, text, attachment_url as attachmentUrl, timestamp, reply_to as replyTo, reactions, edited, pinned, created_at as createdAt
         FROM messages WHERE id = ?`,
        [messageId]
      );
      if (rows && rows[0]) {
        const r = rows[0];
        msg = {
          ...r,
          isSystem: !!r.isSystem,
          edited: !!r.edited,
          pinned: !!r.pinned,
          replyTo: typeof r.replyTo === 'string' ? JSON.parse(r.replyTo || 'null') : (r.replyTo || null),
          reactions: typeof r.reactions === 'string' ? JSON.parse(r.reactions || '{}') : (r.reactions || {})
        };
        list.push(msg);
      }
    } catch (e) {}
  }

  if (!msg) return null;

  msg.pinned = !msg.pinned;

  if (isConnected && pool) {
    try {
      await pool.query('UPDATE messages SET pinned = ? WHERE id = ?', [msg.pinned ? 1 : 0, messageId]);
    } catch (e) {
      console.warn('Erro ao atualizar pin no MariaDB:', e.message);
    }
  }

  return msg;
}

export async function getPinnedMessages(channelId) {
  if (isConnected && pool) {
    try {
      const [rows] = await pool.query(
        `SELECT id, channel_id as channelId, sender_name as sender, avatar, is_system as isSystem, text, attachment_url as attachmentUrl, timestamp, reply_to as replyTo, reactions, edited, pinned, created_at as createdAt
         FROM messages WHERE channel_id = ? AND pinned = 1 ORDER BY created_at DESC LIMIT 50`,
        [channelId]
      );
      return rows.map(r => ({
        ...r,
        isSystem: !!r.isSystem,
        edited: !!r.edited,
        pinned: !!r.pinned,
        replyTo: typeof r.replyTo === 'string' ? JSON.parse(r.replyTo || 'null') : (r.replyTo || null),
        reactions: typeof r.reactions === 'string' ? JSON.parse(r.reactions || '{}') : (r.reactions || {})
      }));
    } catch (e) {
      console.warn('Erro ao buscar pins no MariaDB:', e.message);
    }
  }
  const list = memoryStore.messages[channelId] || [];
  return list.filter(m => m.pinned);
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

export async function updateSoundboardSound({ id, name, emoji, file_url }) {
  let updatedSound = null;

  // Atualiza na memória
  const idx = memoryStore.soundboard.findIndex(s => s.id === id);
  if (idx !== -1) {
    if (name) memoryStore.soundboard[idx].name = name;
    if (emoji) memoryStore.soundboard[idx].emoji = emoji;
    if (file_url) memoryStore.soundboard[idx].file_url = file_url;
    updatedSound = memoryStore.soundboard[idx];
  }

  // Atualiza no banco de dados MariaDB/MySQL se conectado
  if (isConnected && pool) {
    try {
      if (file_url) {
        await pool.query(
          'UPDATE soundboard_sounds SET name = COALESCE(?, name), emoji = COALESCE(?, emoji), file_url = ? WHERE id = ?',
          [name || null, emoji || null, file_url, id]
        );
      } else {
        await pool.query(
          'UPDATE soundboard_sounds SET name = COALESCE(?, name), emoji = COALESCE(?, emoji) WHERE id = ?',
          [name || null, emoji || null, id]
        );
      }

      const [rows] = await pool.query('SELECT * FROM soundboard_sounds WHERE id = ?', [id]);
      if (rows && rows.length > 0) {
        updatedSound = rows[0];
      }
    } catch (e) {
      console.warn('Erro ao atualizar som no MariaDB:', e.message);
    }
  }

  return updatedSound;
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
        'SELECT id, username, password_hash, avatar, banner_color, bio, custom_status_text, status_mode, devices, created_at FROM users WHERE LOWER(username) = ? LIMIT 1',
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
          banner_color: u.banner_color || '#5865F2',
          bio: u.bio || '',
          custom_status_text: u.custom_status_text || '',
          status_mode: u.status_mode || 'online',
          devices: Array.isArray(devicesArr) ? devicesArr : []
        };
      }
    } catch (e) {
      console.warn('Erro ao buscar usuário no MariaDB:', e.message);
    }
  }

  return memoryStore.users[lower] || null;
}

export async function saveUser({ id, username, password_hash = null, avatar = '', bannerColor = '#5865F2', bio = '', customStatusText = '', statusMode = 'online', deviceId = null }) {
  const clean = (username || '').trim();
  const lower = clean.toLowerCase();
  const userId = id || `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const devices = deviceId ? [deviceId] : [];

  const userObj = {
    id: userId,
    username: clean,
    password_hash,
    avatar,
    banner_color: bannerColor,
    bio,
    custom_status_text: customStatusText,
    status_mode: statusMode,
    devices
  };

  memoryStore.users[lower] = userObj;

  if (isConnected && pool) {
    try {
      await pool.query(
        `INSERT INTO users (id, username, password_hash, avatar, banner_color, bio, custom_status_text, status_mode, devices)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           avatar = VALUES(avatar),
           banner_color = VALUES(banner_color),
           bio = VALUES(bio),
           custom_status_text = VALUES(custom_status_text),
           status_mode = VALUES(status_mode),
           devices = VALUES(devices)`,
        [userId, clean, password_hash, avatar, bannerColor, bio, customStatusText, statusMode, JSON.stringify(devices)]
      );
    } catch (e) {
      console.warn('Erro ao salvar usuário no MariaDB:', e.message);
    }
  }

  return userObj;
}

export async function updateUserProfile(username, { avatar, bannerColor, bio, customStatusText, statusMode }) {
  const clean = (username || '').trim();
  const lower = clean.toLowerCase();

  let user = await findUser(clean);
  if (!user) {
    user = await saveUser({ username: clean, avatar: avatar || '' });
  }

  if (avatar !== undefined && avatar !== null) user.avatar = avatar;
  if (bannerColor !== undefined && bannerColor !== null) user.banner_color = bannerColor;
  if (bio !== undefined && bio !== null) user.bio = bio;
  if (customStatusText !== undefined && customStatusText !== null) user.custom_status_text = customStatusText;
  if (statusMode !== undefined && statusMode !== null) user.status_mode = statusMode;

  memoryStore.users[lower] = {
    ...(memoryStore.users[lower] || {}),
    ...user
  };

  if (isConnected && pool) {
    try {
      await pool.query(
        `UPDATE users SET
           avatar = COALESCE(?, avatar),
           banner_color = COALESCE(?, banner_color),
           bio = COALESCE(?, bio),
           custom_status_text = COALESCE(?, custom_status_text),
           status_mode = COALESCE(?, status_mode)
         WHERE LOWER(username) = ?`,
        [
          avatar || null,
          bannerColor || null,
          bio !== undefined ? bio : null,
          customStatusText !== undefined ? customStatusText : null,
          statusMode || null,
          lower
        ]
      );
    } catch (e) {
      console.warn('Erro ao atualizar perfil no MariaDB:', e.message);
    }
  }

  return user;
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
