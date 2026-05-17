(function () {
  const lastKeyEl = document.getElementById("last-key");
  const hintTextEl = document.getElementById("hint-text");
  const pressCountEl = document.getElementById("press-count");
  const touchKeysEl = document.getElementById("touch-keys");
  const audioStatusEl = document.getElementById("audio-status");
  const funEmojiEl = document.getElementById("fun-emoji");
  const funLabelEl = document.getElementById("fun-label");
  const funCardEl = document.querySelector(".fun-card");
  const ALLOWED = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
  const SOUND_ENGINE_VERSION = "animal-sounds-v5-public-assets";
  const buttons = new Map();
  const PUBLIC_SOUNDS = {
    meow: "/static/sounds/cat-meow-public-domain.mp3",
    woof: "/static/sounds/dog-bark-wikimedia.ogg",
    tiger: "/static/sounds/big-cat-roar-public-domain.ogg",
    roar: "/static/sounds/big-cat-roar-public-domain.ogg",
    dragon: "/static/sounds/big-cat-roar-public-domain.ogg"
  };
  const publicSoundCache = new Map();
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
    lastSoundSource: "procedural",
    audioReady: false,
    audioState: "waiting"
  };
  const STAR_FUN = {
    emoji: "🌟",
    label: "Estrelinha inicial",
    sound: "sparkle",
    star: true
  };
  const FALLBACK_FUN = {
    emoji: "🫏",
    label: "Burrinho curioso",
    sound: "donkey",
    fallback: true
  };

  const AudioClass = window.AudioContext || window.webkitAudioContext;
  const audioCtx = AudioClass ? new AudioClass() : null;
  const masterGain = audioCtx ? audioCtx.createGain() : null;
  const compressor = audioCtx ? audioCtx.createDynamicsCompressor() : null;

  if (audioCtx && masterGain && compressor) {
    masterGain.gain.value = 0.72;
    compressor.threshold.value = -18;
    compressor.knee.value = 24;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.18;
    masterGain.connect(compressor);
    compressor.connect(audioCtx.destination);
  }

  function publicAudioFor(kind) {
    const src = PUBLIC_SOUNDS[kind];
    if (!src) return null;
    if (!publicSoundCache.has(kind)) {
      const audio = new Audio(src);
      audio.preload = "auto";
      audio.volume = kind === "woof" ? 0.9 : 0.82;
      publicSoundCache.set(kind, audio);
    }
    return publicSoundCache.get(kind);
  }

  function playPublicSound(kind) {
    const audio = publicAudioFor(kind);
    if (!audio) return false;
    try {
      audio.pause();
      audio.currentTime = 0;
      const playPromise = audio.play();
      state.audioReady = true;
      state.audioState = "playing-public-file";
      state.lastSoundSource = "public-file";
      audioStatusEl.textContent = `Som publico: ${kind}`;
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => playGeneratedSound(kind));
      }
      return true;
    } catch {
      return false;
    }
  }

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
    gain.connect(masterGain || audioCtx.destination);
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
    gain.connect(masterGain || audioCtx.destination);
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
    gain.connect(masterGain || audioCtx.destination);
    source.start(start);
    source.stop(start + duration + 0.04);
  }

  function softClip(value) {
    return Math.tanh(value * 1.8) * 0.82;
  }

  function burstEnvelope(t, start, duration) {
    if (t < start || t > start + duration) return 0;
    const x = (t - start) / duration;
    const attack = Math.min(1, x / 0.12);
    const release = Math.pow(Math.max(0, 1 - x), 1.7);
    return attack * release;
  }

  function playBufferSound(kind) {
    if (!audioCtx) return false;
    const sampleRate = audioCtx.sampleRate;
    const durations = {
      meow: 0.82,
      woof: 0.62,
      dragon: 0.9,
      roar: 0.82,
      tiger: 0.82,
      donkey: 1.05,
      trumpet: 0.82,
      quack: 0.5,
      ribbit: 0.54,
      robot: 0.58,
      vroom: 0.72,
      sparkle: 0.72,
      magic: 0.72,
      buzz: 0.48,
      bubble: 0.58,
      boing: 0.42,
      bounce: 0.42,
      pop: 0.28,
      ding: 0.42,
      tap: 0.18,
      baby: 0.5,
      jump: 0.34,
      hug: 0.44,
      plop: 0.32,
      wind: 0.62,
      zip: 0.28,
      clip: 0.22
    };
    const duration = durations[kind] || 0.42;
    const buffer = audioCtx.createBuffer(1, Math.ceil(sampleRate * duration), sampleRate);
    const data = buffer.getChannelData(0);
    let noiseState = 0;
    const noise = () => {
      noiseState = noiseState * 0.72 + (Math.random() * 2 - 1) * 0.28;
      return noiseState;
    };

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      let value = 0;

      if (kind === "woof") {
        const env = burstEnvelope(t, 0.02, 0.18) + burstEnvelope(t, 0.28, 0.22);
        value = env * (Math.sign(Math.sin(2 * Math.PI * 118 * t)) * 0.85 + noise() * 0.75);
      } else if (kind === "meow") {
        const env = burstEnvelope(t, 0.03, 0.68);
        const pitch = 920 - 520 * (t / duration) + Math.sin(t * 42) * 28;
        value = env * (Math.sin(2 * Math.PI * pitch * t) * 0.95 + Math.sin(2 * Math.PI * pitch * 2.01 * t) * 0.24);
      } else if (kind === "dragon" || kind === "roar" || kind === "tiger") {
        const env = burstEnvelope(t, 0.02, duration - 0.06);
        const base = kind === "dragon" ? 58 : kind === "tiger" ? 86 : 72;
        const sweep = base + Math.sin(t * 8) * 14 + (1 - t / duration) * 52;
        const bite = kind === "tiger" ? Math.sin(2 * Math.PI * 430 * t) * 0.18 : 0;
        value = env * (Math.sin(2 * Math.PI * sweep * t) * 1.05 + noise() * 0.98 + bite);
      } else if (kind === "donkey") {
        const first = burstEnvelope(t, 0.02, 0.42);
        const second = burstEnvelope(t, 0.48, 0.5);
        const p1 = 430 - 250 * Math.min(1, t / 0.42);
        const p2 = 165 + 390 * Math.max(0, (t - 0.48) / 0.5);
        value = first * (Math.sign(Math.sin(2 * Math.PI * p1 * t)) * 0.78 + noise() * 0.35);
        value += second * (Math.sign(Math.sin(2 * Math.PI * p2 * t)) * 0.9 + noise() * 0.42);
      } else if (kind === "trumpet") {
        const env = burstEnvelope(t, 0.02, 0.7);
        const pitch = 240 + Math.sin(t * 10) * 90 + (t / duration) * 260;
        value = env * (Math.sign(Math.sin(2 * Math.PI * pitch * t)) * 0.75 + Math.sin(2 * Math.PI * pitch * 2 * t) * 0.25);
      } else if (kind === "quack") {
        const env = burstEnvelope(t, 0.02, 0.2) + burstEnvelope(t, 0.22, 0.18);
        const pitch = 520 - t * 310;
        value = env * (Math.sign(Math.sin(2 * Math.PI * pitch * t)) * 0.78 + noise() * 0.18);
      } else if (kind === "ribbit") {
        const env = burstEnvelope(t, 0.02, 0.18) + burstEnvelope(t, 0.27, 0.22);
        const pitch = 240 + Math.sin(t * 36) * 190;
        value = env * (Math.sign(Math.sin(2 * Math.PI * pitch * t)) * 0.72);
      } else if (kind === "robot") {
        const step = Math.floor(t / 0.09) % 2 ? 260 : 410;
        const env = burstEnvelope(t, 0.02, 0.5);
        value = env * Math.sign(Math.sin(2 * Math.PI * step * t)) * 0.7;
      } else if (kind === "vroom") {
        const env = burstEnvelope(t, 0.02, 0.62);
        const pitch = 75 + t * 145 + Math.sin(t * 34) * 20;
        value = env * (Math.sin(2 * Math.PI * pitch * t) * 0.75 + noise() * 0.48);
      } else if (kind === "buzz") {
        const env = burstEnvelope(t, 0.01, 0.42);
        const pitch = 430 + Math.sin(t * 95) * 85;
        value = env * (Math.sign(Math.sin(2 * Math.PI * pitch * t)) * 0.48 + noise() * 0.25);
      } else if (kind === "sparkle" || kind === "magic") {
        const freqs = kind === "sparkle" ? [740, 980, 1320, 1760] : [660, 990, 1320, 1980];
        for (let j = 0; j < freqs.length; j++) {
          value += burstEnvelope(t, j * 0.08, 0.26) * Math.sin(2 * Math.PI * freqs[j] * t) * 0.38;
        }
      } else if (kind === "bubble") {
        value = burstEnvelope(t, 0.02, 0.16) * Math.sin(2 * Math.PI * (360 + t * 1250) * t) * 0.55;
        value += burstEnvelope(t, 0.22, 0.18) * Math.sin(2 * Math.PI * (460 + t * 1200) * t) * 0.5;
      } else if (kind === "boing" || kind === "jump" || kind === "bounce") {
        const env = burstEnvelope(t, 0.01, duration - 0.04);
        const pitch = 260 + Math.sin((t / duration) * Math.PI) * 620;
        value = env * Math.sin(2 * Math.PI * pitch * t) * 0.72;
      } else if (kind === "pop" || kind === "tap" || kind === "clip") {
        const env = burstEnvelope(t, 0.005, duration - 0.02);
        value = env * (noise() * 0.9 + Math.sin(2 * Math.PI * 760 * t) * 0.35);
      } else if (kind === "baby" || kind === "hug" || kind === "ding") {
        const env = burstEnvelope(t, 0.01, duration - 0.04);
        const pitch = kind === "baby" ? 760 + Math.sin(t * 22) * 160 : kind === "hug" ? 430 : 920;
        value = env * Math.sin(2 * Math.PI * pitch * t) * 0.62;
      } else if (kind === "wind" || kind === "zip" || kind === "plop") {
        const env = burstEnvelope(t, 0.01, duration - 0.03);
        const pitch = kind === "zip" ? 920 - t * 2100 : kind === "plop" ? 260 - t * 520 : 520 + Math.sin(t * 16) * 170;
        value = env * (Math.sin(2 * Math.PI * Math.max(80, pitch) * t) * 0.45 + noise() * 0.28);
      } else {
        const env = burstEnvelope(t, 0.01, duration - 0.03);
        value = env * Math.sin(2 * Math.PI * 620 * t) * 0.5;
      }

      data[i] = softClip(value);
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(masterGain || audioCtx.destination);
    source.start(nowTime() + 0.01);
    return true;
  }

  function playGeneratedSound(kind) {
    if (!audioCtx) {
      state.audioState = "unavailable";
      audioStatusEl.textContent = "Som indisponivel";
      return;
    }
    const play = () => {
      const t = nowTime() + 0.015;
      if (playBufferSound(kind)) {
        state.audioReady = true;
        state.audioState = audioCtx.state;
        state.lastSoundSource = "procedural-buffer";
        audioStatusEl.textContent = `Som ativo: ${kind}`;
        return;
      }
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
          [660, 880, 1320, 1760].forEach((freq, i) => addTone(freq, t + i * 0.07, 0.18, "sine", 0.15));
        },
        sparkle: () => {
          [740, 980, 1320, 1760].forEach((freq, i) => addTone(freq, t + i * 0.06, 0.2, "sine", 0.14));
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
        ding: () => addTone(920, t, 0.28, "sine", 0.18),
        tap: () => addTone(520, t, 0.12, "triangle", 0.16),
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
      state.audioState = audioCtx.state;
      state.lastSoundSource = "procedural-oscillator";
      audioStatusEl.textContent = `Som ativo: ${kind}`;
    };
    try {
      if (audioCtx.state === "suspended") {
        state.audioState = "unlocking";
        audioStatusEl.textContent = "Liberando som...";
        audioCtx.resume().then(play).catch(() => {});
        return;
      }
      play();
    } catch {}
  }

  function playCuteSound(kind) {
    if (playPublicSound(kind)) return;
    playGeneratedSound(kind);
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
    const fun = char.startsWith("STAR:") ? STAR_FUN : char.startsWith("ARROW:") ? FALLBACK_FUN : FUN_MAP[char] || STAR_FUN;
    state.lastKey = char;
    state.lastItem = fun.fallback || fun.star ? `${fun.label}: tecla ${displayKey}` : fun.label;
    state.lastSound = fun.sound;
    state.pressCount += 1;
    lastKeyEl.textContent = fun.fallback ? "!" : fun.star ? "★" : char;
    pressCountEl.textContent = String(state.pressCount);
    hintTextEl.textContent = fun.star
      ? "Tecla nao mapeada voltou para a estrelinha inicial."
      : fun.fallback
      ? "As setas chamaram o burrinho surpresa."
      : "Toque outra tecla para trocar o desenho animado.";
    funEmojiEl.textContent = fun.emoji;
    funLabelEl.textContent = fun.fallback || fun.star ? `${fun.label}: ${displayKey}` : fun.label;
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
    if (event.key === " " || event.key === "Spacebar") {
      registerChar("STAR:space", "espaco");
      return;
    }
    if (event.key === "Enter") {
      registerChar("STAR:enter", "enter");
      return;
    }
    if (event.key.startsWith("Arrow")) {
      registerChar(`ARROW:${labelForOtherKey(event.key)}`, labelForOtherKey(event.key));
      return;
    }
    registerChar(`STAR:${labelForOtherKey(event.key)}`, labelForOtherKey(event.key));
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
      last_sound_source: state.lastSoundSource,
      press_count: state.pressCount,
      audio_ready: state.audioReady,
      audio_state: state.audioState,
      sound_engine_version: SOUND_ENGINE_VERSION,
      animated_visual: true,
      note: "A-Z e 0-9 usam mapeamento educativo; setas chamam o burrinho; outras teclas nao mapeadas voltam para a estrela. Sons publicos sao usados quando disponiveis com fallback procedural."
    });
  };

  window.advanceTime = function advanceTime() {
    return Promise.resolve();
  };

  buildTouchKeyboard();
  window.addEventListener("keydown", onKeyDown);
})();
