(function () {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const BASE_SIZE = 920;
  const GRID_SIZE = 4;
  const BOARD_X = 64;
  const BOARD_Y = 248;
  const BOARD_SIZE = 792;
  const GAP = 16;
  const CELL = (BOARD_SIZE - GAP * (GRID_SIZE + 1)) / GRID_SIZE;
  const STORAGE_KEY = "alankon_gaming_grid_best";
  const RESTART_BUTTON = { x: 64, y: 182, w: 166, h: 56 };
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

  const state = {
    mode: "menu",
    board: createEmptyBoard(),
    score: 0,
    best: loadBest(),
    lastMove: "none",
    message: "Clique no grid para iniciar sua run",
    flash: 0,
    hoverRestart: false,
    justSpawned: [],
    justMerged: []
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

  function getEmptyCells() {
    const cells = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (state.board[row][col] === 0) cells.push({ row, col });
      }
    }
    return cells;
  }

  function addRandomTile() {
    const cells = getEmptyCells();
    if (!cells.length) return false;
    const cell = cells[Math.floor(Math.random() * cells.length)];
    state.board[cell.row][cell.col] = Math.random() < 0.9 ? 2 : 4;
    state.justSpawned.push({ row: cell.row, col: cell.col, life: 0.9 });
    return true;
  }

  function startGame() {
    state.board = createEmptyBoard();
    state.score = 0;
    state.lastMove = "spawn";
    state.mode = "playing";
    state.message = "Una seus blocos Git ate chegar ao tile ALANKON GAMING";
    state.flash = 0.7;
    state.justSpawned = [];
    state.justMerged = [];
    addRandomTile();
    addRandomTile();
  }

  function restartGame() {
    startGame();
  }

  function slideRowLeft(rowIndex, row) {
    const compact = row.filter((value) => value !== 0);
    const merged = [];
    let gained = 0;

    for (let i = 0; i < compact.length; i++) {
      const current = compact[i];
      const next = compact[i + 1];
      if (next && current === next) {
        const value = current * 2;
        merged.push(value);
        gained += value;
        state.justMerged.push({ row: rowIndex, col: merged.length - 1, life: 1 });
        i++;
      } else {
        merged.push(current);
      }
    }

    while (merged.length < GRID_SIZE) merged.push(0);
    return { row: merged, gained };
  }

  function rotateBoard(board) {
    const next = createEmptyBoard();
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        next[row][col] = board[col][GRID_SIZE - row - 1];
      }
    }
    return next;
  }

  function rotateTimes(board, count) {
    let next = cloneBoard(board);
    for (let i = 0; i < count; i++) next = rotateBoard(next);
    return next;
  }

  function rotatePosition(pos, count) {
    let row = pos.row;
    let col = pos.col;
    for (let i = 0; i < count; i++) {
      const nextRow = col;
      const nextCol = GRID_SIZE - row - 1;
      row = nextRow;
      col = nextCol;
    }
    return { ...pos, row, col };
  }

  function boardsMatch(a, b) {
    return a.every((row, rowIndex) => row.every((cell, colIndex) => cell === b[rowIndex][colIndex]));
  }

  function canMove() {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const value = state.board[row][col];
        if (value === 0) return true;
        if (row + 1 < GRID_SIZE && state.board[row + 1][col] === value) return true;
        if (col + 1 < GRID_SIZE && state.board[row][col + 1] === value) return true;
      }
    }
    return false;
  }

  function updateBest() {
    if (state.score > state.best) {
      state.best = state.score;
      saveBest();
    }
  }

  function applyMove(direction) {
    if (state.mode !== "playing") return;
    const rotations = { left: 0, up: 3, right: 2, down: 1 };
    state.justMerged = [];
    const rotated = rotateTimes(state.board, rotations[direction]);
    const shifted = createEmptyBoard();
    let gained = 0;

    for (let row = 0; row < GRID_SIZE; row++) {
      const result = slideRowLeft(row, rotated[row]);
      shifted[row] = result.row;
      gained += result.gained;
    }

    const restored = rotateTimes(shifted, (4 - rotations[direction]) % 4);
    if (boardsMatch(state.board, restored)) {
      state.message = "Esse movimento nao alterou seu grid";
      state.lastMove = direction;
      return;
    }

    state.justMerged = state.justMerged.map((item) => rotatePosition(item, (4 - rotations[direction]) % 4));
    state.board = restored;
    state.score += gained;
    updateBest();
    state.lastMove = direction;
    state.flash = 0.65;
    state.justSpawned = [];
    addRandomTile();

    const maxTile = Math.max(...state.board.flat());
    if (maxTile >= 2048) {
      state.mode = "won";
      state.message = "alankon Gaming desbloqueado. Voce chegou no 2048.";
      return;
    }

    if (!canMove()) {
      state.mode = "lost";
      state.message = "Run encerrada. Bata seu best e tente outra vez.";
      return;
    }

    state.message = `Movimento ${direction} confirmado`;
  }

  function update(dt) {
    state.flash = Math.max(0, state.flash - dt * 1.6);
    state.justSpawned = state.justSpawned
      .map((item) => ({ ...item, life: item.life - dt * 2 }))
      .filter((item) => item.life > 0);
    state.justMerged = state.justMerged
      .map((item) => ({ ...item, life: item.life - dt * 2.4 }))
      .filter((item) => item.life > 0);
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
      if (ctx.measureText(text).width <= maxWidth || size <= 16) break;
      size -= 2;
    } while (size > 16);
    return size;
  }

  function getTilePulse(row, col) {
    const spawned = state.justSpawned.find((item) => item.row === row && item.col === col);
    if (spawned) return 1 + spawned.life * 0.16;
    const merged = state.justMerged.find((item) => item.row === row && item.col === col);
    if (merged) return 1 + merged.life * 0.24;
    return 1;
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, BASE_SIZE, BASE_SIZE);
    gradient.addColorStop(0, "#0f172a");
    gradient.addColorStop(0.45, "#111827");
    gradient.addColorStop(1, "#14213d");
    drawRoundedRect(0, 0, BASE_SIZE, BASE_SIZE, 0, gradient);

    for (let i = 0; i < 18; i++) {
      const x = 40 + ((i * 173) % 860);
      const y = 40 + ((i * 127) % 820);
      const radius = 22 + ((i * 7) % 34);
      ctx.fillStyle = `rgba(34, 211, 238, ${0.04 + (i % 3) * 0.02})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBoard() {
    drawRoundedRect(BOARD_X, BOARD_Y, BOARD_SIZE, BOARD_SIZE, 30, "#1f2937");
    drawRoundedRect(BOARD_X + 6, BOARD_Y + 6, BOARD_SIZE - 12, BOARD_SIZE - 12, 26, "#273449");

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const value = state.board[row][col];
        const x = BOARD_X + GAP + col * (CELL + GAP);
        const y = BOARD_Y + GAP + row * (CELL + GAP);
        drawRoundedRect(x, y, CELL, CELL, 22, "#344155");
        if (!value) continue;

        const tile = TILE_THEME[value] || TILE_THEME[4096];
        const pulse = getTilePulse(row, col);
        const cx = x + CELL / 2;
        const cy = y + CELL / 2;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(pulse, pulse);
        ctx.translate(-cx, -cy);
        drawRoundedRect(x, y, CELL, CELL, 22, tile.color);

        ctx.fillStyle = tile.ink;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const numberSize = fitText(`${value}`, CELL - 28, value > 999 ? 40 : 52, 900);
        ctx.font = `900 ${numberSize}px "Trebuchet MS"`;
        ctx.fillText(`${value}`, cx, y + CELL / 2 - 8);

        const labelSize = fitText(tile.label.toUpperCase(), CELL - 28, 22, 800);
        ctx.font = `800 ${labelSize}px "Trebuchet MS"`;
        ctx.fillText(tile.label.toUpperCase(), cx, y + CELL - 30);
        ctx.restore();
      }
    }
  }

  function drawHudCard(x, y, w, h, title, value, fill) {
    drawRoundedRect(x, y, w, h, 20, fill);
    ctx.textAlign = "center";
    ctx.fillStyle = "#f8fafc";
    ctx.font = '700 18px "Trebuchet MS"';
    ctx.fillText(title, x + w / 2, y + 26);
    ctx.font = '900 34px "Trebuchet MS"';
    ctx.fillText(`${value}`, x + w / 2, y + 60);
  }

  function drawRestartButton() {
    const fill = state.hoverRestart ? "#38bdf8" : "#263244";
    drawRoundedRect(RESTART_BUTTON.x, RESTART_BUTTON.y, RESTART_BUTTON.w, RESTART_BUTTON.h, 18, fill);
    ctx.textAlign = "center";
    ctx.fillStyle = "#eff6ff";
    ctx.font = '800 22px "Trebuchet MS"';
    ctx.fillText("Nova run", RESTART_BUTTON.x + RESTART_BUTTON.w / 2, RESTART_BUTTON.y + 35);
  }

  function drawHud() {
    ctx.textAlign = "left";
    ctx.fillStyle = "#e5eefb";
    ctx.font = '900 68px "Trebuchet MS"';
    ctx.fillText("alankon Gaming", 64, 92);

    ctx.fillStyle = "#7dd3fc";
    ctx.font = '700 28px "Trebuchet MS"';
    ctx.fillText("Git Grid 2048", 66, 132);

    ctx.fillStyle = "#bfdbfe";
    ctx.font = '600 22px "Trebuchet MS"';
    ctx.fillText("clone, commit, push, merge e conquiste seu proprio tile lendario.", 64, 166);

    drawHudCard(612, 54, 116, 84, "SCORE", state.score, "#f97316");
    drawHudCard(744, 54, 116, 84, "BEST", state.best, "#0f766e");
    drawRestartButton();

    drawRoundedRect(248, 182, 612, 56, 18, "rgba(255,255,255,0.08)");
    ctx.fillStyle = "#f8fafc";
    ctx.font = '700 22px "Trebuchet MS"';
    ctx.textAlign = "left";
    ctx.fillText(state.message, 272, 217);
  }

  function drawMenuOverlay() {
    drawRoundedRect(106, 308, 708, 290, 30, "rgba(9, 14, 29, 0.82)");
    ctx.textAlign = "center";
    ctx.fillStyle = "#f8fafc";
    ctx.font = '900 56px "Trebuchet MS"';
    ctx.fillText("Seu grid. Sua marca.", BASE_SIZE / 2, 384);
    ctx.fillStyle = "#bae6fd";
    ctx.font = '700 28px "Trebuchet MS"';
    ctx.fillText("Setas ou WASD movem. R reinicia. F alterna fullscreen.", BASE_SIZE / 2, 442);
    ctx.fillText("Clique no tabuleiro para abrir a primeira run.", BASE_SIZE / 2, 486);
    ctx.fillStyle = "#facc15";
    ctx.font = '900 32px "Trebuchet MS"';
    ctx.fillText("Meta: chegar ao tile ALANKON GAMING 2048", BASE_SIZE / 2, 548);
  }

  function drawEndRibbon() {
    if (state.mode !== "won" && state.mode !== "lost") return;
    const won = state.mode === "won";
    drawRoundedRect(150, 678, 620, 110, 24, won ? "rgba(16, 185, 129, 0.9)" : "rgba(239, 68, 68, 0.9)");
    ctx.textAlign = "center";
    ctx.fillStyle = "#f8fafc";
    ctx.font = '900 40px "Trebuchet MS"';
    ctx.fillText(won ? "Marca propria desbloqueada" : "Fim da run", BASE_SIZE / 2, 722);
    ctx.font = '700 24px "Trebuchet MS"';
    ctx.fillText("Use Nova run ou aperte R para jogar de novo.", BASE_SIZE / 2, 758);
  }

  function render() {
    canvas.width = BASE_SIZE;
    canvas.height = BASE_SIZE;
    drawBackground();
    drawHud();
    drawBoard();
    if (state.mode === "menu") drawMenuOverlay();
    drawEndRibbon();
  }

  function resizeCanvas() {
    const maxWidth = Math.min(window.innerWidth - 32, 980);
    canvas.style.width = `${maxWidth}px`;
    canvas.style.height = `${maxWidth}px`;
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
    const hovering = isInsideRect(point.x, point.y, RESTART_BUTTON);
    if (hovering !== state.hoverRestart) {
      state.hoverRestart = hovering;
      render();
    }
  }

  function handlePointerClick(event) {
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
        row.map((value) => (value ? (TILE_THEME[value] || TILE_THEME[4096]).label : ""))
      ),
      last_move: state.lastMove,
      message: state.message
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

  canvas.addEventListener("mousemove", handlePointerMove);
  canvas.addEventListener("click", handlePointerClick);
  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("fullscreenchange", resizeCanvas);

  resizeCanvas();
  render();
})();
