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

  players[socket.id] = {
    x: Math.floor(Math.random() * 400) + 100,
    y: Math.floor(Math.random() * 400) + 100
  };

  socket.emit('currentPlayers', players);
  socket.broadcast.emit('newPlayer', { id: socket.id, x: players[socket.id].x, y: players[socket.id].y });

  // ĐÃ SỬA: 'playerInput' -> 'playerMovement' để khớp với client
  socket.on('playerMovement', (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      
      // Phát tọa độ kèm theo id đầy đủ sang các máy khác
      socket.broadcast.emit('playerMoved', { 
        id: socket.id, 
        x: data.x, 
        y: data.y 
      });
    }
  });

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