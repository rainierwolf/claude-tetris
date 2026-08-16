'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#90caf9', // J - pale blue
  '#ffb74d', // L - orange
  '#b0bec5', // X - hollow challenge
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8,8,8],[8,0,8],[8,8,8]],                  // X - hollow 3x3
];

const LINE_SCORES = [0, 100, 300, 500, 800];

// ==== POWER-UPS ====
// Cada POWERUP_LINES_INTERVAL líneas eliminadas, la siguiente pieza generada
// es un power-up en vez de una pieza normal.
const POWERUP_LINES_INTERVAL = 10;

const POWERUP_TYPES = [
  { id: 'bomb', label: 'BOMBA', color: '#ff5252', icon: '💣' },
  { id: 'lightning', label: 'RAYO', color: '#ffee58', icon: '⚡' },
  { id: 'dye', label: 'TINTE', color: '#f06292', icon: '🎨' },
  { id: 'gravity', label: 'GRAVEDAD', color: '#7e57c2', icon: '⬇' },
  { id: 'freeze', label: 'CONGELAR', color: '#4fc3f7', icon: '❄' },
];

// Hook para sonido: define window.SFX = { play(id) { ... } } para reproducir
// un sfx distinto por cada power-up (id = 'bomb' | 'lightning' | 'dye' | 'gravity' | 'freeze').
function playSfx(id) {
  if (window.SFX && typeof window.SFX.play === 'function') {
    window.SFX.play(id);
  }
}

function clampInt(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const PowerUpManager = {
  linesSinceLast: 0,
  queuedPowerUp: false,
  freezeUntil: 0,
  flashEffect: null,

  reset() {
    this.linesSinceLast = 0;
    this.queuedPowerUp = false;
    this.freezeUntil = 0;
    this.flashEffect = null;
  },

  registerLinesCleared(count) {
    this.linesSinceLast += count;
  },

  isPowerUpDue() {
    if (this.linesSinceLast >= POWERUP_LINES_INTERVAL) {
      this.linesSinceLast -= POWERUP_LINES_INTERVAL;
      return true;
    }
    return false;
  },

  consumeQueuedPowerUp() {
    if (this.queuedPowerUp) {
      this.queuedPowerUp = false;
      return true;
    }
    return false;
  },

  randomType() {
    return POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
  },

  createPiece() {
    const def = this.randomType();
    const shape = [[1, 1], [1, 1]];
    return {
      type: null,
      isPowerUp: true,
      powerUp: def,
      shape,
      x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
      y: 0,
    };
  },

  // Dispara el efecto asociado a la pieza al hacer lock. No se fusiona con
  // el tablero como una pieza normal.
  trigger(piece) {
    const def = piece.powerUp;
    const centerRow = clampInt(piece.y + Math.floor(piece.shape.length / 2), 0, ROWS - 1);
    const centerCol = clampInt(piece.x + Math.floor(piece.shape[0].length / 2), 0, COLS - 1);
    let cells = [];
    switch (def.id) {
      case 'bomb':
        cells = this.effectBomb(centerRow, centerCol);
        break;
      case 'lightning':
        cells = this.effectLightning(centerRow, centerCol);
        break;
      case 'dye':
        cells = this.effectDye();
        break;
      case 'gravity':
        cells = this.effectGravity();
        clearLines();
        break;
      case 'freeze':
        this.effectFreeze();
        break;
    }
    this.flash(def, cells);
    playSfx(def.id);
  },

  // 1. BOMBA: destruye un área de 3x3 celdas centrada en la pieza.
  effectBomb(cr, cc) {
    const cells = [];
    for (let r = cr - 1; r <= cr + 1; r++) {
      for (let c = cc - 1; c <= cc + 1; c++) {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
        board[r][c] = 0;
        wildcardBoard[r][c] = false;
        cells.push([r, c]);
      }
    }
    return cells;
  },

  // 2. RAYO: limpia por completo la fila y la columna de la pieza (en cruz),
  // igual que un line clear, sin necesidad de que estén llenas.
  effectLightning(cr, cc) {
    const cells = [];
    for (let r = 0; r < ROWS; r++) {
      board[r][cc] = 0;
      wildcardBoard[r][cc] = false;
      cells.push([r, cc]);
    }
    for (let c = 0; c < COLS; c++) cells.push([cr, c]);

    board.splice(cr, 1);
    board.unshift(new Array(COLS).fill(0));
    wildcardBoard.splice(cr, 1);
    wildcardBoard.unshift(new Array(COLS).fill(false));

    lines += 1;
    score += (LINE_SCORES[1] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    this.registerLinesCleared(1);
    if (this.isPowerUpDue()) this.queuedPowerUp = true;

    return cells;
  },

  // 3. TINTE: el color más común del tablero pasa a ser "comodín".
  effectDye() {
    const counts = new Array(COLORS.length).fill(0);
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (board[r][c]) counts[board[r][c]]++;

    let bestColor = 0, bestCount = 0;
    for (let i = 1; i < counts.length; i++) {
      if (counts[i] > bestCount) {
        bestCount = counts[i];
        bestColor = i;
      }
    }

    const cells = [];
    if (bestColor) {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (board[r][c] === bestColor) {
            wildcardBoard[r][c] = true;
            cells.push([r, c]);
          }
        }
      }
    }
    return cells;
  },

  // 4. GRAVEDAD: cada columna cae, compactando huecos sin alterar el orden relativo.
  effectGravity() {
    const cells = [];
    for (let c = 0; c < COLS; c++) {
      const values = [];
      const wild = [];
      for (let r = 0; r < ROWS; r++) {
        if (board[r][c]) {
          values.push(board[r][c]);
          wild.push(wildcardBoard[r][c]);
        }
      }
      const empty = ROWS - values.length;
      for (let r = 0; r < ROWS; r++) {
        if (r < empty) {
          board[r][c] = 0;
          wildcardBoard[r][c] = false;
        } else {
          board[r][c] = values[r - empty];
          wildcardBoard[r][c] = wild[r - empty];
          cells.push([r, c]);
        }
      }
    }
    return cells;
  },

  // 5. CONGELAR: pausa el gravity tick automático 5s (el jugador sigue controlando la pieza).
  effectFreeze() {
    this.freezeUntil = performance.now() + 5000;
  },

  flash(def, cells) {
    this.flashEffect = { color: def.color, cells: cells || [], start: performance.now(), duration: 400 };
  },

  drawFlash(context, size) {
    if (!this.flashEffect) return;
    const { color, cells, start, duration } = this.flashEffect;
    const elapsed = performance.now() - start;
    if (elapsed >= duration) {
      this.flashEffect = null;
      return;
    }
    const alpha = 1 - elapsed / duration;
    context.save();
    context.globalAlpha = alpha * 0.55;
    context.fillStyle = color;
    for (const [r, c] of cells) {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
      context.fillRect(c * size, r * size, size, size);
    }
    context.restore();
  },

  drawFreezeBadge(context) {
    if (performance.now() >= this.freezeUntil) return;
    const remaining = Math.max(0, (this.freezeUntil - performance.now()) / 1000);
    context.save();
    context.font = '16px sans-serif';
    context.textAlign = 'left';
    context.textBaseline = 'top';
    context.fillStyle = '#4fc3f7';
    context.fillText(`❄ ${remaining.toFixed(1)}s`, 8, 8);
    context.restore();
  },
};

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggle = document.getElementById('theme-toggle');
const powerupNextEl = document.getElementById('powerup-next');

