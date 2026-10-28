const express = require('express');
const http = require('http');
const path = require('path');
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

const BLOG_FEED_URL = 'https://stusinhvien.blogspot.com/feeds/posts/default?alt=json&max-results=8';
const BLOG_BASE_URL = 'https://stusinhvien.blogspot.com/';
let announcementFeedCache = { posts: [], expiresAt: 0 };
let announcementFeedRequest = null;

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
const OPEN_MAP_IDS = new Set(['sports', 'fountain', 'farm', 'khu-e', 'khu-f', 'khu-a', 'canteen', 'auditorium']);
const CLOSED_MAP_IDS = new Set(['khu-c', 'khu-d']);
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
const reputationRewardedAt = new Map();
let nextMessageId = 0;
let activeFarmMouse = null;
let farmMouseSpawnTimer = null;
let farmMouseBiteTimer = null;
let farmMouseMoveTimer = null;

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
  if (player) io.to(id).emit('playerState', getPlayerState(player));
}

function getCampusBenchOccupants() {
  return Object.fromEntries(Object.entries(players)
    .filter(([, player]) => player.mapId === 'campus' && player.sittingAtBench)
    .map(([id, player]) => [player.sittingAtBench, id]));
}

function emitCampusBenchOccupants() {
  io.to('map:campus').emit('campusBenchOccupancy', getCampusBenchOccupants());
}

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
  }
}

setInterval(tickPlayerStats, 10_000);

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

function isKhuEFScheduleOpen() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);
  const time = hour * 60 + minute;
  return (time >= 420 && time <= 690) || (time >= 780 && time <= 1020);
}

function getMapPlayers(mapId) {
  return Object.fromEntries(Object.entries(players).filter(([, player]) => player.mapId === mapId));
}

