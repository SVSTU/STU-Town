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

const players = {};
const recentMessages = new Map();
const recentPrivateMessages = new Map();
const reactionEmojis = new Set(['❤️', '😂', '👍', '😮', '😢', '🔥']);
const quickFloatingEmotes = new Set(['👋', '❤️', '😂', '👍', '🔥', '🎉']);
const FARM_GROWTH_MS = 30_000;
const FARM_PLOT_IDS = ['plot-1', 'plot-2', 'plot-3', 'plot-4'];
const FARM_CROP_KEYS = { carrot: '🥕', tomato: '🍅', corn: '🌽', strawberry: '🍓' };
const OPEN_MAP_IDS = new Set(['sports', 'fountain', 'farm', 'khu-e', 'khu-f']);
const CLOSED_MAP_IDS = new Set(['canteen', 'khu-c', 'auditorium', 'khu-d']);
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
let nextMessageId = 0;

function getFarmSnapshot() {
  const now = Date.now();
  return Object.fromEntries([...farmPlots].map(([id, plot]) => [id, {
    ...plot,
    ready: Boolean(plot.plantedAt) && now - plot.plantedAt >= FARM_GROWTH_MS,
    growthMs: FARM_GROWTH_MS
  }]));
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
    mapId: 'campus'
  };
  socket.join('map:campus');
  playerInventories.set(socket.id, {
    seeds: { carrot: 3, tomato: 3, corn: 3, strawberry: 3 },
    produce: { carrot: 0, tomato: 0, corn: 0, strawberry: 0 }
  });

  // Gửi toàn bộ danh sách người chơi hiện tại (kèm avatar cũ nếu có) cho người mới
  socket.emit('currentPlayers', getMapPlayers('campus'));
  socket.emit('inventoryState', playerInventories.get(socket.id));
  
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
    if (mapId === 'dormitory' || mapId === 'khu-a') {
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
    socket.leave(`map:${previousMapId}`);
    socket.to(`map:${previousMapId}`).emit('playerLeftMap', socket.id);
    const spawn = mapId === 'farm' ? { x: 400, y: 430 } : { x: 400, y: 300 };
    Object.assign(players[socket.id], spawn, { mapId });
    socket.join(`map:${mapId}`);
    socket.emit('mapChanged', { mapId, players: getMapPlayers(mapId) });
    socket.to(`map:${mapId}`).emit('newPlayer', { id: socket.id, ...players[socket.id] });
    if (mapId === 'farm') socket.emit('farmState', getFarmSnapshot());
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
  });

  // 2. Lắng nghe di chuyển của người chơi
  socket.on('playerMovement', (data) => {
    if (players[socket.id] && data && Number.isFinite(data.x) && Number.isFinite(data.y)) {
      const x = Math.max(15, Math.min(785, data.x));
      const y = Math.max(15, Math.min(585, data.y));
      if (players[socket.id].mapId === 'campus' && isBlockedPosition(x, y)) return;
      players[socket.id].x = x;
      players[socket.id].y = y;
      
      socket.to(`map:${players[socket.id].mapId}`).emit('playerMoved', {
        id: socket.id, 
        x,
        y
      });
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
      socket.emit('farmInteractionResult', { message: `Bạn đã gieo ${plot.crop}. Cây sẽ lớn sau 30 giây.` });
    } else {
      if (!plot.plantedAt) {
        socket.emit('farmInteractionResult', { message: 'Luống này chưa được gieo hạt.' });
        return;
      }
      const remainingMs = FARM_GROWTH_MS - (Date.now() - plot.plantedAt);
      if (remainingMs > 0) {
        socket.emit('farmInteractionResult', { message: `Cây cần thêm ${Math.ceil(remainingMs / 1000)} giây để lớn.` });
        return;
      }
      const harvestedCrop = plot.crop;
      const cropKey = plot.cropKey;
      if (Object.hasOwn(inventory.produce, cropKey)) inventory.produce[cropKey] += 1;
      plot.crop = '';
      plot.cropKey = '';
      plot.plantedAt = 0;
      plot.plantedBy = '';
      socket.emit('farmInteractionResult', { message: `Đã thu hoạch ${harvestedCrop}! Luống đã sẵn sàng gieo lại.` });
    }
    socket.emit('inventoryState', inventory);
    io.to('map:farm').emit('farmState', getFarmSnapshot());
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
    io.to(`map:${mapId}`).emit('playerDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server đang chạy trên port ${PORT}`);
});
