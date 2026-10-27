const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const players = {};

io.on('connection', (socket) => {
  console.log('Người chơi kết nối:', socket.id);

  // Khởi tạo thông tin người chơi MỘT LẦN DUY NHẤT (gồm tọa độ và avatar mặc định)
  players[socket.id] = {
    x: Math.floor(Math.random() * 400) + 100,
    y: Math.floor(Math.random() * 400) + 100,
    avatar: null
  };

  // Gửi danh sách hiện tại và thông báo người mới
  socket.emit('currentPlayers', players);
  socket.broadcast.emit('newPlayer', { 
    id: socket.id, 
    x: players[socket.id].x, 
    y: players[socket.id].y,
    avatar: players[socket.id].avatar 
  });

  // 1. Lắng nghe di chuyển của người chơi
  socket.on('playerMovement', (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      
      socket.broadcast.emit('playerMoved', { 
        id: socket.id, 
        x: data.x, 
        y: data.y 
      });
    }
  });

  // 2. Lắng nghe tin nhắn chat
  socket.on('sendChatMessage', (message) => {
    io.emit('chatMessage', {
      id: socket.id,       
      message: message
    });
  });

  // 3. Lắng nghe sự kiện thay đổi avatar
  socket.on('updateAvatar', (avatarData) => {
    if (players[socket.id]) {
      players[socket.id].avatar = avatarData;
      // Phát tán ảnh avatar mới đến tất cả người chơi khác
      socket.broadcast.emit('playerAvatarUpdated', {
        id: socket.id,
        avatar: avatarData
      });
    }
  });

  // 4. Xử lý khi người chơi thoát game
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