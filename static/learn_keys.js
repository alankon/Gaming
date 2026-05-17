(function () {
  const lastKeyEl = document.getElementById("last-key");
  const hintTextEl = document.getElementById("hint-text");
  const pressCountEl = document.getElementById("press-count");
  const touchKeysEl = document.getElementById("touch-keys");
  const funEmojiEl = document.getElementById("fun-emoji");
  const funLabelEl = document.getElementById("fun-label");
  const funCardEl = document.querySelector(".fun-card");
  const ALLOWED = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
  const SOUND_ENGINE_VERSION = "animal-sounds-v2";
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
    T: { emoji: "🐯", label: "T de tigre", sound: "tiger" },
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
  const FALLBACK_FUN = {
    emoji: "🫏",
    label: "Burrinho curioso",
    sound: "donkey",
    fallback: true
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

  function addNoise(start, duration, volume, filterFreq) {
    if (!audioCtx) return;
    const sampleRate = audioCtx.sampleRate;
    const buffer = audioCtx.createBuffer(1, Math.ceil(sampleRate * duration), sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < channel.length; i++) {
      channel[i] = Math.random() * 2 - 1;
    }
    const source = audioCtx.createBufferSource();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(filterFreq, start);
    filter.Q.setValueAtTime(0.9, start);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    source.start(start);
    source.stop(start + duration + 0.04);
  }

  function playCuteSound(kind) {
    if (!audioCtx) return;
    const play = () => {
      const t = nowTime() + 0.015;
      const sounds = {
        meow: () => {
          addSlide(980, 430, t, 0.28, "sawtooth", 0.22);
          addSlide(760, 1120, t + 0.22, 0.32, "triangle", 0.18);
          addTone(1320, t + 0.5, 0.08, "sine", 0.08);
        },
        woof: () => {
          addNoise(t, 0.13, 0.16, 230);
          addTone(135, t, 0.16, "square", 0.18);
          addNoise(t + 0.19, 0.14, 0.14, 190);
          addTone(110, t + 0.19, 0.18, "square", 0.16);
        },
        dragon: () => {
          addNoise(t, 0.62, 0.18, 155);
          addSlide(175, 42, t, 0.62, "sawtooth", 0.2);
          addTone(66, t + 0.14, 0.38, "square", 0.12);
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
        trumpet: () => {
          addSlide(210, 620, t, 0.34, "sawtooth", 0.18);
          addSlide(620, 260, t + 0.3, 0.26, "sawtooth", 0.14);
        },
        roar: () => {
          addNoise(t, 0.54, 0.18, 165);
          addSlide(210, 74, t, 0.52, "sawtooth", 0.18);
          addTone(92, t + 0.18, 0.22, "triangle", 0.1);
        },
        tiger: () => {
          addNoise(t, 0.48, 0.18, 230);
          addSlide(260, 86, t, 0.48, "sawtooth", 0.19);
          addNoise(t + 0.2, 0.18, 0.1, 420);
          addTone(128, t + 0.24, 0.2, "triangle", 0.11);
        },
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
        quack: () => {
          addSlide(780, 330, t, 0.16, "sawtooth", 0.14);
          addSlide(680, 290, t + 0.14, 0.16, "sawtooth", 0.12);
        },
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
        tap: () => addTone(520, t, 0.08, "triangle", 0.09),
        donkey: () => {
          addNoise(t, 0.24, 0.12, 310);
          addSlide(420, 145, t, 0.3, "sawtooth", 0.18);
          addTone(145, t + 0.28, 0.12, "square", 0.1);
          addNoise(t + 0.34, 0.34, 0.14, 360);
          addSlide(155, 520, t + 0.34, 0.42, "sawtooth", 0.19);
        }
      };
      (sounds[kind] || sounds.ding)();
      state.audioReady = true;
    };
    try {
      if (audioCtx.state === "suspended") {
        audioCtx.resume().then(play).catch(() => {});
        return;
      }
      play();
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

  function registerChar(char, displayKey) {
    const fun = FUN_MAP[char] || FALLBACK_FUN;
    state.lastKey = char;
    state.lastItem = fun.fallback ? `${fun.label}: tecla ${displayKey}` : fun.label;
    state.lastSound = fun.sound;
    state.pressCount += 1;
    lastKeyEl.textContent = fun.fallback ? "!" : char;
    pressCountEl.textContent = String(state.pressCount);
    hintTextEl.textContent = fun.fallback
      ? "Essa tecla chamou o burrinho surpresa."
      : "Toque outra tecla para trocar o desenho animado.";
    funEmojiEl.textContent = fun.emoji;
    funLabelEl.textContent = fun.fallback ? `${fun.label}: ${displayKey}` : fun.label;
    funCardEl.classList.toggle("silly", Boolean(fun.fallback));
    flashButton(char);
    replayAnimation();
    playCuteSound(fun.sound);
  }

  function normalizeKey(key) {
    if (!key) return "";
    const upper = key.toUpperCase();
    return ALLOWED.includes(upper) ? upper : "";
  }

  function labelForOtherKey(key) {
    const labels = {
      " ": "espaco",
      Spacebar: "espaco",
      Enter: "enter",
      Tab: "tab",
      Escape: "esc",
      Backspace: "backspace",
      Delete: "delete",
      ArrowUp: "seta cima",
      ArrowDown: "seta baixo",
      ArrowLeft: "seta esquerda",
      ArrowRight: "seta direita",
      ",": "virgula",
      ".": "ponto",
      ";": "ponto e virgula",
      ":": "dois pontos",
      "-": "traco",
      "_": "underline"
    };
    return labels[key] || key;
  }

  function onKeyDown(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const normalized = normalizeKey(event.key);
    event.preventDefault();
    if (normalized) {
      registerChar(normalized, normalized);
      return;
    }
    registerChar(`OTHER:${labelForOtherKey(event.key)}`, labelForOtherKey(event.key));
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
      sound_engine_version: SOUND_ENGINE_VERSION,
      animated_visual: true,
      note: "Aceita qualquer tecla do teclado fisico; A-Z e 0-9 tambem funcionam por botoes touch. Usa WebAudio procedural, sem voz e sem arquivos de audio."
    });
  };

  window.advanceTime = function advanceTime() {
    return Promise.resolve();
  };

  buildTouchKeyboard();
  window.addEventListener("keydown", onKeyDown);
})();
