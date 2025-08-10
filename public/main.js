/* global io */
const socket = io();

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Resize canvas to fill window
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

let meId = null;
let mapSize = 1000;
const state = {
  players: {},
  powerups: [],
};

// Handle server messages
socket.on('init', data => {
  meId = data.id;
  Object.assign(state.players, data.players);
  state.powerups = data.powerups;
  mapSize = data.mapSize;
});

socket.on('playerJoined', player => {
  state.players[player.id] = player;
});

socket.on('playerLeft', id => {
  delete state.players[id];
});

socket.on('state', newState => {
  Object.assign(state.players, newState.players);
  state.powerups = newState.powerups;
});

// Movement input
const keyMap = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

window.addEventListener('keydown', e => {
  const dir = keyMap[e.key];
  if (dir) {
    socket.emit('move', dir);
  }
});

// Render loop
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Convert world coords to screen coords (simple scaling)
  const scaleX = canvas.width / mapSize;
  const scaleY = canvas.height / mapSize;
  const scale = Math.min(scaleX, scaleY);

  // Draw powerups (placeholder)
  ctx.fillStyle = 'gold';
  state.powerups.forEach(pu => {
    ctx.beginPath();
    ctx.arc(pu.x * scale, pu.y * scale, 8, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw each player
  Object.values(state.players).forEach(p => {
    // Trail
    ctx.strokeStyle = 'brown';
    ctx.lineWidth = 6;
    ctx.beginPath();
    p.trail.forEach((pt, idx) => {
      const sx = pt.x * scale;
      const sy = pt.y * scale;
      if (idx === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.stroke();

    // Player node
    ctx.fillStyle = p.id === meId ? 'red' : 'black';
    ctx.beginPath();
    ctx.arc(p.position.x * scale, p.position.y * scale, 10, 0, Math.PI * 2);
    ctx.fill();
  });

  requestAnimationFrame(draw);
}

draw();
