(function () {
  const lastKeyEl = document.getElementById("last-key");
  const hintTextEl = document.getElementById("hint-text");
  const pressCountEl = document.getElementById("press-count");
  const touchKeysEl = document.getElementById("touch-keys");
  const funEmojiEl = document.getElementById("fun-emoji");
  const funLabelEl = document.getElementById("fun-label");
  const funCardEl = document.querySelector(".fun-card");
  const ALLOWED = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
  const buttons = new Map();
  const FUN_MAP = {
    A: { emoji: "🐝", label: "A de abelhinha", sound: "buzz" },
    B: { emoji: "🍼", label: "B de bebe feliz", sound: "baby" },
    C: { emoji: "🐶", label: "C de cachorro", sound: "woof" },
    D: { emoji: "🐉", label: "D de dragao", sound: "dragon" },
    E: { emoji: "🐘", label: "E de elefante", sound: "trumpet" },
    F: { emoji: "🧚", label: "F de fada", sound: "magic" },
    G: { emoji: "🐱", label: "G de gato", sound: "meow" },
    H: { emoji: "🦛", label: "H de hipopotamo", sound: "plop" },
    I: { emoji: "🧁", label: "I de cupcake", sound: "ding" },
    J: { emoji: "🦒", label: "J de jirafa", sound: "boing" },
    K: { emoji: "🪁", label: "K de pipa colorida", sound: "wind" },
    L: { emoji: "🦁", label: "L de leao", sound: "roar" },
    M: { emoji: "🐒", label: "M de macaquinho", sound: "jump" },
    N: { emoji: "👶", label: "N de nenem", sound: "baby" },
    O: { emoji: "🐻", label: "O de ursinho", sound: "hug" },
    P: { emoji: "🐼", label: "P de panda", sound: "hug" },
    Q: { emoji: "🧀", label: "Q de queijo", sound: "pop" },
    R: { emoji: "🤖", label: "R de robo", sound: "robot" },
    S: { emoji: "🐸", label: "S de sapinho", sound: "ribbit" },
    T: { emoji: "🐢", label: "T de tartaruga", sound: "bubble" },
    U: { emoji: "🦄", label: "U de unicornio", sound: "magic" },
    V: { emoji: "🦊", label: "V de raposinha veloz", sound: "zip" },
    W: { emoji: "🍉", label: "W de melancia", sound: "pop" },
    X: { emoji: "❌", label: "X de xis divertido", sound: "tap" },
    Y: { emoji: "🪀", label: "Y de ioio", sound: "boing" },
    Z: { emoji: "🦓", label: "Z de zebra", sound: "clip" },
    0: { emoji: "⚽", label: "Zero de bola", sound: "bounce" },
    1: { emoji: "☀️", label: "Um sol brilhante", sound: "ding" },
    2: { emoji: "🦆", label: "Dois patinhos", sound: "quack" },
    3: { emoji: "🎈", label: "Tres baloes", sound: "pop" },
    4: { emoji: "🚗", label: "Quatro rodas de carrinho", sound: "vroom" },
    5: { emoji: "🖐️", label: "Cinco dedinhos", sound: "tap" },
    6: { emoji: "🐞", label: "Seis de joaninha", sound: "buzz" },
    7: { emoji: "🌈", label: "Sete cores do arco-iris", sound: "magic" },
    8: { emoji: "🐙", label: "Oito tentaculos do polvo", sound: "bubble" },
    9: { emoji: "🍦", label: "Nove de sorvete", sound: "ding" }
  };

  const state = {
    pressCount: 0,
    lastKey: "?",
    lastItem: "estrelinha",
    lastSound: "sparkle",
    audioReady: false
  };

  const AudioClass = window.AudioContext || window.webkitAudioContext;
  const audioCtx = AudioClass ? new AudioClass() : null;

  function nowTime() {
    return audioCtx ? audioCtx.currentTime : 0;
  }

  function addTone(freq, start, duration, type, volume) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.04);
  }

  function addSlide(freqStart, freqEnd, start, duration, type, volume) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, start);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, start + duration);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.04);
  }

  function playCuteSound(kind) {
    if (!audioCtx) return;
    try {
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      const t = nowTime();
      const sounds = {
        meow: () => {
          addSlide(720, 410, t, 0.18, "triangle", 0.16);
          addSlide(560, 820, t + 0.15, 0.18, "triangle", 0.12);
        },
        woof: () => {
          addTone(180, t, 0.1, "square", 0.12);
          addTone(150, t + 0.13, 0.12, "square", 0.1);
        },
        dragon: () => {
          addSlide(140, 52, t, 0.34, "sawtooth", 0.09);
          addTone(90, t + 0.08, 0.18, "triangle", 0.08);
        },
        buzz: () => {
          addTone(520, t, 0.08, "sawtooth", 0.08);
          addTone(640, t + 0.08, 0.08, "sawtooth", 0.07);
          addTone(540, t + 0.16, 0.08, "sawtooth", 0.07);
        },
        magic: () => {
          [660, 880, 1320].forEach((freq, i) => addTone(freq, t + i * 0.08, 0.16, "sine", 0.1));
        },
        baby: () => {
          addTone(760, t, 0.12, "triangle", 0.11);
          addTone(920, t + 0.13, 0.14, "triangle", 0.1);
        },
        trumpet: () => addSlide(220, 440, t, 0.32, "sawtooth", 0.1),
        roar: () => addSlide(180, 80, t, 0.36, "triangle", 0.12),
        ribbit: () => {
          addSlide(260, 520, t, 0.12, "square", 0.08);
          addSlide(220, 480, t + 0.16, 0.12, "square", 0.08);
        },
        robot: () => {
          addTone(330, t, 0.1, "square", 0.09);
          addTone(250, t + 0.11, 0.1, "square", 0.09);
          addTone(390, t + 0.22, 0.1, "square", 0.09);
        },
        bubble: () => {
          addSlide(360, 720, t, 0.12, "sine", 0.08);
          addSlide(430, 860, t + 0.12, 0.12, "sine", 0.07);
        },
        boing: () => addSlide(260, 780, t, 0.22, "triangle", 0.12),
        bounce: () => {
          addSlide(380, 180, t, 0.14, "sine", 0.11);
          addSlide(320, 220, t + 0.15, 0.1, "sine", 0.08);
        },
        quack: () => addSlide(520, 300, t, 0.18, "sawtooth", 0.08),
        vroom: () => addSlide(90, 180, t, 0.34, "sawtooth", 0.08),
        wind: () => addSlide(740, 520, t, 0.28, "sine", 0.08),
        zip: () => addSlide(900, 360, t, 0.16, "sine", 0.1),
        clip: () => {
          addTone(360, t, 0.06, "square", 0.08);
          addTone(460, t + 0.09, 0.06, "square", 0.08);
        },
        jump: () => addSlide(320, 690, t, 0.16, "triangle", 0.11),
        hug: () => addTone(430, t, 0.24, "triangle", 0.09),
        plop: () => addSlide(250, 120, t, 0.18, "sine", 0.1),
        pop: () => addSlide(540, 980, t, 0.09, "triangle", 0.11),
        ding: () => addTone(920, t, 0.22, "sine", 0.1),
        tap: () => addTone(520, t, 0.08, "triangle", 0.09)
      };
      (sounds[kind] || sounds.ding)();
      state.audioReady = true;
    } catch {}
  }

  function flashButton(char) {
    const btn = buttons.get(char);
    if (!btn) return;
    btn.classList.add("active");
    window.setTimeout(() => btn.classList.remove("active"), 160);
  }

  function replayAnimation() {
    funCardEl.classList.remove("pop");
    void funCardEl.offsetWidth;
    funCardEl.classList.add("pop");
  }

  function registerChar(char) {
    const fun = FUN_MAP[char] || { emoji: "🌟", label: `Tecla ${char}`, sound: "ding" };
    state.lastKey = char;
    state.lastItem = fun.label;
    state.lastSound = fun.sound;
    state.pressCount += 1;
    lastKeyEl.textContent = char;
    pressCountEl.textContent = String(state.pressCount);
    hintTextEl.textContent = "Toque outra tecla para trocar o desenho animado.";
    funEmojiEl.textContent = fun.emoji;
    funLabelEl.textContent = fun.label;
    flashButton(char);
    replayAnimation();
    playCuteSound(fun.sound);
  }

  function normalizeKey(key) {
    if (!key || key.length !== 1) return "";
    const upper = key.toUpperCase();
    return ALLOWED.includes(upper) ? upper : "";
  }

  function onKeyDown(event) {
    const normalized = normalizeKey(event.key);
    if (!normalized) return;
    event.preventDefault();
    registerChar(normalized);
  }

  function buildTouchKeyboard() {
    for (const char of ALLOWED) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "key-btn";
      btn.textContent = char;
      btn.setAttribute("aria-label", `Tecla ${char}`);
      btn.addEventListener("click", () => registerChar(char));
      touchKeysEl.appendChild(btn);
      buttons.set(char, btn);
    }
  }

  window.render_game_to_text = function renderGameToText() {
    return JSON.stringify({
      mode: "learn-keys",
      last_key: state.lastKey,
      last_item: state.lastItem,
      last_sound: state.lastSound,
      press_count: state.pressCount,
      audio_ready: state.audioReady,
      animated_visual: true,
      note: "Aceita A-Z e 0-9 por teclado fisico ou botoes touch; usa WebAudio procedural, sem voz e sem arquivos de audio."
    });
  };

  window.advanceTime = function advanceTime() {
    return Promise.resolve();
  };

  buildTouchKeyboard();
  window.addEventListener("keydown", onKeyDown);
})();