let board, wildcardBoard, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let gridLineColor, pieceHighlightColor, wildcardGlowColor;

function readThemeColors() {
  const styles = getComputedStyle(document.documentElement);
  gridLineColor = styles.getPropertyValue('--grid-line').trim();
  pieceHighlightColor = styles.getPropertyValue('--piece-highlight').trim();
  wildcardGlowColor = styles.getPropertyValue('--wildcard-glow').trim();
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  themeToggle.checked = theme === 'light';
  readThemeColors();
}

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function createWildcardBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 8) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function generateNextPiece() {
  if (PowerUpManager.consumeQueuedPowerUp()) {
    return PowerUpManager.createPiece();
  }
  return randomPiece();
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      wildcardBoard.splice(r, 1);
      wildcardBoard.unshift(new Array(COLS).fill(false));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    PowerUpManager.registerLinesCleared(cleared);
    if (PowerUpManager.isPowerUpDue()) PowerUpManager.queuedPowerUp = true;
    updateHUD();
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  if (current.isPowerUp) {
    PowerUpManager.trigger(current);
    updateHUD();
  } else {
    merge();
    clearLines();
  }
  spawn();
}

function spawn() {
  current = next;
  next = generateNextPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
  if (powerupNextEl) {
    powerupNextEl.textContent = Math.max(0, POWERUP_LINES_INTERVAL - PowerUpManager.linesSinceLast);
  }
}

function drawBlock(context, x, y, colorIndex, size, alpha, options) {
  if (!colorIndex) return;
  const opts = options || {};
  const color = opts.color || COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = pieceHighlightColor;
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);

  if (opts.wildcard) {
    context.save();
    context.shadowColor = wildcardGlowColor;
    context.shadowBlur = 6;
    context.strokeStyle = wildcardGlowColor;
    context.lineWidth = 2;
    context.strokeRect(x * size + 2, y * size + 2, size - 4, size - 4);
    context.restore();
  }

  if (opts.icon) {
    context.font = `${Math.floor(size * 0.55)}px sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = opts.iconColor || '#111';
    context.fillText(opts.icon, x * size + size / 2, y * size + size / 2 + 1);
  }

  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = gridLineColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK, 1, wildcardBoard[r][c] ? { wildcard: true } : undefined);

  const pieceOptions = current.isPowerUp
    ? { color: current.powerUp.color, icon: current.powerUp.icon, iconColor: '#111' }
    : undefined;

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2, pieceOptions);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK, 1, pieceOptions);

  // feedback visual de power-ups
  PowerUpManager.drawFlash(ctx, BLOCK);
  PowerUpManager.drawFreezeBadge(ctx);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  const options = next.isPowerUp
    ? { color: next.powerUp.color, icon: next.powerUp.icon, iconColor: '#111' }
    : undefined;
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB, 1, options);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  // CONGELAR: mientras el freeze esté activo no se acumula el gravity tick,
  // pero el jugador sigue pudiendo mover/rotar la pieza vía el listener de teclado.
  if (performance.now() >= PowerUpManager.freezeUntil) {
    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
      } else {
        lockPiece();
      }
    }
  }
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  readThemeColors();
  board = createBoard();
  wildcardBoard = createWildcardBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  PowerUpManager.reset();
  next = generateNextPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);
themeToggle.addEventListener('change', () => {
  applyTheme(themeToggle.checked ? 'light' : 'dark');
  draw();
  drawNext();
});
themeToggle.checked = document.documentElement.getAttribute('data-theme') === 'light';

init();
