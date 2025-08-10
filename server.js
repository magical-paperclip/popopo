const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

// -------- Game State ---------
const MAP_SIZE = 1000;
const TICK_RATE = 60; // updates per second

const players = {}; // id -> player object
let powerups = [];  // list of active powerups

function randomPosition() {
  return {
    x: Math.random() * MAP_SIZE,
    y: Math.random() * MAP_SIZE,
  };
}

function createPlayer(id) {
  return {
    id,
    position: randomPosition(),
    direction: null, // 'up','down','left','right'
    trail: [],
    territories: [],
    speed: 2,
    alive: true,
  };
}

// -------- Socket.io Handlers ---------
io.on('connection', socket => {
  console.log('Player connected', socket.id);

  players[socket.id] = createPlayer(socket.id);

  // Send initial state to the new player
  socket.emit('init', {
    id: socket.id,
    players,
    powerups,
    mapSize: MAP_SIZE,
  });

  // Notify existiy4kut5mjyng players of the new player
  socket.broadcast.emit('playerJoined', players[socket.id]);

  // Handle player movement input
  socket.on('move', dir => {
    const p = players[socket.id];
    if (!p) return;
    if (['up', 'down', 'left', 'right'].includes(dir)) {
      p.direction = dir;
    }
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected', socket.id);
    delete players[socket.id];
    io.emit('playerLeft', socket.id);
  });
});

// -------- Game Loop ---------
setInterval(() => {
  // Update players positions and trails
  Object.values(players).forEach(p => {
    if (!p.direction) return;
    const speed = p.speed;
    switch (p.direction) {
      case 'up':
        p.position.y -= speed;
        break;
      case 'down':
        p.position.y += speed;
        break;
      case 'left':
        p.position.x -= speed;
        break;
      case 'right':
        p.position.x += speed;
        break;
    }

    // Clamp to map bounds
    p.position.x = Math.max(0, Math.min(MAP_SIZE, p.position.x));
    p.position.y = Math.max(0, Math.min(MAP_SIZE, p.position.y));

    // Append to trail
    p.trail.push({ x: p.position.x, y: p.position.y });
    if (p.trail.length > 150) {
      p.trail.shift();
    }

    // Check loop closure for territory capture
    const LOOP_MIN_POINTS = 20;
    const PROXIMITY_THRESH = speed * 2 + 1;
    if (p.trail.length > LOOP_MIN_POINTS) {
      const len = p.trail.length;
      // skip last 10 points to avoid immediate proximity detection
      for (let i = 0; i < len - 10; i++) {
        const tp = p.trail[i];
        const dx2 = p.position.x - tp.x;
        const dy2 = p.position.y - tp.y;
        if (dx2 * dx2 + dy2 * dy2 < PROXIMITY_THRESH * PROXIMITY_THRESH) {
          // slice loop polygon from i to end
          const poly = p.trail.slice(i);
          if (poly.length >= 3) {
            if (!p.territories) p.territories = [];
            p.territories.push(poly);
          }
          // reset trail to start new one
          p.trail = [];
          break;
        }
      }
    }
  });

  // TODO: Collision detection, territory capture, powerup spawning/collection

  // Broadcast state to all clients
  io.emit('state', { players, powerups });
}, 1000 / TICK_RATE);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
