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
let nextMessageId = 0;

function isValidAvatar(value) {
  return typeof value === 'string' && value.length <= 2_800_000 &&
    /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
}

io.on('connection', (socket) => {
  console.log('Người chơi kết nối:', socket.id);

  // 1. Khởi tạo thông tin người chơi (gồm tọa độ và avatar mặc định là null)
  players[socket.id] = {
    x: Math.floor(Math.random() * 400) + 100,
    y: Math.floor(Math.random() * 400) + 100,
    avatar: null,
    nickname: ''
  };

  // Gửi toàn bộ danh sách người chơi hiện tại (kèm avatar cũ nếu có) cho người mới
  socket.emit('currentPlayers', players);
  
  // Thông báo cho các người chơi khác về sự xuất hiện của người mới (kèm avatar mặc định)
  socket.broadcast.emit('newPlayer', { 
    id: socket.id, 
    x: players[socket.id].x, 
    y: players[socket.id].y,
    avatar: players[socket.id].avatar 
  });

  // 2. Lắng nghe di chuyển của người chơi
  socket.on('playerMovement', (data) => {
    if (players[socket.id] && data && Number.isFinite(data.x) && Number.isFinite(data.y)) {
      const x = Math.max(15, Math.min(785, data.x));
      const y = Math.max(15, Math.min(585, data.y));
      players[socket.id].x = x;
      players[socket.id].y = y;
      
      socket.broadcast.emit('playerMoved', { 
        id: socket.id, 
        x,
        y
      });
    }
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
    io.emit('playerProfileUpdated', { id: socket.id, nickname, avatar });
  });

  // 4. Lắng nghe sự kiện thay đổi avatar của người chơi
  socket.on('updateAvatar', (avatarData) => {
    if (!isValidAvatar(avatarData)) return;
    if (players[socket.id]) {
      players[socket.id].avatar = avatarData;
      // Phát tán ảnh avatar mới đến tất cả người chơi khác để cập nhật giao diện
      socket.broadcast.emit('playerAvatarUpdated', {
        id: socket.id,
        avatar: avatarData
      });
      console.log('Đã cập nhật và đồng bộ avatar cho:', socket.id);
    }
  });

  // 5. Xử lý khi người chơi thoát game
  socket.on('disconnect', () => {
    console.log('Người chơi thoát:', socket.id);
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
    io.emit('playerDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server đang chạy trên port ${PORT}`);
});
