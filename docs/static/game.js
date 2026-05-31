(function () {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const BASE_SIZE = 860;
  const GRID_SIZE = 4;
  const BOARD_X = 86;
  const BOARD_Y = 154;
  const BOARD_SIZE = 688;
  const GAP = 14;
  const CELL = (BOARD_SIZE - GAP * (GRID_SIZE + 1)) / GRID_SIZE;
  const STORAGE_KEY = "alankon_gaming_grid_best";
  const RESTART_BUTTON = { x: 86, y: 108, w: 154, h: 36 };
  const ANIMATION_DURATION = 0.18;
  const SWIPE_THRESHOLD = 36;
  const TILE_THEME = {
    2: { label: "clone", color: "#fff4dc", ink: "#4e3f34" },
    4: { label: "commit", color: "#ffe0b8", ink: "#5a3e22" },
    8: { label: "push", color: "#ffc07d", ink: "#6b3513" },
    16: { label: "branch", color: "#ff9868", ink: "#fff4ea" },
    32: { label: "merge", color: "#f56e5e", ink: "#fff4ea" },
    64: { label: "tag", color: "#d64960", ink: "#fff3f7" },
    128: { label: "release", color: "#af53b7", ink: "#fff2ff" },
    256: { label: "repo", color: "#6e5fe0", ink: "#f4f2ff" },
    512: { label: "engine", color: "#3b79d2", ink: "#f0f8ff" },
    1024: { label: "alankon", color: "#1596b0", ink: "#effeff" },
    2048: { label: "gaming", color: "#10a37f", ink: "#f2fff9" },
    4096: { label: "legend", color: "#0c7a62", ink: "#effff8" }
  };

  class SoundEffects {
    constructor() {
      this.ctx = null;
      this.enabled = true;
    }
    init() {
      if (this.ctx) {
        if (this.ctx.state === "suspended") {
          this.ctx.resume().catch(() => {});
        }
        return;
      }
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    playMove() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.1);
      
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      
      osc.start(now);
      osc.stop(now + 0.1);
    }
    playMerge() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(392.00, now); // G4
      osc.frequency.setValueAtTime(523.25, now + 0.06); // C5
      
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      
      osc.start(now);
      osc.stop(now + 0.16);
    }
    playAchievement() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      
      const now = this.ctx.currentTime;
      const playNote = (freq, start, duration, type = "sine") => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.1, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        osc.start(start);
        osc.stop(start + duration);
      };
      
      // Joyful major scale arpeggio
      playNote(261.63, now, 0.12); // C4
      playNote(329.63, now + 0.08, 0.12); // E4
      playNote(392.00, now + 0.16, 0.12); // G4
      playNote(523.25, now + 0.24, 0.35, "triangle"); // C5
    }
    playGameOver() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(60, now + 0.5);
      
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      
      osc.start(now);
      osc.stop(now + 0.5);
    }
    playGameWon() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      
      const now = this.ctx.currentTime;
      const playNote = (freq, start, duration) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        osc.start(start);
        osc.stop(start + duration);
      };
      
      const theme = [392.00, 523.25, 659.25, 783.99]; // G4, C5, E5, G5
      theme.forEach((freq, idx) => {
        playNote(freq, now + idx * 0.15, idx === 3 ? 0.65 : 0.25);
      });
    }
  }

  const sounds = new SoundEffects();

  const state = {
    mode: "menu",
    board: createEmptyBoard(),
    score: 0,
    best: loadBest(),
    lastMove: "none",
    message: "Clique no grid para iniciar sua run",
    hoverRestart: false,
    justSpawned: [],
    justMerged: [],
    animation: null,
    pointer: null,
    suppressClick: false,
    unlocked: new Set(),
    particles: [],
    bgParticles: [],
    scoreFloats: [],
    banner: null
  };

  function loadBest() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? Math.max(0, parseInt(raw, 10) || 0) : 0;
    } catch {
      return 0;
    }
  }

  function saveBest() {
    try {
      window.localStorage.setItem(STORAGE_KEY, `${state.best}`);
    } catch {}
  }

  function createEmptyBoard() {
    return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  }

  function cloneBoard(board) {
    return board.map((row) => row.slice());
  }

  function keyFor(row, col) {
    return `${row},${col}`;
  }

  function getTileAt(row, col) {
    return state.board[row][col];
  }

  function getCellPosition(row, col) {
    return {
      x: BOARD_X + GAP + col * (CELL + GAP),
      y: BOARD_Y + GAP + row * (CELL + GAP)
    };
  }

  function getEmptyCells(board) {
    const cells = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (board[row][col] === 0) cells.push({ row, col });
      }
    }
    return cells;
  }

  function addRandomTile(board) {
    const cells = getEmptyCells(board);
    if (!cells.length) return null;
    const cell = cells[Math.floor(Math.random() * cells.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    board[cell.row][cell.col] = value;
    return { row: cell.row, col: cell.col, value };
  }

  function startGame() {
    state.board = createEmptyBoard();
    state.score = 0;
    state.lastMove = "spawn";
    state.mode = "playing";
    state.message = "Una seus blocos Git ate chegar ao tile ALANKON GAMING";
    state.justSpawned = [];
    state.justMerged = [];
    state.animation = null;
    state.unlocked = new Set();
    state.particles = [];
    state.scoreFloats = [];
    state.banner = null;
    initBgParticles();

    const first = addRandomTile(state.board);
    const second = addRandomTile(state.board);
    state.justSpawned = [first, second].filter(Boolean).map((tile) => ({ ...tile, life: 0.7 }));
  }

  function restartGame() {
    startGame();
  }

  function updateBest() {
    if (state.score > state.best) {
      state.best = state.score;
      saveBest();
    }
  }

  function getLineCoords(direction, index) {
    const coords = [];
    if (direction === "left") {
      for (let col = 0; col < GRID_SIZE; col++) coords.push({ row: index, col });
    } else if (direction === "right") {
      for (let col = GRID_SIZE - 1; col >= 0; col--) coords.push({ row: index, col });
    } else if (direction === "up") {
      for (let row = 0; row < GRID_SIZE; row++) coords.push({ row, col: index });
    } else if (direction === "down") {
      for (let row = GRID_SIZE - 1; row >= 0; row--) coords.push({ row, col: index });
    }
    return coords;
  }

  function computeMove(board, direction) {
    const nextBoard = createEmptyBoard();
    const moves = [];
    const merged = [];
    let gained = 0;
    let moved = false;

    for (let lineIndex = 0; lineIndex < GRID_SIZE; lineIndex++) {
      const coords = getLineCoords(direction, lineIndex);
      const tiles = coords
        .map((coord) => ({ ...coord, value: board[coord.row][coord.col] }))
        .filter((tile) => tile.value !== 0);

      let targetIndex = 0;
      let i = 0;
      while (i < tiles.length) {
        const current = tiles[i];
        const next = tiles[i + 1];
        const destination = coords[targetIndex];

        if (next && current.value === next.value) {
          const mergedValue = current.value * 2;
          nextBoard[destination.row][destination.col] = mergedValue;
          moves.push({
            fromRow: current.row,
            fromCol: current.col,
            toRow: destination.row,
            toCol: destination.col,
            value: current.value
          });
          moves.push({
            fromRow: next.row,
            fromCol: next.col,
            toRow: destination.row,
            toCol: destination.col,
            value: next.value
          });
          merged.push({ row: destination.row, col: destination.col, value: mergedValue, life: 1 });
          gained += mergedValue;
          if (
            current.row !== destination.row ||
            current.col !== destination.col ||
            next.row !== destination.row ||
            next.col !== destination.col
          ) {
            moved = true;
          }
          i += 2;
        } else {
          nextBoard[destination.row][destination.col] = current.value;
          moves.push({
            fromRow: current.row,
            fromCol: current.col,
            toRow: destination.row,
            toCol: destination.col,
            value: current.value
          });
          if (current.row !== destination.row || current.col !== destination.col) {
            moved = true;
          }
          i += 1;
        }
        targetIndex += 1;
      }
    }

    if (!moved) {
      const same = board.every((row, rowIndex) =>
        row.every((value, colIndex) => value === nextBoard[rowIndex][colIndex])
      );
      if (!same) moved = true;
    }

    return { board: nextBoard, moves, merged, gained, moved };
  }

  function canMove(board) {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const value = board[row][col];
        if (value === 0) return true;
        if (row + 1 < GRID_SIZE && board[row + 1][col] === value) return true;
        if (col + 1 < GRID_SIZE && board[row][col + 1] === value) return true;
      }
    }
    return false;
  }

  function applyMove(direction) {
    if (state.mode !== "playing" || state.animation) return;

    const result = computeMove(state.board, direction);
    if (!result.moved) {
      state.message = "Esse movimento nao alterou seu grid";
      state.lastMove = direction;
      return;
    }

    const finalBoard = cloneBoard(result.board);
    const spawned = addRandomTile(finalBoard);

    state.board = finalBoard;
    state.score += result.gained;
    updateBest();
    state.lastMove = direction;
    state.message = `Movimento ${direction} confirmado`;
    state.justSpawned = [];
    state.justMerged = [];

    if (result.gained > 0) {
      state.scoreFloats.push({
        text: `+${result.gained}`,
        x: 584 + 104 / 2,
        y: 48 + 15,
        life: 1.0
      });
      sounds.playMerge();
    } else {
      sounds.playMove();
    }

    state.animation = {
      elapsed: 0,
      duration: ANIMATION_DURATION,
      moves: result.moves,
      hidden: new Set([
        ...result.moves.map((move) => keyFor(move.toRow, move.toCol)),
        ...(spawned ? [keyFor(spawned.row, spawned.col)] : [])
      ]),
      spawned,
      merged: result.merged
    };
  }

  function finalizeAnimation() {
    if (!state.animation) return;
    if (state.animation.spawned) {
      state.justSpawned = [{ ...state.animation.spawned, life: 0.7 }];
    }
    state.justMerged = state.animation.merged.map((tile) => ({ ...tile, life: tile.life }));

    // Check for achievements and trigger fireworks!
    state.animation.merged.forEach((tile) => {
      if (tile.value && !state.unlocked.has(tile.value)) {
        state.unlocked.add(tile.value);
        triggerFireworks(tile.row, tile.col, tile.value);
        sounds.playAchievement();
        showBanner(`CONQUISTA: MERGE ${tile.value} - ${getTileTheme(tile.value).label.toUpperCase()}!`);
      }
    });

    state.animation = null;

    const maxTile = Math.max(...state.board.flat());
    if (maxTile >= 2048 && state.mode !== "won") {
      state.mode = "won";
      state.message = "alankon Gaming desbloqueado. Voce chegou no 2048.";
      sounds.playGameWon();
      return;
    }

    if (!canMove(state.board)) {
      state.mode = "lost";
      state.message = "Run encerrada. Bata seu best e tente outra vez.";
      sounds.playGameOver();
    }
  }

  function update(dt) {
    state.justSpawned = state.justSpawned
      .map((item) => ({ ...item, life: item.life - dt * 2 }))
      .filter((item) => item.life > 0);
    state.justMerged = state.justMerged
      .map((item) => ({ ...item, life: item.life - dt * 2.4 }))
      .filter((item) => item.life > 0);

    if (state.bgParticles) {
      state.bgParticles.forEach((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y < 0) {
          p.y = BASE_SIZE;
          p.x = Math.random() * BASE_SIZE;
        }
      });
    }

    state.particles.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.alpha -= p.decay * dt;
      p.size = Math.max(0.1, p.size * (1 - dt * 0.5));
    });
    state.particles = state.particles.filter((p) => p.alpha > 0);

    state.scoreFloats.forEach((f) => {
      f.y -= dt * 45;
      f.life -= dt * 1.2;
    });
    state.scoreFloats = state.scoreFloats.filter((f) => f.life > 0);

    if (state.banner) {
      state.banner.life -= dt;
      state.banner.yOffset += dt * 28;
      if (state.banner.life <= 0) {
        state.banner = null;
      }
    }

    if (state.animation) {
      state.animation.elapsed += dt;
      if (state.animation.elapsed >= state.animation.duration) {
        finalizeAnimation();
      }
    }
  }

  function drawRoundedRect(x, y, w, h, r, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  function fitText(text, maxWidth, baseSize, weight) {
    let size = baseSize;
    do {
      ctx.font = `${weight} ${size}px "Trebuchet MS"`;
      if (ctx.measureText(text).width <= maxWidth || size <= 15) break;
      size -= 2;
    } while (size > 15);
    return size;
  }

  function getTilePulse(row, col) {
    const spawned = state.justSpawned.find((item) => item.row === row && item.col === col);
    if (spawned) return 1 + spawned.life * 0.16;
    const merged = state.justMerged.find((item) => item.row === row && item.col === col);
    if (merged) return 1 + merged.life * 0.22;
    return 1;
  }

  function getTileTheme(value) {
    return TILE_THEME[value] || TILE_THEME[4096];
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, BASE_SIZE, BASE_SIZE);
    gradient.addColorStop(0, "#0f172a");
    gradient.addColorStop(0.45, "#111827");
    gradient.addColorStop(1, "#14213d");
    drawRoundedRect(0, 0, BASE_SIZE, BASE_SIZE, 0, gradient);

    for (let i = 0; i < 18; i++) {
      const x = 34 + ((i * 167) % 790);
      const y = 36 + ((i * 121) % 780);
      const radius = 18 + ((i * 7) % 28);
      ctx.fillStyle = `rgba(34, 211, 238, ${0.04 + (i % 3) * 0.02})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw background floating dust particles!
    if (state.bgParticles) {
      state.bgParticles.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }
  }

  function drawTile(value, row, col, pulse) {
    const tile = getTileTheme(value);
    const { x, y } = getCellPosition(row, col);
    const cx = x + CELL / 2;
    const cy = y + CELL / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);
    ctx.translate(-cx, -cy);

    // Glowing shadows for premium tiles
    if (value >= 128) {
      ctx.shadowColor = tile.color;
      ctx.shadowBlur = Math.min(25, value / 8);
    }

    drawRoundedRect(x, y, CELL, CELL, 20, tile.color);
    ctx.shadowBlur = 0; // Reset shadow for text

    ctx.fillStyle = tile.ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const numberSize = fitText(`${value}`, CELL - 24, value > 999 ? 36 : 48, 900);
    ctx.font = `900 ${numberSize}px "Trebuchet MS"`;
    ctx.fillText(`${value}`, cx, y + CELL / 2 - 8);

    const labelSize = fitText(tile.label.toUpperCase(), CELL - 24, 20, 800);
    ctx.font = `800 ${labelSize}px "Trebuchet MS"`;
    ctx.fillText(tile.label.toUpperCase(), cx, y + CELL - 28);
    ctx.restore();
  }

  function drawTrail(x, y, value, alpha) {
    const tile = getTileTheme(value);
    ctx.save();
    ctx.globalAlpha = alpha;
    drawRoundedRect(x, y, CELL, CELL, 20, tile.color);
    ctx.restore();
  }

  function drawMovingTiles() {
    if (!state.animation) return;
    const progress = Math.min(1, state.animation.elapsed / state.animation.duration);
    const eased = easeOutCubic(progress);

    for (const move of state.animation.moves) {
      const from = getCellPosition(move.fromRow, move.fromCol);
      const to = getCellPosition(move.toRow, move.toCol);
      const trailX = from.x + (to.x - from.x) * Math.max(0, eased - 0.18);
      const trailY = from.y + (to.y - from.y) * Math.max(0, eased - 0.18);
      const x = from.x + (to.x - from.x) * eased;
      const y = from.y + (to.y - from.y) * eased;
      const tile = getTileTheme(move.value);
      const cx = x + CELL / 2;

      drawTrail(trailX, trailY, move.value, 0.16 * (1 - progress));
      drawRoundedRect(x, y, CELL, CELL, 20, tile.color);
      ctx.fillStyle = tile.ink;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const numberSize = fitText(`${move.value}`, CELL - 24, move.value > 999 ? 36 : 48, 900);
      ctx.font = `900 ${numberSize}px "Trebuchet MS"`;
      ctx.fillText(`${move.value}`, cx, y + CELL / 2 - 8);

      const labelSize = fitText(tile.label.toUpperCase(), CELL - 24, 20, 800);
      ctx.font = `800 ${labelSize}px "Trebuchet MS"`;
      ctx.fillText(tile.label.toUpperCase(), cx, y + CELL - 28);
    }
  }

  function drawBoard() {
    drawRoundedRect(BOARD_X, BOARD_Y, BOARD_SIZE, BOARD_SIZE, 28, "#1f2937");
    drawRoundedRect(BOARD_X + 6, BOARD_Y + 6, BOARD_SIZE - 12, BOARD_SIZE - 12, 24, "#273449");

    const hidden = state.animation ? state.animation.hidden : new Set();
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const { x, y } = getCellPosition(row, col);
        drawRoundedRect(x, y, CELL, CELL, 20, "#344155");
        const value = getTileAt(row, col);
        if (!value || hidden.has(keyFor(row, col))) continue;
        let pulse = getTilePulse(row, col);
        const merged = state.justMerged.find((item) => item.row === row && item.col === col);
        if (merged) {
          pulse *= 0.98 + easeOutBack(1 - Math.max(0, merged.life)) * 0.08;
        }
        drawTile(value, row, col, pulse);
      }
    }

    drawMovingTiles();
  }

  function drawHudCard(x, y, w, h, title, value, fill) {
    drawRoundedRect(x, y, w, h, 18, fill);
    ctx.textAlign = "center";
    ctx.fillStyle = "#f8fafc";
    ctx.font = '700 16px "Trebuchet MS"';
    ctx.fillText(title, x + w / 2, y + 24);
    ctx.font = '900 30px "Trebuchet MS"';
    ctx.fillText(`${value}`, x + w / 2, y + 56);
  }

  function drawRestartButton() {
    const fill = state.hoverRestart ? "#38bdf8" : "#263244";
    drawRoundedRect(RESTART_BUTTON.x, RESTART_BUTTON.y, RESTART_BUTTON.w, RESTART_BUTTON.h, 16, fill);
    ctx.textAlign = "center";
    ctx.fillStyle = "#eff6ff";
    ctx.font = '800 20px "Trebuchet MS"';
    ctx.fillText("Nova run", RESTART_BUTTON.x + RESTART_BUTTON.w / 2, RESTART_BUTTON.y + 26);
  }

  function drawHud() {
    ctx.textAlign = "left";
    ctx.fillStyle = "#e5eefb";
    ctx.font = '900 54px "Trebuchet MS"';
    ctx.fillText("alankon Gaming", 54, 64);

    ctx.fillStyle = "#7dd3fc";
    ctx.font = '700 23px "Trebuchet MS"';
    ctx.fillText("Git Grid 2048", 56, 96);

    drawHudCard(584, 18, 104, 78, "SCORE", state.score, "#f97316");
    drawHudCard(702, 18, 104, 78, "BEST", state.best, "#0f766e");
    drawRestartButton();

    drawRoundedRect(252, 108, 522, 36, 14, "rgba(255,255,255,0.08)");
    ctx.fillStyle = "#f8fafc";
    ctx.font = '700 18px "Trebuchet MS"';
    ctx.textAlign = "left";
    ctx.fillText(state.message, 270, 133);
  }

  function drawMenuOverlay() {
    drawRoundedRect(114, 286, 632, 206, 28, "rgba(9, 14, 29, 0.84)");
    ctx.textAlign = "center";
    ctx.fillStyle = "#f8fafc";
    ctx.font = '900 46px "Trebuchet MS"';
    ctx.fillText("Seu grid. Sua marca.", BASE_SIZE / 2, 350);
    ctx.fillStyle = "#bae6fd";
    ctx.font = '700 22px "Trebuchet MS"';
    ctx.fillText("Arraste, use setas ou WASD. R reinicia. F alterna fullscreen.", BASE_SIZE / 2, 394);
    ctx.fillText("Clique ou arraste no tabuleiro para abrir a primeira run.", BASE_SIZE / 2, 432);
    ctx.fillStyle = "#facc15";
    ctx.font = '900 26px "Trebuchet MS"';
    ctx.fillText("Meta: chegar ao tile ALANKON GAMING 2048", BASE_SIZE / 2, 470);
  }

  function drawEndRibbon() {
    if (state.mode !== "won" && state.mode !== "lost") return;
    const won = state.mode === "won";
    drawRoundedRect(132, 700, 596, 88, 22, won ? "rgba(16, 185, 129, 0.9)" : "rgba(239, 68, 68, 0.9)");
    ctx.textAlign = "center";
    ctx.fillStyle = "#f8fafc";
    ctx.font = '900 34px "Trebuchet MS"';
    ctx.fillText(won ? "Marca propria desbloqueada" : "Fim da run", BASE_SIZE / 2, 736);
    ctx.font = '700 21px "Trebuchet MS"';
    ctx.fillText("Use Nova run ou aperte R para jogar de novo.", BASE_SIZE / 2, 766);
  }

  function initBgParticles() {
    state.bgParticles = [];
    for (let i = 0; i < 15; i++) {
      state.bgParticles.push({
        x: Math.random() * BASE_SIZE,
        y: Math.random() * BASE_SIZE,
        vx: (Math.random() - 0.5) * 10,
        vy: -5 - Math.random() * 15,
        size: 1 + Math.random() * 3,
        alpha: 0.05 + Math.random() * 0.1
      });
    }
  }

  function triggerFireworks(row, col, value) {
    const { x, y } = getCellPosition(row, col);
    const cx = x + CELL / 2;
    const cy = y + CELL / 2;
    const theme = getTileTheme(value);

    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 240;
      const size = 3 + Math.random() * 5;
      const decay = 0.5 + Math.random() * 1.0;

      let color = theme.color;
      const rand = Math.random();
      if (rand < 0.25) {
        color = "#ffd700";
      } else if (rand < 0.4) {
        color = "#ffffff";
      } else if (rand < 0.5) {
        color = "#00f0ff";
      }

      state.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        gravity: 120,
        color: color,
        size: size,
        alpha: 1.0,
        decay: decay
      });
    }
  }

  function showBanner(text) {
    state.banner = {
      text: text,
      life: 2.2,
      yOffset: 0
    };
  }

  function drawParticles() {
    state.particles.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawScoreFloats() {
    state.scoreFloats.forEach((f) => {
      ctx.save();
      ctx.globalAlpha = f.life;
      ctx.fillStyle = "#facc15";
      ctx.font = '900 24px "Trebuchet MS"';
      ctx.textAlign = "center";
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    });
  }

  function drawBanner() {
    if (!state.banner) return;

    ctx.save();

    let alpha = 1.0;
    if (state.banner.life < 0.5) {
      alpha = state.banner.life / 0.5;
    } else if (2.2 - state.banner.life < 0.3) {
      alpha = (2.2 - state.banner.life) / 0.3;
    }

    ctx.globalAlpha = alpha;

    const w = 480;
    const h = 58;
    const x = (BASE_SIZE - w) / 2;
    const y = BOARD_Y - 40 - state.banner.yOffset;

    ctx.shadowColor = "#facc15";
    ctx.shadowBlur = 18;

    drawRoundedRect(x, y, w, h, 16, "rgba(15, 23, 42, 0.94)");

    ctx.shadowBlur = 0;

    ctx.strokeStyle = "rgba(250, 204, 21, 0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, w, h, 16) : ctx.rect(x, y, w, h);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#facc15";
    ctx.font = '900 21px "Trebuchet MS"';
    ctx.fillText(state.banner.text, BASE_SIZE / 2, y + h / 2);

    ctx.restore();
  }

  function render() {
    canvas.width = BASE_SIZE;
    canvas.height = BASE_SIZE;
    drawBackground();
    drawHud();
    drawBoard();
    drawParticles();
    drawScoreFloats();
    drawBanner();
    if (state.mode === "menu") drawMenuOverlay();
    drawEndRibbon();
  }

  function resizeCanvas() {
    const mobile = window.innerWidth <= 520;
    const size = Math.min(
      window.innerWidth - (mobile ? 4 : 20),
      window.innerHeight - (mobile ? 56 : 80),
      860
    );
    canvas.style.width = `${Math.max(320, size)}px`;
    canvas.style.height = `${Math.max(320, size)}px`;
  }

  function isInsideRect(px, py, rect) {
    return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
  }

  function toCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * BASE_SIZE,
      y: ((event.clientY - rect.top) / rect.height) * BASE_SIZE
    };
  }

  function handlePointerMove(event) {
    const point = toCanvasPoint(event);
    if (state.pointer) {
      state.pointer.last = point;
    }
    const hovering = isInsideRect(point.x, point.y, RESTART_BUTTON);
    if (hovering !== state.hoverRestart) {
      state.hoverRestart = hovering;
      render();
    }
  }

  function applySwipe(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
      return false;
    }

    const direction =
      Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? "right" : "left")
        : (dy > 0 ? "down" : "up");

    if (state.mode === "menu") {
      startGame();
    }
    if (state.mode === "won" || state.mode === "lost") {
      restartGame();
    }
    applyMove(direction);
    render();
    return true;
  }

  function handlePointerDown(event) {
    if (event.target.closest && event.target.closest("a, button")) return;
    sounds.init();
    const point = toCanvasPoint(event);
    state.pointer = {
      start: point,
      last: point,
      moved: false
    };
  }

  function handlePointerUp(event) {
    const point = toCanvasPoint(event);
    if (!state.pointer) {
      return;
    }

    const pointer = state.pointer;
    state.pointer = null;
    const swiped = applySwipe(pointer.start, point);
    state.suppressClick = true;
    window.setTimeout(() => {
      state.suppressClick = false;
    }, 0);
    if (!swiped) {
      handlePointerClick(event);
    }
  }

  function handlePointerClick(event) {
    if (state.suppressClick) {
      return;
    }
    const point = toCanvasPoint(event);
    if (isInsideRect(point.x, point.y, RESTART_BUTTON)) {
      restartGame();
      render();
      return;
    }

    const insideBoard =
      point.x >= BOARD_X &&
      point.x <= BOARD_X + BOARD_SIZE &&
      point.y >= BOARD_Y &&
      point.y <= BOARD_Y + BOARD_SIZE;

    if (insideBoard && state.mode === "menu") {
      startGame();
      render();
      return;
    }

    if (insideBoard && (state.mode === "won" || state.mode === "lost")) {
      restartGame();
      render();
    }
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      return;
    }
    canvas.requestFullscreen().catch(() => {});
  }

  function handleMoveKey(move) {
    if (state.mode === "menu") startGame();
    if (state.mode === "won" || state.mode === "lost") restartGame();
    applyMove(move);
    render();
  }

  window.render_game_to_text = function renderGameToText() {
    const payload = {
      title: "alankon Gaming - Git Grid 2048",
      mode: state.mode,
      score: state.score,
      best: state.best,
      board_origin: { x: 0, y: 0, note: "board[row][col], row grows downward, col grows right" },
      board: state.board,
      labels: state.board.map((row) =>
        row.map((value) => (value ? getTileTheme(value).label : ""))
      ),
      last_move: state.lastMove,
      message: state.message,
      sound_enabled: sounds.enabled,
      unlocked_tiles: Array.from(state.unlocked).sort((a, b) => a - b),
      effects: {
        particles: state.particles.length,
        score_floats: state.scoreFloats.length,
        banner: state.banner ? state.banner.text : ""
      },
      animation: state.animation
        ? {
            progress: Number(Math.min(1, state.animation.elapsed / state.animation.duration).toFixed(2)),
            moves: state.animation.moves.map((move) => ({
              from: [move.fromRow, move.fromCol],
              to: [move.toRow, move.toCol],
              value: move.value
            }))
          }
        : null
    };
    return JSON.stringify(payload);
  };

  window.advanceTime = function advanceTime(ms) {
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i++) update(1 / 60);
    render();
    return Promise.resolve();
  };

  document.addEventListener("keydown", (event) => {
    sounds.init();
    const key = event.key.toLowerCase();
    if (key === "r") {
      restartGame();
      render();
      return;
    }
    if (key === "enter" && state.mode === "menu") {
      startGame();
      render();
      return;
    }
    if (key === "f") {
      toggleFullscreen();
      return;
    }
    if (key === "escape" && document.fullscreenElement) {
      document.exitFullscreen();
      return;
    }

    const map = {
      arrowleft: "left",
      a: "left",
      arrowright: "right",
      d: "right",
      arrowup: "up",
      w: "up",
      arrowdown: "down",
      s: "down"
    };
    if (map[key]) handleMoveKey(map[key]);
  });

  document.addEventListener("pointerdown", handlePointerDown);
  document.addEventListener("pointermove", handlePointerMove);
  document.addEventListener("pointerup", handlePointerUp);
  document.addEventListener("pointercancel", () => {
    state.pointer = null;
  });
  canvas.addEventListener("click", handlePointerClick);
  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("fullscreenchange", resizeCanvas);

  const soundBtn = document.getElementById("toggle-sound");
  if (soundBtn) {
    soundBtn.addEventListener("click", () => {
      sounds.enabled = !sounds.enabled;
      sounds.init();
      soundBtn.textContent = sounds.enabled ? "Sons: Ligados 🔊" : "Sons: Mudos 🔇";
      soundBtn.classList.toggle("muted", !sounds.enabled);
      soundBtn.setAttribute("aria-pressed", sounds.enabled ? "true" : "false");
    });
  }

  resizeCanvas();

  let lastTime = performance.now();
  function gameLoop() {
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    update(Math.min(dt, 0.1));
    render();
    requestAnimationFrame(gameLoop);
  }
  requestAnimationFrame(gameLoop);
})();
