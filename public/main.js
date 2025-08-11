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

const playerCountElem = document.getElementById('playerCount');
const leaderboardElem = document.getElementById('leaderboard');

// Update HUD function
function updateHud() {
  const alivePlayers = Object.values(state.players);
  playerCountElem.textContent = alivePlayers.length;
  const sorted = alivePlayers
    .filter(p => p.score !== undefined)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  leaderboardElem.innerHTML = sorted
    .map(p => `<li><span class="colorBox" style="background:${p.color}"></span>${p.id === meId ? '<b>You</b>' : 'Player'}: ${p.score?.toFixed(1) ?? 0}%</li>`)
    .join('');
}

// Handle server messages
socket.on('init', data => {
  meId = data.id;
  Object.assign(state.players, data.players);
  state.powerups = data.powerups;
  mapSize = data.mapSize;
  updateHud();
});

socket.on('playerJoined', player => {
  state.players[player.id] = player;
  updateHud();
});

socket.on('playerLeft', id => {
  delete state.players[id];
  updateHud();
});

socket.on('state', newState => {
  Object.assign(state.players, newState.players);
  state.powerups = newState.powerups;
  updateHud();
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

// -------------------- Rendering --------------------
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const scale = Math.min(canvas.width, canvas.height) / mapSize;

  // Territory fill
  Object.values(state.players).forEach(p => {
    if (!p.territories) return;
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = p.color;
    p.territories.forEach(poly => {
      if (poly.length < 3) return;
      ctx.beginPath();
      poly.forEach((pt, idx) => {
        const sx = pt.x * scale;
        const sy = pt.y * scale;
        if (idx === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.closePath();
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  });

  // Trails & nodes
  Object.values(state.players).forEach(p => {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    p.trail.forEach((pt, idx) => {
      const sx = pt.x * scale;
      const sy = pt.y * scale;
      if (idx === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.stroke();

    // Node circle
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.position.x * scale, p.position.y * scale, 8, 0, Math.PI * 2);
    ctx.fill();

    if (p.id === meId) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });

  requestAnimationFrame(draw);
}

draw();
