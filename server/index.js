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

  // 3. Lắng nghe tin nhắn chat
  socket.on('sendChatMessage', (message) => {
    io.emit('chatMessage', {
      id: socket.id,       
      message: message
    });
  });

  // 4. Lắng nghe sự kiện thay đổi avatar của người chơi
  socket.on('updateAvatar', (avatarData) => {
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