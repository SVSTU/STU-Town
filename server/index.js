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

io.on('connection', (socket) => {
  console.log('Người chơi kết nối:', socket.id);

  // 1. Khởi tạo thông tin người chơi (gồm tọa độ và avatar mặc định là null)
  players[socket.id] = {
    x: Math.floor(Math.random() * 400) + 100,
    y: Math.floor(Math.random() * 400) + 100,
    avatar: null
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
    io.emit('chatMessage', {
      id: socket.id,       
      message: message
    });
  });

  // 4. Lắng nghe sự kiện thay đổi avatar của người chơi
  socket.on('updateAvatar', (avatarData) => {
    if (typeof avatarData !== 'string' || avatarData.length > 2_800_000 ||
        !/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(avatarData)) return;
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
    io.emit('playerDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server đang chạy trên port ${PORT}`);
});
