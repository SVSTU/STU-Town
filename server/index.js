const express = require('express');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
app.use(express.static(path.join(__dirname, '..', 'client')));
const allowedOrigins = new Set((process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5500,http://127.0.0.1:5500,https://stu-town-server.onrender.com,https://stu-town.pages.dev')
  .split(',').map((origin) => origin.trim()).filter(Boolean));
const io = new Server(server, {
  maxHttpBufferSize: 3 * 1024 * 1024,
  cors: { origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)) }
});

const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
if (!isSupabaseConfigured) {
  console.warn('Supabase chưa được cấu hình; hồ sơ người chơi hiện chỉ tồn tại trong phiên server này.');
}
const pendingProfileSaves = new Map();
const profileSaveTimers = new Map();

function hashPlayerToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function validPlayerToken(token) {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{40,100}$/.test(token);
}

async function supabaseRequest(pathname, options = {}) {
  const authHeaders = { apikey: SUPABASE_SERVICE_ROLE_KEY };
  // Current Supabase secret keys are not JWTs; send them only as `apikey`.
  // Legacy service_role keys are JWTs and are also needed as the bearer role token.
  if (SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ')) {
    authHeaders.Authorization = `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
  }
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
    ...options,
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Supabase ${response.status}: ${detail}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function loadSavedProfile(tokenHash) {
  if (!isSupabaseConfigured) return null;
  const query = new URLSearchParams({
    select: 'coins,reputation,stats,inventory,farm_plant_count,farm_harvest_count',
    token_hash: `eq.${tokenHash}`,
    limit: '1'
  });
  const rows = await supabaseRequest(`player_profiles?${query}`);
  return Array.isArray(rows) ? rows[0] || null : null;
}

const BLOG_FEED_URL = 'https://stusinhvien.blogspot.com/feeds/posts/default?alt=json&max-results=8';
const BLOG_BASE_URL = 'https://stusinhvien.blogspot.com/';
let announcementFeedCache = { posts: [], expiresAt: 0 };
let announcementFeedRequest = null;
const ENVIRONMENT_API_URL = 'https://api.open-meteo.com/v1/forecast?latitude=10.745&longitude=106.67583&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,weather_code,cloud_cover,wind_speed_10m&timezone=Asia%2FHo_Chi_Minh';
let environmentCache = { data: null, expiresAt: 0 };
let environmentRequest = null;

function decodeHtmlText(value) {
  return String(value || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?\s*>|<\/(?:p|div|li|h[1-6])\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, digits) => String.fromCodePoint(Math.min(0x10ffff, Number(digits))))
    .replace(/&#x([\da-f]+);/gi, (_, hex) => String.fromCodePoint(Math.min(0x10ffff, parseInt(hex, 16))))
    .replace(/\s+/g, ' ').trim();
}

function safeBloggerImage(value) {
  try {
    const imageUrl = new URL(String(value || '').replace(/&amp;/gi, '&'));
    const host = imageUrl.hostname;
    const isBloggerImageHost = host === 'blogger.googleusercontent.com'
      || host.endsWith('.blogger.googleusercontent.com')
      || /^\d+\.bp\.blogspot\.com$/.test(host);
    return imageUrl.protocol === 'https:' && isBloggerImageHost ? imageUrl.href : '';
  } catch { return ''; }
}

async function fetchAnnouncementPosts() {
  if (announcementFeedRequest) return announcementFeedRequest;
  announcementFeedRequest = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(BLOG_FEED_URL, {
        signal: controller.signal,
        headers: { accept: 'application/json', 'user-agent': 'STU-Town-Announcements/1.0' }
      });
      if (!response.ok) throw new Error(`Blogger returned ${response.status}`);
      const data = await response.json();
      const entries = Array.isArray(data?.feed?.entry) ? data.feed.entry : [];
      const posts = entries.map((entry) => {
        const title = decodeHtmlText(entry?.title?.$t);
        const urlValue = entry?.link?.find((link) => link.rel === 'alternate')?.href;
        let url = '';
        try {
          const parsedUrl = new URL(urlValue);
          if (parsedUrl.protocol === 'https:' && parsedUrl.hostname === 'stusinhvien.blogspot.com') url = parsedUrl.href;
        } catch { /* Skip invalid links. */ }
        const publishedAt = Date.parse(entry?.published?.$t || entry?.updated?.$t || '');
        const contentHtml = String(entry?.content?.$t || '');
        const contentImage = contentHtml.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)/i)?.[1];
        const image = safeBloggerImage(contentImage || entry?.media$thumbnail?.url);
        return {
          title,
          url,
          image,
          publishedAt: Number.isFinite(publishedAt) ? new Date(publishedAt).toISOString() : '',
          summary: decodeHtmlText(entry?.summary?.$t || contentHtml).slice(0, 420)
        };
      }).filter((post) => post.title && post.url).slice(0, 8);
      announcementFeedCache = { posts, expiresAt: Date.now() + 5 * 60_000 };
      return posts;
    } finally {
      clearTimeout(timeout);
      announcementFeedRequest = null;
    }
  })();
  return announcementFeedRequest;
}

async function fetchEnvironmentConditions() {
  if (environmentRequest) return environmentRequest;
  environmentRequest = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(ENVIRONMENT_API_URL, { signal: controller.signal, headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error(`Open-Meteo returned ${response.status}`);
      const result = await response.json();
      const current = result?.current;
      if (!current || !Number.isFinite(Number(current.weather_code))) throw new Error('Invalid weather response');
      const data = {
        location: 'Chánh Hưng, TP. Hồ Chí Minh',
        time: current.time,
        temperature: Number.isFinite(Number(current.temperature_2m)) ? Number(current.temperature_2m) : null,
        apparentTemperature: Number.isFinite(Number(current.apparent_temperature)) ? Number(current.apparent_temperature) : null,
        humidity: Number.isFinite(Number(current.relative_humidity_2m)) ? Number(current.relative_humidity_2m) : null,
        isDay: Number(current.is_day) === 1,
        precipitation: Number.isFinite(Number(current.precipitation)) ? Number(current.precipitation) : 0,
        rain: Number.isFinite(Number(current.rain)) ? Number(current.rain) : 0,
        showers: Number.isFinite(Number(current.showers)) ? Number(current.showers) : 0,
        weatherCode: Number(current.weather_code),
        cloudCover: Number.isFinite(Number(current.cloud_cover)) ? Number(current.cloud_cover) : 0,
        windSpeed: Number.isFinite(Number(current.wind_speed_10m)) ? Number(current.wind_speed_10m) : null
      };
      environmentCache = { data, expiresAt: Date.now() + 10 * 60_000 };
      return data;
    } finally {
      clearTimeout(timeout);
      environmentRequest = null;
    }
  })();
  return environmentRequest;
}

app.get('/api/announcements', async (req, res) => {
  const origin = req.get('origin');
  if (origin) {
    let allowed = allowedOrigins.has(origin);
    try {
      const hostname = new URL(origin).hostname;
      allowed ||= hostname === 'stu-town.pages.dev' || hostname.endsWith('.stu-town.pages.dev');
    } catch { allowed = false; }
    if (!allowed) return res.status(403).json({ error: 'Origin not allowed' });
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
  }
  if (announcementFeedCache.expiresAt > Date.now()) {
    return res.set('Cache-Control', 'public, max-age=60').json({ source: BLOG_BASE_URL, posts: announcementFeedCache.posts });
  }
  try {
    const posts = await fetchAnnouncementPosts();
    return res.set('Cache-Control', 'public, max-age=60').json({ source: BLOG_BASE_URL, posts });
  } catch (error) {
    if (announcementFeedCache.posts.length) {
      return res.set('Cache-Control', 'public, max-age=30').json({ source: BLOG_BASE_URL, stale: true, posts: announcementFeedCache.posts });
    }
    console.error('Không tải được feed thông báo STU:', error.message);
    return res.status(502).json({ error: 'Không tải được bài viết từ blog STU.' });
  }
});

app.get('/api/environment', async (req, res) => {
  const origin = req.get('origin');
  if (origin) {
    let allowed = allowedOrigins.has(origin);
    try {
      const hostname = new URL(origin).hostname;
      allowed ||= hostname === 'stu-town.pages.dev' || hostname.endsWith('.stu-town.pages.dev');
    } catch { allowed = false; }
    if (!allowed) return res.status(403).json({ error: 'Origin not allowed' });
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
  }
  if (environmentCache.data && environmentCache.expiresAt > Date.now()) {
    return res.set('Cache-Control', 'public, max-age=300').json(environmentCache.data);
  }
  try {
    return res.set('Cache-Control', 'public, max-age=300').json(await fetchEnvironmentConditions());
  } catch (error) {
    if (environmentCache.data) {
      return res.set('Cache-Control', 'public, max-age=60').json({ ...environmentCache.data, stale: true });
    }
    console.error('Không tải được thời tiết Chánh Hưng:', error.message);
    return res.status(502).json({ error: 'Không tải được dữ liệu thời tiết.' });
  }
});

const players = {};
const recentMessages = new Map();
const recentPrivateMessages = new Map();
const reactionEmojis = new Set(['❤️', '😂', '👍', '😮', '😢', '🔥']);
const quickFloatingEmotes = new Set(['👋', '❤️', '😂', '👍', '🔥', '🎉']);
const FARM_GROWTH_MS = 30_000;
const FARM_WILT_MS = FARM_GROWTH_MS * 10;
const FARM_DEATH_MS = FARM_GROWTH_MS * 50;
const FARM_HARVEST_COST_EVERY = 4;
const CAMPUS_BENCH_REST = 10;
const CAMPUS_BENCH_REST_DURATION_MS = 30_000;
const CAMPUS_BENCH_REST_STEP_MS = CAMPUS_BENCH_REST_DURATION_MS / CAMPUS_BENCH_REST;
const CAMPUS_BENCH_COOLDOWN_MS = 3_000;
const CAMPUS_BENCHES = [
  { id: 'bench-1', x: 540, y: 50 }, { id: 'bench-2', x: 625, y: 50 },
  { id: 'bench-3', x: 550, y: 285 }, { id: 'bench-4', x: 630, y: 285 },
  { id: 'bench-5', x: 670, y: 365 },
  { id: 'bench-6', x: 540, y: 435 }, { id: 'bench-7', x: 630, y: 435 }
];
const FARM_PLOT_IDS = ['plot-1', 'plot-2', 'plot-3', 'plot-4'];
const FARM_CROP_KEYS = { carrot: '🥕', tomato: '🍅', corn: '🌽', strawberry: '🍓' };
const CROP_PRICES = { carrot: 100, tomato: 150, corn: 180, strawberry: 250 };
const FOOD_MENU = {
  bread: { coins: 100, reputation: 20, hunger: 25 },
  water: { coins: 80, reputation: 16, fatigue: -20 },
  bao: { coins: 150, reputation: 30, hunger: 15, strength: 15 },
  soda: { coins: 180, reputation: 36, strength: 25, fatigue: -15 }
};
const OPEN_MAP_IDS = new Set(['sports', 'fountain', 'farm', 'khu-c', 'khu-a', 'canteen', 'auditorium']);
const CLOSED_MAP_IDS = new Set(['khu-d', 'khu-e', 'khu-f']);
const HALLOWEEN_BOX_COUNT = 50;
const CAMPUS_BUILDINGS = [
  { x: 48, y: 72, width: 135, height: 110 },
  { x: 48, y: 278, width: 135, height: 105 },
  { x: 48, y: 478, width: 138, height: 70 },
  { x: 276, y: 40, width: 200, height: 52 },
  { x: 232, y: 106, width: 245, height: 112 },
  { x: 530, y: 92, width: 132, height: 120 },
  { x: 704, y: 228, width: 54, height: 220 },
  { x: 280, y: 520, width: 185, height: 43 }
];
const farmPlots = new Map(FARM_PLOT_IDS.map((id) => [id, { crop: '', plantedAt: 0, plantedBy: '' }]));
const playerInventories = new Map();
const halloweenProgress = new Map();
const halloweenFinders = new Map();
// Keep this session's leaderboard entries after a player disconnects.
const archivedLeaderboardPlayers = new Map();
const reputationRewardedAt = new Map();
let nextMessageId = 0;
let activeFarmMouse = null;
let farmMouseSpawnTimer = null;
let farmMouseBiteTimer = null;
let farmMouseMoveTimer = null;

function getPersistentPlayerSnapshot(id) {
  const player = players[id];
  const inventory = playerInventories.get(id);
  const playerSocket = io.sockets.sockets.get(id);
  const tokenHash = playerSocket?.data?.playerTokenHash;
  if (!player || !inventory || !tokenHash || !playerSocket?.data?.profilePersistenceReady) return null;
  return {
    token_hash: tokenHash,
    coins: Math.max(0, Math.floor(Number(player.coins) || 0)),
    reputation: Math.max(0, Math.floor(Number(player.reputation) || 0)),
    stats: {
      hunger: clampStat(player.stats.hunger),
      strength: clampStat(player.stats.strength),
      fatigue: clampStat(player.stats.fatigue),
      nickname: String(player.nickname || '').replace(/[\\u0000-\\u001f\\u007f]/g, '').trim().slice(0, 24)
    },
    inventory,
    farm_plant_count: Math.max(0, Math.floor(Number(player.farmPlantCount) || 0)),
    farm_harvest_count: Math.max(0, Math.floor(Number(player.farmHarvestCount) || 0)),
    updated_at: new Date().toISOString()
  };
}

function persistPlayer(id) {
  const snapshot = getPersistentPlayerSnapshot(id);
  if (!snapshot) return Promise.resolve();
  const previous = pendingProfileSaves.get(snapshot.token_hash) || Promise.resolve();
  const next = previous.catch(() => {}).then(() => supabaseRequest('player_profiles?on_conflict=token_hash', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(snapshot)
  }));
  pendingProfileSaves.set(snapshot.token_hash, next);
  return next.catch((error) => {
    console.error('Không lưu được hồ sơ người chơi vào Supabase:', error.message);
  }).finally(() => {
    if (pendingProfileSaves.get(snapshot.token_hash) === next) pendingProfileSaves.delete(snapshot.token_hash);
  });
}

function schedulePlayerSave(id) {
  if (!isSupabaseConfigured || !players[id]) return;
  clearTimeout(profileSaveTimers.get(id));
  profileSaveTimers.set(id, setTimeout(() => {
    profileSaveTimers.delete(id);
    void persistPlayer(id);
  }, 1_500));
}

async function recordCanteenSale(id, sale) {
  if (!isSupabaseConfigured) return;
  const playerSocket = io.sockets.sockets.get(id);
  const tokenHash = playerSocket?.data?.playerTokenHash;
  if (!tokenHash) return;

  try {
    // Ensure the player profile exists before inserting a sale because
    // canteen_sales.player_token_hash references player_profiles.token_hash.
    await persistPlayer(id);
    await supabaseRequest('canteen_sales', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        player_token_hash: tokenHash,
        item_id: sale.itemId,
        quantity: sale.quantity,
        unit_price: sale.unitPrice,
        currency: sale.currency,
        total_price: sale.totalPrice
      })
    });
  } catch (error) {
    console.error('Không lưu được lịch sử mua hàng Căn tin vào Supabase:', error.message);
  }
}

async function getCanteenBestSellingProducts() {
  if (!isSupabaseConfigured) return [];
  try {
    const query = new URLSearchParams({
      select: 'item_id,total_quantity_sold,total_transactions',
      order: 'total_quantity_sold.desc',
      limit: '2'
    });
    const rows = await supabaseRequest(`canteen_product_stats?${query}`);
    return (Array.isArray(rows) ? rows : [])
      .filter((row) => Object.hasOwn(FOOD_MENU, row.item_id) && Number(row.total_quantity_sold) > 0)
      .sort((a, b) => Number(b.total_quantity_sold) - Number(a.total_quantity_sold))
      .slice(0, 2)
      .map((row) => ({
        itemId: row.item_id,
        totalQuantitySold: Number(row.total_quantity_sold) || 0,
        totalTransactions: Number(row.total_transactions) || 0
      }));
  } catch (error) {
    console.error('Không tải được top vật phẩm bán chạy Căn tin:', error.message);
    return [];
  }
}

async function emitCanteenBestSellingProducts(target = io) {
  const products = await getCanteenBestSellingProducts();
  target.emit('canteenBestSellingProducts', products);
}

io.use(async (socket, next) => {
  try {
    const suppliedToken = socket.handshake.auth?.playerToken;
    const token = validPlayerToken(suppliedToken) ? suppliedToken : crypto.randomBytes(32).toString('base64url');
    const tokenHash = hashPlayerToken(token);
    const savedProfile = await loadSavedProfile(tokenHash);
    socket.data.playerToken = token;
    socket.data.playerTokenHash = tokenHash;
    socket.data.savedProfile = savedProfile;
    socket.data.profilePersistenceReady = isSupabaseConfigured;
    next();
  } catch (error) {
    console.error('Không tải được hồ sơ Supabase; vẫn cho phép vào game và tạm khóa lưu để tránh ghi đè dữ liệu:', error.message);
    const suppliedToken = socket.handshake.auth?.playerToken;
    const token = validPlayerToken(suppliedToken) ? suppliedToken : crypto.randomBytes(32).toString('base64url');
    socket.data.playerToken = token;
    socket.data.playerTokenHash = hashPlayerToken(token);
    socket.data.savedProfile = null;
    socket.data.profilePersistenceReady = false;
    socket.data.profilePersistenceError = error.message;
    next();
  }
});

function getPlayerState(player) {
  return {
    stats: { ...player.stats },
    coins: player.coins,
    reputation: player.reputation,
    farmPlantCount: player.farmPlantCount,
    farmHarvestCount: player.farmHarvestCount
  };
}

function emitPlayerState(id) {
  const player = players[id];
  if (player) {
    io.to(id).emit('playerState', getPlayerState(player));
    schedulePlayerSave(id);
  }
  emitSessionLeaderboard();
}

function getSessionLeaderboard() {
  // Stable identity is the stored player token hash, never the display nickname.
  // Only stable token hashes belong in the archive. Ignore legacy Socket.IO IDs
  // from older code, otherwise a reconnect can show the same player twice.
  const leaderboardByPlayerId = new Map(
    [...archivedLeaderboardPlayers.entries()].filter(([id]) => /^[a-f0-9]{64}$/i.test(String(id)))
  );
  for (const [socketId, player] of Object.entries(players)) {
    const playerSocket = io.sockets.sockets.get(socketId);
    const persistentId = playerSocket?.data?.playerTokenHash || socketId;
    const inventory = playerInventories.get(socketId);
    leaderboardByPlayerId.set(persistentId, {
      id: persistentId,
      nickname: player.nickname || `Khách (${socketId.slice(0, 4)})`,
      coins: Number(player.coins) || 0,
      reputation: Number(player.reputation) || 0,
      items: { ...(inventory?.items || {}) },
      connected: true
    });
  }
  const leaderboardPlayers = [...leaderboardByPlayerId.values()];
  const byScore = (key) => [...leaderboardPlayers]
    .sort((a, b) => b[key] - a[key] || a.nickname.localeCompare(b.nickname, 'vi'))
    .map(({ nickname, [key]: score }) => ({ nickname, score }));
  const eventItemDefinitions = [
    { id: 'eventGoldCoin', label: '🟡 Đồng vàng sự kiện' },
    { id: 'eventLantern', label: '🏮 Đèn lồng sự kiện' },
    { id: 'halloweenPumpkin', label: '🎃 Bí ngô Halloween' },
    { id: 'eventRedLamp', label: '🔴 Đèn lồng đỏ sự kiện' }
  ];
  const event = eventItemDefinitions.map(({ id, label }) => ({
    itemId: id,
    label,
    rows: leaderboardPlayers
      .map((entry) => ({ nickname: entry.nickname, score: Math.max(0, Math.floor(Number(entry.items?.[id]) || 0)) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname, 'vi'))
  }));
  return {
    reputation: byScore('reputation'),
    coins: byScore('coins'),
    event
  };
}

let serverLeaderboardCache = null;
let serverLeaderboardCacheExpiresAt = 0;
let serverLeaderboardRequest = null;

async function getServerLeaderboard() {
  if (!isSupabaseConfigured) return getSessionLeaderboard();
  if (serverLeaderboardCache && Date.now() < serverLeaderboardCacheExpiresAt) return serverLeaderboardCache;
  if (serverLeaderboardRequest) return serverLeaderboardRequest;
  serverLeaderboardRequest = (async () => {
    const query = new URLSearchParams({
      select: 'token_hash,coins,reputation,stats,inventory',
      order: 'reputation.desc',
      limit: '1000'
    });
    const savedRows = await supabaseRequest(`player_profiles?${query}`);
    const byId = new Map();
    for (const row of (Array.isArray(savedRows) ? savedRows : [])) {
      if (!row?.token_hash) continue;
      byId.set(row.token_hash, {
        id: row.token_hash,
        nickname: String(row.stats?.nickname || '').trim() || `Người chơi ${String(row.token_hash).slice(0, 6)}`,
        coins: Number(row.coins) || 0,
        reputation: Number(row.reputation) || 0,
        items: { ...(row.inventory?.items || {}) }
      });
    }
    for (const [id, archived] of archivedLeaderboardPlayers.entries()) {
      byId.set(id, { ...byId.get(id), ...archived, items: { ...(byId.get(id)?.items || {}), ...(archived.items || {}) } });
    }
    for (const [socketId, player] of Object.entries(players)) {
      const playerSocket = io.sockets.sockets.get(socketId);
      const persistentId = playerSocket?.data?.playerTokenHash || socketId;
      const inventory = playerInventories.get(socketId);
      byId.set(persistentId, {
        ...byId.get(persistentId),
        id: persistentId,
        nickname: player.nickname || `Khách (${socketId.slice(0, 4)})`,
        coins: Number(player.coins) || 0,
        reputation: Number(player.reputation) || 0,
        items: { ...(byId.get(persistentId)?.items || {}), ...(inventory?.items || {}) }
      });
    }
    const list = [...byId.values()];
    const byScore = (key) => [...list]
      .sort((a, b) => b[key] - a[key] || a.nickname.localeCompare(b.nickname, 'vi'))
      .map(({ nickname, [key]: score }) => ({ nickname, score }));
    const event = [
      { id: 'eventGoldCoin', label: '🟡 Đồng vàng sự kiện' },
      { id: 'eventLantern', label: '🏮 Đèn lồng sự kiện' },
      { id: 'halloweenPumpkin', label: '🎃 Bí ngô Halloween' },
      { id: 'eventRedLamp', label: '🔴 Đèn lồng đỏ sự kiện' }
    ].map(({ id, label }) => ({
      itemId: id, label,
      rows: list.map((entry) => ({ nickname: entry.nickname, score: Math.max(0, Math.floor(Number(entry.items?.[id]) || 0)) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname, 'vi'))
    }));
    return { reputation: byScore('reputation'), coins: byScore('coins'), event };
  })().then((data) => {
    serverLeaderboardCache = data;
    serverLeaderboardCacheExpiresAt = Date.now() + 15000;
    return data;
  }).catch((error) => {
    console.error('Không tải được bảng xếp hạng máy chủ:', error.message);
    return getSessionLeaderboard();
  }).finally(() => { serverLeaderboardRequest = null; });
  return serverLeaderboardRequest;
}

function emitSessionLeaderboard() {
  if (!io) return;
  const session = getSessionLeaderboard();
  // Ranking data is also used by the canteen hall-of-fame, so publish it to all maps.
  io.emit('sessionLeaderboard', { ...session, session, server: serverLeaderboardCache || session });
  void getServerLeaderboard().then((server) => {
    const currentSession = getSessionLeaderboard();
    io.emit('sessionLeaderboard', { ...currentSession, session: currentSession, server });
  });
}

function getCampusBenchOccupants() {
  return Object.fromEntries(Object.entries(players)
    .filter(([, player]) => player.mapId === 'campus' && player.sittingAtBench)
    .map(([id, player]) => [player.sittingAtBench, id]));
}

function emitCampusBenchOccupants() {
  io.to('map:campus').emit('campusBenchOccupancy', getCampusBenchOccupants());
}

function stopCampusBenchRest(player) {
  if (!player) return false;
  const wasSitting = Boolean(player.sittingAtBench);
  player.sittingAtBench = '';
  player.benchRestStartedAt = 0;
  player.benchRestRecovered = 0;
  return wasSitting;
}

function tickCampusBenchRest() {
  const now = Date.now();
  let occupancyChanged = false;
  for (const [id, player] of Object.entries(players)) {
    if (!player.benchRestStartedAt) continue;
    if (player.mapId !== 'campus' || !player.sittingAtBench) {
      occupancyChanged = stopCampusBenchRest(player) || occupancyChanged;
      continue;
    }

    const elapsed = now - player.benchRestStartedAt;
    const targetRecovery = Math.min(CAMPUS_BENCH_REST, Math.floor(elapsed / CAMPUS_BENCH_REST_STEP_MS));
    const pendingRecovery = targetRecovery - player.benchRestRecovered;
    if (pendingRecovery > 0 && player.stats.fatigue > 0) {
      const recovered = Math.min(pendingRecovery, player.stats.fatigue);
      player.stats.fatigue = clampStat(player.stats.fatigue - recovered);
      player.benchRestRecovered += recovered;
      emitPlayerState(id);
      const playerSocket = io.sockets.sockets.get(id);
      playerSocket?.emit('benchRestResult', {
        message: `Đang nghỉ: mệt −${recovered} (đã hồi ${player.benchRestRecovered}/${CAMPUS_BENCH_REST}).`,
        state: getPlayerState(player)
      });
    }

    if (elapsed >= CAMPUS_BENCH_REST_DURATION_MS
      || player.benchRestRecovered >= CAMPUS_BENCH_REST
      || player.stats.fatigue <= 0) {
      const totalRecovered = player.benchRestRecovered;
      occupancyChanged = stopCampusBenchRest(player) || occupancyChanged;
      io.sockets.sockets.get(id)?.emit('benchRestResult', {
        message: `Bạn nghỉ xong. Độ mệt đã giảm ${totalRecovered} điểm.`,
        state: getPlayerState(player)
      });
    }
  }
  if (occupancyChanged) emitCampusBenchOccupants();
}

setInterval(tickCampusBenchRest, 1_000);

function rewardReputation(id) {
  const player = players[id];
  const now = Date.now();
  if (!player || now - (reputationRewardedAt.get(id) || 0) < 60_000) return false;
  player.reputation += 1;
  reputationRewardedAt.set(id, now);
  emitPlayerState(id);
  return true;
}

function clampStat(value) { return Math.max(0, Math.min(100, value)); }

function tickPlayerStats() {
  const now = Date.now();
  for (const [id, player] of Object.entries(players)) {
    const elapsed = now - player.statsTickAt;
    player.statsTickAt = now;
    const statsBefore = `${player.stats.hunger}|${player.stats.strength}|${player.stats.fatigue}`;
    const isAuditorium = player.mapId === 'auditorium';
    const safeForHunger = ['khu-a', 'canteen', 'auditorium'].includes(player.mapId);
    const safeForMovementFatigue = ['khu-a', 'farm', 'auditorium'].includes(player.mapId);
    if (!safeForHunger) {
      player.hungerElapsed += elapsed;
      while (player.hungerElapsed >= 300_000) {
        player.hungerElapsed -= 300_000;
        player.stats.hunger = clampStat(player.stats.hunger - 1);
      }
    }
    const recentlyMoving = now - player.lastMovementAt < 30_000;
    if (!safeForMovementFatigue && recentlyMoving) {
      player.fatigueElapsed += elapsed;
      while (player.fatigueElapsed >= 120_000) {
        player.fatigueElapsed -= 120_000;
        player.stats.fatigue = clampStat(player.stats.fatigue + 1);
      }
    }
    if (isAuditorium) player.weaknessElapsed = 0;
    else if (player.stats.hunger === 0) {
      player.weaknessElapsed += elapsed;
      while (player.weaknessElapsed >= 60_000) {
        player.weaknessElapsed -= 60_000;
        player.stats.strength = clampStat(player.stats.strength - 1);
        player.stats.fatigue = clampStat(player.stats.fatigue + 1);
      }
    } else player.weaknessElapsed = 0;
    const statsAfter = `${player.stats.hunger}|${player.stats.strength}|${player.stats.fatigue}`;
    if (statsAfter !== statsBefore) emitPlayerState(id);
    if (player.mapId.startsWith('halloween:') && hasDepletedHalloweenStat(player)) {
      const playerSocket = io.sockets.sockets.get(id);
      if (playerSocket) returnHalloweenToCanteen(playerSocket, 'Một chỉ số đã về 0. Lượt Halloween kết thúc.');
    }
  }
}

setInterval(tickPlayerStats, 10_000);
setInterval(() => {
  for (const id of Object.keys(players)) schedulePlayerSave(id);
}, 60_000);

function getFarmSnapshot() {
  const now = Date.now();
  return Object.fromEntries([...farmPlots].map(([id, plot]) => [id, {
    ...plot,
    ageMs: plot.plantedAt ? now - plot.plantedAt : 0,
    condition: getCropCondition(plot, now),
    yield: getCropYield(plot, now),
    growthMs: FARM_GROWTH_MS
  }]));
}

function getCropCondition(plot, now = Date.now(), allowDeath = false) {
  if (!plot?.plantedAt) return 'empty';
  const ageMs = now - plot.plantedAt;
  if (ageMs < FARM_GROWTH_MS) return 'growing';
  if (ageMs < FARM_WILT_MS) return 'ripe';
  if (allowDeath && ageMs >= FARM_DEATH_MS) return 'dead';
  return 'wilted';
}

function getCropYield(plot, now = Date.now()) {
  const condition = getCropCondition(plot, now);
  if (condition === 'ripe') return 3;
  if (condition === 'wilted') return 1;
  return 0;
}

function applyFarmWorkCost(player, action) {
  const counterKey = action === 'plant' ? 'farmPlantCount' : 'farmHarvestCount';
  if (player[counterKey] < FARM_HARVEST_COST_EVERY) return '';
  player[counterKey] -= FARM_HARVEST_COST_EVERY;
  player.stats.strength = clampStat(player.stats.strength - 0.5);
  player.stats.fatigue = clampStat(player.stats.fatigue + 0.5);
  player.stats.hunger = clampStat(player.stats.hunger - 0.5);
  return ' Đủ 4 lần: sức mạnh −0.5, mệt +0.5, đói −0.5.';
}

function farmMembers() {
  return Object.entries(players).filter(([, player]) => player.mapId === 'farm');
}

function clearFarmMouseTimers() {
  if (farmMouseSpawnTimer) clearTimeout(farmMouseSpawnTimer);
  if (farmMouseBiteTimer) clearTimeout(farmMouseBiteTimer);
  if (farmMouseMoveTimer) clearInterval(farmMouseMoveTimer);
  farmMouseSpawnTimer = null;
  farmMouseBiteTimer = null;
  farmMouseMoveTimer = null;
}

function announceSystemMessage(message) {
  io.emit('systemChatMessage', { message: String(message).slice(0, 300) });
}

function announceFarmEvent(message) {
  io.to('map:farm').emit('farmEventMessage', { message: String(message).slice(0, 300) });
}

function scheduleFarmMouseBite(mouseId) {
  if (!activeFarmMouse || activeFarmMouse.id !== mouseId) return;
  farmMouseBiteTimer = setTimeout(() => {
    const currentMembers = farmMembers();
    if (!activeFarmMouse || activeFarmMouse.id !== mouseId || currentMembers.length === 0) return;
    const [id] = currentMembers[Math.floor(Math.random() * currentMembers.length)];
    const player = players[id];
    const lostCoins = Math.min(5, player.coins);
    player.coins = Math.max(0, player.coins - 5);
    schedulePlayerSave(id);
    emitPlayerState(id);
    const nickname = player.nickname || `Khách (${id.slice(0, 4)})`;
    announceFarmEvent(`🐭 ${nickname} bị chuột cắn, mất ${lostCoins} tiền đồng!`);
    io.to(id).emit('farmMouseBite', { message: `🐭 Chuột cắn túi, bạn mất ${lostCoins} tiền đồng.` });
    scheduleFarmMouseBite(mouseId);
  }, 15_000 + Math.floor(Math.random() * 25_001));
}

function catchFarmMouse(playerId, mouseId) {
  const player = players[playerId];
  if (!player || player.mapId !== 'farm' || !activeFarmMouse || mouseId !== activeFarmMouse.id) return false;
  const dx = player.x - activeFarmMouse.x;
  const dy = player.y - activeFarmMouse.y;
  if (dx * dx + dy * dy > 34 * 34) return false;
  activeFarmMouse = null;
  if (farmMouseBiteTimer) clearTimeout(farmMouseBiteTimer);
  if (farmMouseMoveTimer) clearInterval(farmMouseMoveTimer);
  farmMouseBiteTimer = null;
  farmMouseMoveTimer = null;
  player.reputation += 50;
  const inventory = playerInventories.get(playerId);
  if (inventory) inventory.items.eventGoldCoin = (Number(inventory.items.eventGoldCoin) || 0) + 1;
  player.stats.fatigue = clampStat(player.stats.fatigue + 1);
  player.stats.hunger = clampStat(player.stats.hunger - 1);
  emitPlayerState(playerId);
  if (inventory) io.to(playerId).emit('inventoryState', inventory);
  const nickname = player.nickname || `Khách (${playerId.slice(0, 4)})`;
  announceFarmEvent(`🐭 ${nickname} bắt được chuột! +50 danh tiếng, +1 Đồng vàng sự kiện; mệt +1, đói −1.`);
  io.to(playerId).emit('farmInteractionResult', { message: '🐭 Bắt được chuột! +50 danh tiếng, +1 Đồng vàng sự kiện, mệt +1, đói −1.' });
  io.to('map:farm').emit('farmMouseState', { active: false });
  scheduleFarmMouse();
  return true;
}

function scheduleFarmMouse() {
  if (activeFarmMouse || farmMouseSpawnTimer || farmMembers().length === 0) return;
  farmMouseSpawnTimer = setTimeout(() => {
    farmMouseSpawnTimer = null;
    const members = farmMembers();
    if (members.length === 0) return;
    activeFarmMouse = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      x: 95 + Math.random() * 610,
      y: 105 + Math.random() * 390,
      vx: (Math.random() < 0.5 ? -1 : 1) * (75 + Math.random() * 55),
      vy: (Math.random() < 0.5 ? -1 : 1) * (55 + Math.random() * 55),
      updatedAt: Date.now()
    };
    io.to('map:farm').emit('farmMouseState', { active: true, id: activeFarmMouse.id, x: activeFarmMouse.x, y: activeFarmMouse.y });
    announceFarmEvent('🐭 Chuột phá hoại xuất hiện! Di chuyển chạm vào chuột để bắt trước khi bị cắn. Thưởng: danh tiếng +50, +1 Đồng vàng sự kiện, độ mệt +1, độ đói −1.');
    farmMouseMoveTimer = setInterval(() => {
      if (!activeFarmMouse) return;
      const now = Date.now();
      const elapsed = Math.min(0.25, (now - activeFarmMouse.updatedAt) / 1000);
      activeFarmMouse.updatedAt = now;
      activeFarmMouse.x += activeFarmMouse.vx * elapsed;
      activeFarmMouse.y += activeFarmMouse.vy * elapsed;
      if (activeFarmMouse.x < 75 || activeFarmMouse.x > 725) activeFarmMouse.vx *= -1;
      if (activeFarmMouse.y < 85 || activeFarmMouse.y > 515) activeFarmMouse.vy *= -1;
      activeFarmMouse.x = Math.max(75, Math.min(725, activeFarmMouse.x));
      activeFarmMouse.y = Math.max(85, Math.min(515, activeFarmMouse.y));
      io.to('map:farm').emit('farmMouseState', { active: true, id: activeFarmMouse.id, x: activeFarmMouse.x, y: activeFarmMouse.y });
    }, 150);
    scheduleFarmMouseBite(activeFarmMouse.id);
  }, 90_000 + Math.floor(Math.random() * 90_001));
}

function isBlockedPosition(x, y) {
  const padding = 14;
  return CAMPUS_BUILDINGS.some((building) =>
    x >= building.x - padding && x <= building.x + building.width + padding &&
    y >= building.y - padding && y <= building.y + building.height + padding
  );
}

function isValidAvatar(value) {
  return typeof value === 'string' && value.length <= 2_800_000 &&
    /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
}

function isKhuCScheduleOpen() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);
  const time = hour * 60 + minute;
  return (time >= 420 && time < 690) || (time >= 780 && time < 1020);
}

function getVietnamTimeMinutes() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date());
  return Number(parts.find((part) => part.type === 'hour')?.value || 0) * 60
    + Number(parts.find((part) => part.type === 'minute')?.value || 0);
}

function isHalloweenNight() {
  const minutes = getVietnamTimeMinutes();
  return minutes >= 18 * 60 || minutes < 6 * 60;
}

function ensureHalloweenProgress(id) {
  if (!halloweenProgress.has(id)) {
    halloweenProgress.set(id, {
      opened: new Set(), pumpkinFound: false, pendingPumpkins: 0, openedCount: 0,
      pumpkinBox: Math.floor(Math.random() * HALLOWEEN_BOX_COUNT)
    });
  }
  return halloweenProgress.get(id);
}

function getMapPlayers(mapId) {
  return Object.fromEntries(Object.entries(players).filter(([, player]) => player.mapId === mapId));
}

function hasDepletedHalloweenStat(player) {
  const stats = player?.stats || {};
  // Hunger and strength run out at 0; fatigue is exhausted at its 100-point cap.
  // Fatigue starts at 0, so treating every zero as depletion would eject players immediately.
  return Number(stats.hunger) <= 0 || Number(stats.strength) <= 0 || Number(stats.fatigue) >= 100;
}

function getHalloweenLeaderboard() {
  return [...halloweenFinders.values()]
    .map((finder) => ({ ...finder, count: finder.count + (Number(halloweenProgress.get(finder.id)?.pendingPumpkins) || 0) }))
    .filter((finder) => finder.count > 0)
    .sort((a, b) => b.count - a.count || a.foundAt - b.foundAt)
    .map(({ nickname, id, count }) => ({ nickname, id: id.slice(0, 4), count }));
}

function returnHalloweenToCanteen(socket, reason = '') {
  const player = players[socket.id];
  const inventory = playerInventories.get(socket.id);
  const progress = halloweenProgress.get(socket.id);
  if (!player || !inventory || !player.mapId.startsWith('halloween:')) return false;
  const oldMapId = player.mapId;
  const banked = Math.max(0, Number(progress?.pendingPumpkins) || 0);
  if (banked) {
    inventory.items.halloweenPumpkin = (Number(inventory.items.halloweenPumpkin) || 0) + banked;
    const finder = halloweenFinders.get(socket.id);
    if (finder) finder.count += banked;
  }
  halloweenProgress.delete(socket.id);
  socket.leave(`map:${oldMapId}`);
  socket.to(`map:${oldMapId}`).emit('playerLeftMap', socket.id);
  Object.assign(player, { x: 650, y: 410, mapId: 'canteen' });
  socket.join('map:canteen');
  socket.emit('mapChanged', { mapId: 'canteen', players: getMapPlayers('canteen') });
  socket.to('map:canteen').emit('newPlayer', { id: socket.id, ...player });
  socket.emit('inventoryState', inventory);
  emitPlayerState(socket.id);
  if (halloweenFinders.size) io.emit('halloweenLeaderboard', getHalloweenLeaderboard());
  const summary = `${reason ? `${reason} ` : ''}Đã gửi ${banked} bí ngô Halloween vào túi. Tổng túi: ${inventory.items.halloweenPumpkin || 0}.`;
  socket.emit('systemChatMessage', { message: summary });
  return true;
}

io.on('connection', (socket) => {
  console.log('Người chơi kết nối:', socket.id);
  let lastFloatingEmoteAt = 0;
  const savedProfile = socket.data.savedProfile;
  const savedStats = savedProfile?.stats && typeof savedProfile.stats === 'object' ? savedProfile.stats : {};
  const savedInventory = savedProfile?.inventory && typeof savedProfile.inventory === 'object' ? savedProfile.inventory : {};
  const defaultInventory = {
    seeds: { carrot: 3, tomato: 3, corn: 3, strawberry: 3 },
    produce: { carrot: 0, tomato: 0, corn: 0, strawberry: 0 },
    items: {}
  };
  const restoredInventory = {
    seeds: { ...defaultInventory.seeds },
    produce: { ...defaultInventory.produce },
    items: {}
  };
  for (const key of Object.keys(restoredInventory.seeds)) {
    restoredInventory.seeds[key] = Math.max(0, Math.floor(Number(savedInventory.seeds?.[key] ?? restoredInventory.seeds[key]) || 0));
    restoredInventory.produce[key] = Math.max(0, Math.floor(Number(savedInventory.produce?.[key]) || 0));
  }
  if (savedInventory.items && typeof savedInventory.items === 'object') {
    for (const [key, value] of Object.entries(savedInventory.items)) {
      if (/^[A-Za-z0-9_-]{1,48}$/.test(key)) restoredInventory.items[key] = Math.max(0, Math.floor(Number(value) || 0));
    }
  }

  // 1. Khởi tạo thông tin người chơi (gồm tọa độ và avatar mặc định là null)
  players[socket.id] = {
    x: Math.floor(Math.random() * 70) + 330,
    y: Math.floor(Math.random() * 70) + 320,
    avatar: null,
    nickname: '',
    mapId: 'campus',
    stats: {
      hunger: clampStat(Number(savedStats.hunger ?? 100)),
      strength: clampStat(Number(savedStats.strength ?? 100)),
      fatigue: clampStat(Number(savedStats.fatigue ?? 0))
    },
    coins: Math.max(0, Math.floor(Number(savedProfile?.coins ?? 1500) || 0)),
    reputation: Math.max(0, Math.floor(Number(savedProfile?.reputation) || 0)),
    farmPlantCount: Math.max(0, Math.floor(Number(savedProfile?.farm_plant_count) || 0)),
    farmHarvestCount: Math.max(0, Math.floor(Number(savedProfile?.farm_harvest_count) || 0)),
    hungerElapsed: 0,
    fatigueElapsed: 0,
    weaknessElapsed: 0,
    statsTickAt: Date.now(),
    lastMovementAt: Date.now(),
    sittingAtBench: '',
    benchRestStartedAt: 0,
    benchRestRecovered: 0,
    lastFarmActionAt: 0
  };
  socket.join('map:campus');
  playerInventories.set(socket.id, restoredInventory);

  // Gửi toàn bộ danh sách người chơi hiện tại (kèm avatar cũ nếu có) cho người mới
  socket.emit('currentPlayers', getMapPlayers('campus'));
  socket.emit('playerIdentity', { token: socket.data.playerToken });
  socket.emit('playerPersistenceStatus', {
    enabled: isSupabaseConfigured,
    available: Boolean(socket.data.profilePersistenceReady),
    message: socket.data.profilePersistenceError || (!isSupabaseConfigured ? 'Server chưa được cấu hình Supabase.' : '')
  });
  socket.emit('inventoryState', playerInventories.get(socket.id));
  socket.emit('playerState', getPlayerState(players[socket.id]));
  socket.emit('campusBenchOccupancy', getCampusBenchOccupants());
  if (halloweenFinders.size) socket.emit('halloweenLeaderboard', getHalloweenLeaderboard());
  emitSessionLeaderboard();
  
  // Thông báo cho các người chơi khác về sự xuất hiện của người mới (kèm avatar mặc định)
  socket.to('map:campus').emit('newPlayer', {
    id: socket.id, 
    x: players[socket.id].x, 
    y: players[socket.id].y,
    avatar: players[socket.id].avatar,
    nickname: players[socket.id].nickname,
    mapId: 'campus'
  });

  socket.on('enterCampusMap', (mapId) => {
    if (typeof mapId !== 'string') return;
    if (players[socket.id]?.mapId !== 'campus') return;
    if (mapId === 'dormitory' || mapId === 'personal-farm') {
      socket.emit('mapChangeDenied', 'Khu vực cá nhân sẽ yêu cầu đăng nhập; tính năng đang được lên kế hoạch.');
      return;
    }
    if (CLOSED_MAP_IDS.has(mapId)) {
      socket.emit('mapChangeDenied', 'Khu vực này hiện chưa mở.');
      return;
    }
    if (!OPEN_MAP_IDS.has(mapId)) {
      socket.emit('mapChangeDenied', 'Không tìm thấy bản đồ khu vực này.');
      return;
    }
    if (mapId === 'khu-c' && !isKhuCScheduleOpen()) {
      socket.emit('mapChangeDenied', 'Khu C đang đóng. Lịch mở: 07:00–11:30 và 13:00–17:00 giờ Việt Nam.');
      return;
    }
    const previousMapId = players[socket.id]?.mapId || 'campus';
    const wasSittingAtBench = Boolean(players[socket.id]?.sittingAtBench);
    if (players[socket.id]) stopCampusBenchRest(players[socket.id]);
    socket.leave(`map:${previousMapId}`);
    socket.to(`map:${previousMapId}`).emit('playerLeftMap', socket.id);
    if (previousMapId === 'campus' && wasSittingAtBench) emitCampusBenchOccupants();
    const spawn = mapId === 'farm' ? { x: 400, y: 430 } : { x: 400, y: 300 };
    Object.assign(players[socket.id], spawn, { mapId });
    socket.join(`map:${mapId}`);
    socket.emit('mapChanged', { mapId, players: getMapPlayers(mapId) });
    socket.to(`map:${mapId}`).emit('newPlayer', { id: socket.id, ...players[socket.id] });
    if (mapId === 'canteen') void emitCanteenBestSellingProducts(socket);
    if (mapId === 'khu-c') socket.emit('sessionLeaderboard', getSessionLeaderboard());
    emitSessionLeaderboard();
    if (mapId === 'farm') {
      socket.emit('farmState', getFarmSnapshot());
      socket.emit('farmMouseState', { active: Boolean(activeFarmMouse), id: activeFarmMouse?.id, x: activeFarmMouse?.x, y: activeFarmMouse?.y });
      if (activeFarmMouse) {
        socket.emit('farmEventMessage', { message: '🐭 Chuột đang phá hoại vườn cộng đồng! Di chuyển chạm vào chuột để bắt trước khi bị cắn. Thưởng: danh tiếng +50, +1 Đồng vàng sự kiện, độ mệt +1, độ đói −1.' });
      }
      scheduleFarmMouse();
    }
  });

  socket.on('returnToCampus', () => {
    const previousMapId = players[socket.id]?.mapId || 'campus';
    if (previousMapId === 'campus') return;
    if (previousMapId.startsWith('halloween:')) {
      returnHalloweenToCanteen(socket, 'Bạn rời tầng Halloween.');
      return;
    }
    socket.leave(`map:${previousMapId}`);
    socket.to(`map:${previousMapId}`).emit('playerLeftMap', socket.id);
    Object.assign(players[socket.id], { x: 400, y: 250, mapId: 'campus' });
    socket.join('map:campus');
    emitSessionLeaderboard();
    socket.emit('mapChanged', { mapId: 'campus', players: getMapPlayers('campus') });
    socket.to('map:campus').emit('newPlayer', { id: socket.id, ...players[socket.id] });
    if (previousMapId === 'farm' && farmMembers().length === 0) {
      clearFarmMouseTimers();
      activeFarmMouse = null;
      io.to('map:farm').emit('farmMouseState', { active: false });
    }
  });

  // 2. Lắng nghe di chuyển của người chơi
  socket.on('playerMovement', (data) => {
    if (players[socket.id] && data && Number.isFinite(data.x) && Number.isFinite(data.y)) {
      const wasSittingAtBench = Boolean(players[socket.id].sittingAtBench);
      const x = Math.max(15, Math.min(785, data.x));
      const y = Math.max(15, Math.min(585, data.y));
      if (players[socket.id].mapId === 'campus' && isBlockedPosition(x, y)) return;
      stopCampusBenchRest(players[socket.id]);
      if (wasSittingAtBench) {
        socket.emit('benchRestResult', { message: 'Bạn đứng dậy; lượt nghỉ đã dừng.' });
      }
      players[socket.id].x = x;
      players[socket.id].y = y;
      players[socket.id].lastMovementAt = Date.now();
      
      socket.to(`map:${players[socket.id].mapId}`).emit('playerMoved', {
        id: socket.id, 
        x,
        y
      });
      if (wasSittingAtBench) emitCampusBenchOccupants();
      if (players[socket.id].mapId === 'farm' && activeFarmMouse) {
        const dx = x - activeFarmMouse.x;
        const dy = y - activeFarmMouse.y;
        if (dx * dx + dy * dy <= 34 * 34) catchFarmMouse(socket.id, activeFarmMouse.id);
      }
    }
  });

  socket.on('getFarmState', () => {
    socket.emit('farmState', getFarmSnapshot());
  });

  socket.on('interactFarmPlot', (payload = {}) => {
    if (!payload || typeof payload !== 'object') return;
    const { plotId, action, cropKey } = payload;
    const player = players[socket.id];
    const plot = farmPlots.get(plotId);
    if (!player || !plot || !['plant', 'harvest'].includes(action)) return;
    if (player.mapId !== 'farm') {
      socket.emit('farmInteractionResult', { message: 'Hãy vào bản đồ nông trại cộng đồng để tương tác.' });
      return;
    }
    const actionDelay = 800 + player.stats.fatigue * 25;
    if (Date.now() - player.lastFarmActionAt < actionDelay) {
      socket.emit('farmInteractionResult', { message: 'Hãy chậm lại và nghỉ một chút trước hành động tiếp theo.' });
      return;
    }
    player.lastFarmActionAt = Date.now();
    const inventory = playerInventories.get(socket.id);

    if (action === 'plant') {
      if (plot.plantedAt) {
        socket.emit('farmInteractionResult', { message: 'Luống này đang có cây trồng.' });
        return;
      }
      if (!Object.hasOwn(FARM_CROP_KEYS, cropKey) || inventory.seeds[cropKey] < 1) {
        socket.emit('farmInteractionResult', { message: 'Bạn không còn hạt giống loại này trong túi.' });
        return;
      }
      inventory.seeds[cropKey] -= 1;
      plot.crop = FARM_CROP_KEYS[cropKey];
      plot.cropKey = cropKey;
      plot.plantedAt = Date.now();
      plot.plantedBy = players[socket.id].nickname || 'Một sinh viên';
      player.farmPlantCount += 1;
      const farmCostMessage = applyFarmWorkCost(player, 'plant');
      socket.emit('farmInteractionResult', { message: `Bạn đã gieo ${plot.crop}. Cây sẽ lớn sau 30 giây.${farmCostMessage}` });
      emitPlayerState(socket.id);
    } else {
      if (!plot.plantedAt) {
        socket.emit('farmInteractionResult', { message: 'Luống này chưa được gieo hạt.' });
        return;
      }
      const condition = getCropCondition(plot);
      if (condition === 'growing') {
        const remainingMs = FARM_GROWTH_MS - (Date.now() - plot.plantedAt);
        socket.emit('farmInteractionResult', { message: `Cây cần thêm ${Math.ceil(remainingMs / 1000)} giây để lớn.` });
        return;
      }
      const harvestedCrop = plot.crop;
      const cropKey = plot.cropKey;
      const yieldCount = getCropYield(plot);
      if (Object.hasOwn(inventory.produce, cropKey)) inventory.produce[cropKey] += yieldCount;
      player.farmHarvestCount += 1;
      const farmCostMessage = applyFarmWorkCost(player, 'harvest');
      plot.crop = '';
      plot.cropKey = '';
      plot.plantedAt = 0;
      plot.plantedBy = '';
      socket.emit('farmInteractionResult', { message: condition === 'dead'
        ? `Cây ${harvestedCrop} đã chết, thu hoạch được 0.${farmCostMessage}`
        : `Đã thu hoạch ${yieldCount} ${harvestedCrop} (${condition === 'wilted' ? 'cây héo' : 'cây khỏe'}).${farmCostMessage}` });
    }
    emitPlayerState(socket.id);
    socket.emit('inventoryState', inventory);
    io.to('map:farm').emit('farmState', getFarmSnapshot());
  });

  socket.on('catchFarmMouse', (mouseId) => {
    catchFarmMouse(socket.id, mouseId);
  });

  socket.on('farmShopAction', (payload = {}) => {
    if (players[socket.id]?.mapId !== 'khu-a') return socket.emit('serviceResult', { message: 'Hãy đến quầy thương nhân ở Khu A.' });
    const { action, cropKey } = payload || {};
    const quantity = Number(payload?.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return socket.emit('serviceResult', { message: 'Số lượng cần là số nguyên từ 1 đến 99.' });
    }
    const price = Object.hasOwn(CROP_PRICES, cropKey) ? CROP_PRICES[cropKey] : 0;
    const crop = Object.hasOwn(FARM_CROP_KEYS, cropKey) ? FARM_CROP_KEYS[cropKey] : '';
    const inventory = playerInventories.get(socket.id);
    const player = players[socket.id];
    if (!player || !inventory || !price || !crop) return;
    if (action === 'buy-seed') {
      const total = price * quantity;
      if (player.coins < total) return socket.emit('serviceResult', { message: `Bạn cần ${total} tiền đồng để mua ${quantity} gói.` });
      player.coins -= total;
      inventory.seeds[cropKey] = (inventory.seeds[cropKey] || 0) + quantity;
      emitSessionLeaderboard();
      socket.emit('serviceResult', { message: `Đã mua ${quantity} gói hạt ${crop}, tổng ${total} tiền đồng.`, state: getPlayerState(player), inventory });
      schedulePlayerSave(socket.id);
    } else if (action === 'sell-crop') {
      if ((inventory.produce[cropKey] || 0) < quantity) return socket.emit('serviceResult', { message: `Bạn không đủ ${quantity} ${crop} trong túi.` });
      const total = price * quantity;
      inventory.produce[cropKey] -= quantity;
      player.coins += total;
      emitSessionLeaderboard();
      socket.emit('serviceResult', { message: `Đã bán ${quantity} ${crop}, nhận ${total} tiền đồng.`, state: getPlayerState(player), inventory });
      schedulePlayerSave(socket.id);
    }
  });

  socket.on('useRecoveryStation', () => {
    const player = players[socket.id];
    if (!player || player.mapId !== 'khu-a') return socket.emit('serviceResult', { message: 'Trạm hồi phục đặt tại Khu A.' });
    if (player.coins < 500) return socket.emit('serviceResult', { message: 'Cần 500 tiền đồng để dùng gói hồi phục.' });
    player.coins -= 500;
    player.stats.hunger = clampStat(player.stats.hunger + 50);
    player.stats.strength = clampStat(player.stats.strength + 50);
    player.stats.fatigue = clampStat(player.stats.fatigue - 50);
    emitSessionLeaderboard();
    socket.emit('serviceResult', { message: 'Đã dùng gói hồi phục: +50 đói, +50 sức mạnh, -50 mệt.', state: getPlayerState(player) });
    schedulePlayerSave(socket.id);
  });

  socket.on('restAtCampusBench', (benchId) => {
    const player = players[socket.id];
    const bench = CAMPUS_BENCHES.find((item) => item.id === benchId);
    if (!player || player.mapId !== 'campus' || !bench) {
      return socket.emit('benchRestResult', { message: 'Ghế nghỉ chỉ dùng được tại sân trường.' });
    }
    const distance = Math.hypot(player.x - bench.x, player.y - bench.y);
    if (distance > 55) return socket.emit('benchRestResult', { message: 'Hãy đến gần ghế để ngồi nghỉ.' });
    const occupiedByOther = Object.entries(players).some(([id, otherPlayer]) =>
      id !== socket.id && otherPlayer.mapId === 'campus' && otherPlayer.sittingAtBench === benchId
    );
    if (occupiedByOther) return socket.emit('benchRestResult', { message: 'Ghế đang có người ngồi.' });
    const now = Date.now();
    if (player.sittingAtBench === benchId && player.benchRestStartedAt) {
      return socket.emit('benchRestResult', {
        message: `Bạn đang nghỉ: đã giảm ${player.benchRestRecovered || 0}/${CAMPUS_BENCH_REST} điểm mệt.`,
        state: getPlayerState(player)
      });
    }
    if (player.stats.fatigue <= 0) {
      return socket.emit('benchRestResult', { message: 'Bạn chưa mệt, không cần nghỉ lúc này.', state: getPlayerState(player) });
    }
    if (now - (player.lastBenchRestAt || 0) < CAMPUS_BENCH_COOLDOWN_MS) {
      return socket.emit('benchRestResult', { message: 'Bạn vừa nghỉ xong, hãy chờ một chút.' });
    }
    if (player.sittingAtBench && player.sittingAtBench !== benchId) stopCampusBenchRest(player);
    player.sittingAtBench = benchId;
    player.lastBenchRestAt = now;
    player.benchRestStartedAt = now;
    player.benchRestRecovered = 0;
    emitCampusBenchOccupants();
    socket.emit('benchRestResult', {
      message: 'Bạn bắt đầu nghỉ. Độ mệt giảm dần 1 điểm mỗi 3 giây, tối đa 10 điểm trong 30 giây. Di chuyển sẽ dừng nghỉ.',
      state: getPlayerState(player)
    });
  });

  socket.on('canteenPurchase', (payload = {}) => {
    const player = players[socket.id];
    const inventory = playerInventories.get(socket.id);
    if (!player || player.mapId !== 'canteen') return socket.emit('serviceResult', { message: 'Hãy đến Căn tin để mua thực phẩm.' });
    if (!inventory) return;
    const { itemId, currency } = payload || {};
    const quantity = Number(payload?.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return socket.emit('serviceResult', { message: 'Số lượng cần là số nguyên từ 1 đến 99.' });
    }
    const item = Object.hasOwn(FOOD_MENU, itemId) ? FOOD_MENU[itemId] : null;
    if (!item || !['coins', 'reputation'].includes(currency)) return;
    const ownedCount = Number(inventory.items[itemId]) || 0;
    if (ownedCount + quantity > 10) return socket.emit('serviceResult', { message: `Túi chỉ chứa tối đa 10 món ${itemId} mỗi loại. Bạn đang có ${ownedCount}.` });
    const cost = item[currency] * quantity;
    if (player[currency] < cost) return socket.emit('serviceResult', { message: `Bạn không đủ ${currency === 'coins' ? 'tiền đồng' : 'danh tiếng'}.` });
    player[currency] -= cost;
    inventory.items[itemId] = ownedCount + quantity;
    emitSessionLeaderboard();
    socket.emit('serviceResult', {
      message: `Đã mua ${quantity} ${itemId} và cất vào túi (${inventory.items[itemId]}/10). Dùng vật phẩm trong túi để hồi chỉ số.`,
      state: getPlayerState(player), inventory
    });
    schedulePlayerSave(socket.id);

    // Record only server-validated, successful purchases. Prices come from FOOD_MENU,
    // never from values supplied by the client.
    void recordCanteenSale(socket.id, {
      itemId,
      quantity,
      unitPrice: item[currency],
      currency,
      totalPrice: cost
    });
    // Refresh the quick-buy recommendations after a purchase is recorded.
    void recordCanteenSale(socket.id, {
      itemId,
      quantity,
      unitPrice: item[currency],
      currency,
      totalPrice: cost
    }).then(() => emitCanteenBestSellingProducts(io));
  });

  socket.on('buyElevatorTicket', () => {
    const player = players[socket.id];
    const inventory = playerInventories.get(socket.id);
    if (!player || player.mapId !== 'canteen' || !inventory) return socket.emit('serviceResult', { message: 'Máy bán thẻ chỉ dùng được tại Căng tin.' });
    if (Math.hypot(player.x - 650, player.y - 350) > 85) return socket.emit('serviceResult', { message: 'Hãy đến gần máy bán thẻ trong Căng tin.' });
    if (isKhuCScheduleOpen()) return socket.emit('serviceResult', { message: 'Máy chỉ hoạt động ngoài giờ giảng đường: 11:30–13:00 và sau 17:00.' });
    if ((Number(inventory.items.eventGoldCoin) || 0) < 1) return socket.emit('serviceResult', { message: 'Cần 1 đồng vàng sự kiện để đổi thẻ thang máy.' });
    inventory.items.eventGoldCoin -= 1;
    inventory.items.elevatorTicket = (Number(inventory.items.elevatorTicket) || 0) + 1;
    socket.emit('serviceResult', { message: 'Đổi thành công 1 thẻ thang máy. Thẻ dùng được một lần.', inventory });
    schedulePlayerSave(socket.id);
  });

  socket.on('useElevatorTicket', () => {
    const player = players[socket.id];
    const inventory = playerInventories.get(socket.id);
    if (!player || player.mapId !== 'canteen' || !inventory) return socket.emit('serviceResult', { message: 'Hãy đến máy bán thẻ ở Căng tin.' });
    if (Math.hypot(player.x - 650, player.y - 350) > 85) return socket.emit('serviceResult', { message: 'Hãy đến gần máy bán thẻ trong Căng tin.' });
    if (isKhuCScheduleOpen()) return socket.emit('serviceResult', { message: 'Thang máy sự kiện chỉ hoạt động ngoài giờ giảng đường.' });
    if ((Number(inventory.items.elevatorTicket) || 0) < 1) return socket.emit('serviceResult', { message: 'Bạn chưa có thẻ thang máy.' });
    inventory.items.elevatorTicket -= 1;

    if (isHalloweenNight()) {
      const previousMapId = player.mapId;
      const mapId = `halloween:${socket.id}`;
      const wasSittingAtBench = Boolean(player.sittingAtBench);
      stopCampusBenchRest(player);
      socket.leave(`map:${previousMapId}`);
      socket.to(`map:${previousMapId}`).emit('playerLeftMap', socket.id);
      if (previousMapId === 'campus' && wasSittingAtBench) emitCampusBenchOccupants();
      Object.assign(player, { x: 400, y: 500, mapId });
      socket.join(`map:${mapId}`);
      socket.emit('mapChanged', { mapId, players: getMapPlayers(mapId) });
      const progress = ensureHalloweenProgress(socket.id);
      socket.emit('halloweenState', { opened: [...progress.opened], total: HALLOWEEN_BOX_COUNT });
      socket.emit('inventoryState', inventory);
      schedulePlayerSave(socket.id);
      socket.emit('systemChatMessage', { message: 'Thẻ đã được sử dụng. Bạn đã vào tầng sự kiện Halloween riêng với 50 hộp quà.' });
      return;
    }

    const minutes = getVietnamTimeMinutes();
    let message;
    if (minutes >= 11 * 60 + 30 && minutes < 13 * 60) {
      inventory.items.recoveryMeal = (Number(inventory.items.recoveryMeal) || 0) + 1;
      message = 'Thẻ đã dùng một lần: nhận 1 phần ăn hồi phục (+20 đói, +10 sức mạnh khi sử dụng).';
    } else if (minutes >= 6 * 60 && minutes < 7 * 60) {
      inventory.items.recoveryDrink = (Number(inventory.items.recoveryDrink) || 0) + 1;
      message = 'Thẻ đã dùng một lần: nhận 1 nước hồi phục (−20 mệt khi sử dụng).';
    } else {
      inventory.items.eventLantern = (Number(inventory.items.eventLantern) || 0) + 1;
      message = 'Thẻ đã dùng một lần: nhận 1 đèn lồng sự kiện.';
    }
    emitPlayerState(socket.id);
    socket.emit('serviceResult', { message, state: getPlayerState(player), inventory });
    schedulePlayerSave(socket.id);
  });

  socket.on('useInventoryItem', (itemId) => {
    const player = players[socket.id];
    const inventory = playerInventories.get(socket.id);
    if (!player || !inventory || ![...Object.keys(FOOD_MENU), 'recoveryMeal', 'recoveryDrink'].includes(itemId)) return;
    if ((Number(inventory.items[itemId]) || 0) < 1) return socket.emit('serviceResult', { message: 'Bạn không còn vật phẩm hồi phục này.' });
    inventory.items[itemId] -= 1;
    const item = FOOD_MENU[itemId];
    if (item) {
      if (item.hunger) player.stats.hunger = clampStat(player.stats.hunger + item.hunger);
      if (item.strength) player.stats.strength = clampStat(player.stats.strength + item.strength);
      if (item.fatigue) player.stats.fatigue = clampStat(player.stats.fatigue + item.fatigue);
    } else if (itemId === 'recoveryMeal') {
      player.stats.hunger = clampStat(player.stats.hunger + 20);
      player.stats.strength = clampStat(player.stats.strength + 10);
    } else {
      player.stats.fatigue = clampStat(player.stats.fatigue - 20);
    }
    emitPlayerState(socket.id);
    const itemNames = { bread: 'bánh mì', water: 'nước suối', bao: 'bánh bao', soda: 'nước ngọt', recoveryMeal: 'phần ăn hồi phục', recoveryDrink: 'nước hồi phục' };
    socket.emit('serviceResult', {
      message: itemId === 'recoveryMeal' ? 'Đã dùng phần ăn hồi phục: +20 đói, +10 sức mạnh.'
        : itemId === 'recoveryDrink' ? 'Đã dùng nước hồi phục: −20 mệt.'
          : `Đã dùng ${itemNames[itemId] || itemId}. ${item.hunger ? `Đói +${item.hunger}. ` : ''}${item.strength ? `Sức mạnh +${item.strength}. ` : ''}${item.fatigue ? `Mệt ${item.fatigue}.` : ''}`,
      state: getPlayerState(player), inventory
    });
    schedulePlayerSave(socket.id);
  });

  socket.on('openHalloweenBox', (boxIndex) => {
    const player = players[socket.id];
    const inventory = playerInventories.get(socket.id);
    const progress = halloweenProgress.get(socket.id);
    if (!player || !inventory || !progress || player.mapId !== `halloween:${socket.id}`) return;
    if (!Number.isInteger(boxIndex) || boxIndex < 0 || boxIndex >= HALLOWEEN_BOX_COUNT) return;
    const boxX = 112 + (boxIndex % 10) * 64;
    const boxY = 242 + Math.floor(boxIndex / 10) * 54;
    if (Math.hypot(player.x - boxX, player.y - boxY) > 58) return;
    if (progress.opened.has(boxIndex)) return socket.emit('halloweenBoxResult', { message: 'Hộp này đã được mở rồi.' });
    progress.opened.add(boxIndex);
    progress.openedCount = (Number(progress.openedCount) || 0) + 1;
    const statKeys = ['hunger', 'strength', 'fatigue'];
    const statNames = { hunger: 'đói', strength: 'sức mạnh', fatigue: 'mệt' };
    let message = `Mở hộp ${boxIndex + 1}.`;
    if (progress.openedCount % 4 === 0) {
      const effect = Math.floor(Math.random() * 3);
      if (effect === 2) {
        player.stats.fatigue = clampStat(player.stats.fatigue + 1);
        message += ' Đủ 4 lượt mở hộp: độ mệt +1.';
      } else {
        const statKey = effect === 0 ? 'hunger' : 'strength';
        player.stats[statKey] = clampStat(player.stats[statKey] - 1);
        message += ` Đủ 4 lượt mở hộp: ${statNames[statKey]} −1.`;
      }
    }
    let foundPumpkin = false;
    if (!progress.pumpkinFound && progress.pumpkinBox === boxIndex) {
      progress.pumpkinFound = true;
      progress.pendingPumpkins = (Number(progress.pendingPumpkins) || 0) + 1;
      foundPumpkin = true;
      const finder = halloweenFinders.get(socket.id) || {
        nickname: player.nickname || `Khách (${socket.id.slice(0, 4)})`, id: socket.id, count: 0, foundAt: Date.now()
      };
      finder.nickname = player.nickname || finder.nickname;
      halloweenFinders.set(socket.id, finder);
      message += ' Bạn tìm thấy Bí ngô Halloween!';
      io.emit('systemChatMessage', { message: `🎃 ${finder.nickname} đã tìm thấy Bí ngô Halloween trong sự kiện thang máy!` });
      io.emit('halloweenLeaderboard', getHalloweenLeaderboard());
    }

    const spiderAppeared = Math.random() < 0.05;
    let spiderStolePumpkin = false;
    if (spiderAppeared) {
      const spiderStatKey = statKeys[Math.floor(Math.random() * statKeys.length)];
      const spiderLoss = Math.random() < 0.5 ? 1 : 2;
      player.stats[spiderStatKey] = clampStat(player.stats[spiderStatKey] - spiderLoss);
      message += ` 🕷️ Nhện xuất hiện, trừ ${spiderLoss} điểm ${statNames[spiderStatKey]}.`;
      if (progress.pendingPumpkins > 0) {
        progress.pendingPumpkins = 0;
        progress.pumpkinFound = false;
        spiderStolePumpkin = true;
        message += ' Nhện lấy mất bí ngô của lượt này!';
      }
    }

    emitPlayerState(socket.id);
    if (hasDepletedHalloweenStat(player)) {
      socket.emit('halloweenBoxResult', { message: `${message} Có chỉ số về 0, bạn được đưa về Căng tin.`, foundPumpkin, spider: spiderAppeared, spiderStolePumpkin });
      returnHalloweenToCanteen(socket, 'Một chỉ số đã về 0. Lượt Halloween kết thúc.');
      return;
    }
    if (spiderAppeared) {
      progress.opened.clear();
      progress.pumpkinFound = false;
      progress.pendingPumpkins = 0;
      progress.pumpkinBox = Math.floor(Math.random() * HALLOWEEN_BOX_COUNT);
      message += ' Các chỉ số còn trên 0; bản đồ đã làm mới với 50 hộp mới.';
    }
    if (foundPumpkin && !spiderStolePumpkin) {
      // Finding the pumpkin immediately starts a fresh stage; unopened boxes are discarded.
      progress.opened.clear();
      progress.pumpkinFound = false;
      progress.pumpkinBox = Math.floor(Math.random() * HALLOWEEN_BOX_COUNT);
      message += ' Màn mới đã được tạo tự động với 50 hộp quà mới!';
    }
    socket.emit('halloweenState', { opened: [...progress.opened], total: HALLOWEEN_BOX_COUNT });
    socket.emit('halloweenBoxResult', { message, foundPumpkin, spider: spiderAppeared, spiderStolePumpkin });
  });

  socket.on('sendPlayerEmote', (emoji) => {
    if (!players[socket.id] || !quickFloatingEmotes.has(emoji)) return;
    const now = Date.now();
    if (now - lastFloatingEmoteAt < 600) return;
    lastFloatingEmoteAt = now;
    io.to(`map:${players[socket.id].mapId}`).emit('playerFloatingEmote', { id: socket.id, emoji });
  });

  // 3. Lắng nghe tin nhắn chat
  socket.on('sendChatMessage', (message) => {
    if (typeof message !== 'string') return;
    message = message.trim().slice(0, 300);
    const player = players[socket.id];
    if (!message || !player) return;
    const messageId = `${socket.id}:${++nextMessageId}`;
    const mapId = player.mapId;
    recentMessages.set(messageId, { mapId, reactions: new Map() });
    if (recentMessages.size > 100) recentMessages.delete(recentMessages.keys().next().value);
    io.to(`map:${mapId}`).emit('chatMessage', { id: socket.id, nickname: player.nickname || '', messageId, message, mapId });
    rewardReputation(socket.id);
  });

  socket.on('sendPrivateMessage', (payload = {}) => {
    if (!payload || typeof payload !== 'object') return;
    const { to } = payload;
    if (typeof to !== 'string' || to === socket.id || !players[to]) {
      socket.emit('privateMessageError', 'Người chơi này không còn trong phiên.');
      return;
    }
    if (typeof payload.message !== 'string') return;
    const message = payload.message.trim().slice(0, 300);
    if (!message) return;

    const messageId = `${socket.id}:private:${++nextMessageId}`;
    recentPrivateMessages.set(messageId, {
      senderId: socket.id,
      recipientId: to,
      reactions: new Map()
    });
    if (recentPrivateMessages.size > 100) {
      recentPrivateMessages.delete(recentPrivateMessages.keys().next().value);
    }
    const sender = {
      id: socket.id,
      nickname: players[socket.id].nickname || '',
      messageId,
      message,
      sentAt: new Date().toISOString(),
      reactions: []
    };
    socket.to(to).emit('privateChatMessage', { ...sender, peerId: socket.id });
    socket.emit('privateChatMessage', { ...sender, peerId: to, isMe: true });
    rewardReputation(socket.id);
  });

  socket.on('reactToMessage', (payload = {}) => {
    if (!payload || typeof payload !== 'object') return;
    const { messageId, emoji } = payload;
    if (typeof messageId !== 'string' || !reactionEmojis.has(emoji)) return;
    const message = recentMessages.get(messageId);
    if (!message || !players[socket.id] || message.mapId !== players[socket.id].mapId) return;
    if (!message.reactions.has(emoji)) message.reactions.set(emoji, new Set());
    const users = message.reactions.get(emoji);
    if (users.has(socket.id)) users.delete(socket.id);
    else users.add(socket.id);
    io.to(`map:${message.mapId}`).emit('chatReaction', { messageId, emoji, count: users.size, reactedBy: [...users] });
    rewardReputation(socket.id);
  });

  socket.on('reactToPrivateMessage', (payload = {}) => {
    if (!payload || typeof payload !== 'object') return;
    const { messageId, emoji } = payload;
    if (typeof messageId !== 'string' || !reactionEmojis.has(emoji)) return;
    const message = recentPrivateMessages.get(messageId);
    if (!message || ![message.senderId, message.recipientId].includes(socket.id)) return;
    if (!players[message.senderId] || !players[message.recipientId]) return;

    if (!message.reactions.has(emoji)) message.reactions.set(emoji, new Set());
    const users = message.reactions.get(emoji);
    if (users.has(socket.id)) users.delete(socket.id);
    else users.add(socket.id);
    if (users.size === 0) message.reactions.delete(emoji);
    io.to([message.senderId, message.recipientId]).emit('privateChatReaction', {
      messageId,
      emoji,
      count: users.size,
      reactedBy: [...users]
    });
    rewardReputation(socket.id);
  });

  socket.on('updateProfile', (profile = {}) => {
    if (!players[socket.id] || !profile || typeof profile !== 'object') return;
    const nickname = typeof profile.nickname === 'string'
      ? profile.nickname.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 24)
      : '';
    const avatar = profile.avatar === null ? null : isValidAvatar(profile.avatar) ? profile.avatar : players[socket.id].avatar;
    players[socket.id].nickname = nickname;
    players[socket.id].avatar = avatar;
    // Store the display name inside the existing JSON stats column, avoiding a schema migration.
    schedulePlayerSave(socket.id);
    serverLeaderboardCache = null;
    serverLeaderboardCacheExpiresAt = 0;
    io.to(`map:${players[socket.id].mapId}`).emit('playerProfileUpdated', { id: socket.id, nickname, avatar });
    emitSessionLeaderboard();
  });

  // 4. Lắng nghe sự kiện thay đổi avatar của người chơi
  socket.on('updateAvatar', (avatarData) => {
    if (!isValidAvatar(avatarData)) return;
    if (players[socket.id]) {
      players[socket.id].avatar = avatarData;
      // Phát tán ảnh avatar mới đến tất cả người chơi khác để cập nhật giao diện
      socket.to(`map:${players[socket.id].mapId}`).emit('playerAvatarUpdated', {
        id: socket.id,
        avatar: avatarData
      });
      console.log('Đã cập nhật và đồng bộ avatar cho:', socket.id);
    }
  });

  // 5. Xử lý khi người chơi thoát game
  socket.on('disconnect', async () => {
    console.log('Người chơi thoát:', socket.id);
    clearTimeout(profileSaveTimers.get(socket.id));
    profileSaveTimers.delete(socket.id);
    await persistPlayer(socket.id);
    const departingPlayer = players[socket.id];
    const mapId = departingPlayer?.mapId || 'campus';
    if (departingPlayer) {
      // Use the disconnecting socket's own auth data; it may already be absent
      // from io.sockets.sockets while the disconnect handler is running.
      const persistentId = socket.data?.playerTokenHash || socket.id;
      const departingInventory = playerInventories.get(socket.id);
      archivedLeaderboardPlayers.set(persistentId, {
        id: persistentId,
        nickname: departingPlayer.nickname || `Khách (${socket.id.slice(0, 4)})`,
        coins: Number(departingPlayer.coins) || 0,
        reputation: Number(departingPlayer.reputation) || 0,
        items: { ...(departingInventory?.items || {}) }
      });
    }
    const departingProgress = halloweenProgress.get(socket.id);
    const departingFinder = halloweenFinders.get(socket.id);
    const unbankedPumpkins = Math.max(0, Number(departingProgress?.pendingPumpkins) || 0);
    if (departingFinder && unbankedPumpkins) departingFinder.count += unbankedPumpkins;
    delete players[socket.id];
    halloweenProgress.delete(socket.id);
    if (halloweenFinders.size) io.emit('halloweenLeaderboard', getHalloweenLeaderboard());
    emitSessionLeaderboard();
    if (mapId === 'campus') emitCampusBenchOccupants();
    if (mapId === 'farm' && farmMembers().length === 0) {
      clearFarmMouseTimers();
      activeFarmMouse = null;
      io.to('map:farm').emit('farmMouseState', { active: false });
    }
    for (const [messageId, message] of recentMessages) {
      for (const [emoji, users] of message.reactions) {
        if (users.delete(socket.id)) {
          io.to(`map:${message.mapId}`).emit('chatReaction', { messageId, emoji, count: users.size, reactedBy: [...users] });
        }
      }
    }
    for (const [messageId, message] of recentPrivateMessages) {
      if (message.senderId === socket.id || message.recipientId === socket.id) {
        recentPrivateMessages.delete(messageId);
      }
    }
    playerInventories.delete(socket.id);
    reputationRewardedAt.delete(socket.id);
    io.to(`map:${mapId}`).emit('playerDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server đang chạy trên port ${PORT}`);
});
