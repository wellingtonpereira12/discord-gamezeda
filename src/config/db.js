import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || 'host.docker.internal';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'discord_user';
const DB_PASSWORD = process.env.DB_PASSWORD || 'DiscordGamezeda2026!';
const DB_NAME = process.env.DB_NAME || 'discord_gamezeda';

let pool = null;
let isConnected = false;

// Fallback em memória caso o banco esteja indisponível
const memoryStore = {
  channels: [
    'geral', 'links', 'meme-imagem-videos', 'musicas',
    'novo-video-youtube', 'clips-twitch', 'blogger',
    'informacoes-eventos-regras', 'nova-live', 'vendo-mousepad',
    'to-sem-mic', 'tribunal-de-justica'
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
