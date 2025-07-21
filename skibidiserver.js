// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let nextLobbyId = 1;
const lobbies = {};

io.on('connection', socket => {
  console.log('Player connected:', socket.id);

  socket.on('listLobbies', () => {
    socket.emit('lobbies', Object.values(lobbies).map(l=>({ id:l.id, count:l.players.length })));
  });

  socket.on('hostLobby', data => {
    const id = nextLobbyId++;
    lobbies[id] = { id, players: [], track:data.track };
    joinLobby(socket, id, data.color);
  });

  socket.on('joinLobby', ({ id, color }) => {
    if(lobbies[id]) joinLobby(socket,id,color);
  });

  socket.on('playerMove', data => {
    const lobby = getLobbyBySocket(socket);
    if(lobby) socket.to(`lobby${lobby.id}`).emit('playerMove', { id:socket.id, ...data });
  });

  socket.on('disconnect',() => {
    console.log('Disconnected', socket.id);
    const lobby = getLobbyBySocket(socket);
    if(lobby){
      lobby.players = lobby.players.filter(p=>p.id!==socket.id);
      io.emit('updateLobbies');
    }
  });
});

function joinLobby(socket, id, color){
  const lobby = lobbies[id];
  lobby.players.push({ id:socket.id, color });
  socket.join(`lobby${id}`);
  socket.emit('joinedLobby', { id });
  io.emit('updateLobbies');
}

function getLobbyBySocket(socket){
  return Object.values(lobbies).find(l=>l.players.some(p=>p.id===socket.id));
}

const PORT = process.env.PORT || 3000;
server.listen(PORT,()=>console.log(`Server up on port ${PORT}`));