io.on('connection', (socket) => {
  console.log('Người chơi kết nối:', socket.id);
  let lastFloatingEmoteAt = 0;

  // 1. Khởi tạo thông tin người chơi (gồm tọa độ và avatar mặc định là null)
  players[socket.id] = {
    x: Math.floor(Math.random() * 70) + 330,
    y: Math.floor(Math.random() * 70) + 320,
    avatar: null,
    nickname: '',
    mapId: 'campus',
    stats: { hunger: 100, strength: 100, fatigue: 0 },
    coins: 1500,
    reputation: 0,
    farmPlantCount: 0,
    farmHarvestCount: 0,
    hungerElapsed: 0,
    fatigueElapsed: 0,
    weaknessElapsed: 0,
    statsTickAt: Date.now(),
    lastMovementAt: Date.now(),
    sittingAtBench: '',
    lastFarmActionAt: 0
  };
  socket.join('map:campus');
  playerInventories.set(socket.id, {
    seeds: { carrot: 3, tomato: 3, corn: 3, strawberry: 3 },
    produce: { carrot: 0, tomato: 0, corn: 0, strawberry: 0 },
    items: {}
  });

  // Gửi toàn bộ danh sách người chơi hiện tại (kèm avatar cũ nếu có) cho người mới
  socket.emit('currentPlayers', getMapPlayers('campus'));
  socket.emit('inventoryState', playerInventories.get(socket.id));
  socket.emit('playerState', getPlayerState(players[socket.id]));
  socket.emit('campusBenchOccupancy', getCampusBenchOccupants());
  
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
    if ((mapId === 'khu-e' || mapId === 'khu-f') && !isKhuEFScheduleOpen()) {
      socket.emit('mapChangeDenied', 'Khu E/F đang đóng. Lịch mở: 07:00–11:30 và 13:00–17:00 giờ Việt Nam.');
      return;
    }
    const previousMapId = players[socket.id]?.mapId || 'campus';
    const wasSittingAtBench = Boolean(players[socket.id]?.sittingAtBench);
    if (players[socket.id]) players[socket.id].sittingAtBench = '';
    socket.leave(`map:${previousMapId}`);
    socket.to(`map:${previousMapId}`).emit('playerLeftMap', socket.id);
    if (previousMapId === 'campus' && wasSittingAtBench) emitCampusBenchOccupants();
    const spawn = mapId === 'farm' ? { x: 400, y: 430 } : { x: 400, y: 300 };
    Object.assign(players[socket.id], spawn, { mapId });
    socket.join(`map:${mapId}`);
    socket.emit('mapChanged', { mapId, players: getMapPlayers(mapId) });
    socket.to(`map:${mapId}`).emit('newPlayer', { id: socket.id, ...players[socket.id] });
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
    socket.leave(`map:${previousMapId}`);
    socket.to(`map:${previousMapId}`).emit('playerLeftMap', socket.id);
    Object.assign(players[socket.id], { x: 400, y: 250, mapId: 'campus' });
    socket.join('map:campus');
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
      players[socket.id].sittingAtBench = '';
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
      socket.emit('serviceResult', { message: `Đã mua ${quantity} gói hạt ${crop}, tổng ${total} tiền đồng.`, state: getPlayerState(player), inventory });
    } else if (action === 'sell-crop') {
      if ((inventory.produce[cropKey] || 0) < quantity) return socket.emit('serviceResult', { message: `Bạn không đủ ${quantity} ${crop} trong túi.` });
      const total = price * quantity;
      inventory.produce[cropKey] -= quantity;
      player.coins += total;
      socket.emit('serviceResult', { message: `Đã bán ${quantity} ${crop}, nhận ${total} tiền đồng.`, state: getPlayerState(player), inventory });
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
    socket.emit('serviceResult', { message: 'Đã dùng gói hồi phục: +50 đói, +50 sức mạnh, -50 mệt.', state: getPlayerState(player) });
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
    if (now - (player.lastBenchRestAt || 0) < CAMPUS_BENCH_COOLDOWN_MS) {
      return socket.emit('benchRestResult', { message: 'Bạn vừa nghỉ xong, hãy chờ một chút.' });
    }
    if (player.sittingAtBench && player.sittingAtBench !== benchId) player.sittingAtBench = '';
    player.sittingAtBench = benchId;
    player.lastBenchRestAt = now;
    emitCampusBenchOccupants();
    const rested = Math.min(CAMPUS_BENCH_REST, player.stats.fatigue);
    if (rested <= 0) return socket.emit('benchRestResult', { message: 'Bạn chưa mệt, không cần nghỉ lúc này.', state: getPlayerState(player) });
    player.stats.fatigue = clampStat(player.stats.fatigue - CAMPUS_BENCH_REST);
    socket.emit('benchRestResult', { message: `Bạn ngồi nghỉ và giảm ${rested} điểm mệt.`, state: getPlayerState(player) });
  });

  socket.on('canteenPurchase', (payload = {}) => {
    const player = players[socket.id];
    if (!player || player.mapId !== 'canteen') return socket.emit('serviceResult', { message: 'Hãy đến Căn tin để mua thực phẩm.' });
    const { itemId, currency } = payload || {};
    const quantity = Number(payload?.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return socket.emit('serviceResult', { message: 'Số lượng cần là số nguyên từ 1 đến 99.' });
    }
    const item = Object.hasOwn(FOOD_MENU, itemId) ? FOOD_MENU[itemId] : null;
    if (!item || !['coins', 'reputation'].includes(currency)) return;
    const cost = item[currency] * quantity;
    if (player[currency] < cost) return socket.emit('serviceResult', { message: `Bạn không đủ ${currency === 'coins' ? 'tiền đồng' : 'danh tiếng'}.` });
    player[currency] -= cost;
    if (item.hunger) player.stats.hunger = clampStat(player.stats.hunger + item.hunger * quantity);
    if (item.strength) player.stats.strength = clampStat(player.stats.strength + item.strength * quantity);
    if (item.fatigue) player.stats.fatigue = clampStat(player.stats.fatigue + item.fatigue * quantity);
    socket.emit('serviceResult', { message: `Đã mua ${quantity} phần. ${item.hunger ? `Đói ${item.hunger > 0 ? '+' : ''}${item.hunger * quantity}. ` : ''}${item.strength ? `Sức mạnh +${item.strength * quantity}. ` : ''}${item.fatigue ? `Mệt ${item.fatigue * quantity}.` : ''}`, state: getPlayerState(player) });
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
    if (!message) return;
    const messageId = `${socket.id}:${++nextMessageId}`;
    recentMessages.set(messageId, { reactions: new Map() });
    if (recentMessages.size > 100) recentMessages.delete(recentMessages.keys().next().value);
    io.emit('chatMessage', { id: socket.id, nickname: players[socket.id]?.nickname || '', messageId, message });
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
    if (!message) return;
    if (!message.reactions.has(emoji)) message.reactions.set(emoji, new Set());
    const users = message.reactions.get(emoji);
    if (users.has(socket.id)) users.delete(socket.id);
    else users.add(socket.id);
    io.emit('chatReaction', { messageId, emoji, count: users.size, reactedBy: [...users] });
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
    io.to(`map:${players[socket.id].mapId}`).emit('playerProfileUpdated', { id: socket.id, nickname, avatar });
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
  socket.on('disconnect', () => {
    console.log('Người chơi thoát:', socket.id);
    const mapId = players[socket.id]?.mapId || 'campus';
    delete players[socket.id];
    if (mapId === 'campus') emitCampusBenchOccupants();
    if (mapId === 'farm' && farmMembers().length === 0) {
      clearFarmMouseTimers();
      activeFarmMouse = null;
      io.to('map:farm').emit('farmMouseState', { active: false });
    }
    for (const [messageId, message] of recentMessages) {
      for (const [emoji, users] of message.reactions) {
        if (users.delete(socket.id)) {
          io.emit('chatReaction', { messageId, emoji, count: users.size, reactedBy: [...users] });
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
