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
  const SOUND_ENGINE_VERSION = "animal-sounds-v17-fuller-sound-map";
  const buttons = new Map();
  const PUBLIC_SOUNDS = {
    baby: "static/sounds/baby-laugh-cc-by.ogg",
    balloon: "static/sounds/balloon-pop.ogg",
    bear: "static/sounds/bear-growl.ogg",
    boing: "static/sounds/boing-cc0.ogg",
    bounce: "static/sounds/boing-cc0.ogg",
    bubble: "static/sounds/balloon-pop.ogg",
    buzz: "static/sounds/bee-buzz-public-domain.ogg",
    car: "static/sounds/car-horn-wikimedia.ogg",
    ding: "static/sounds/windchimes-public-domain.ogg",
    donkey: "static/sounds/donkey-bray-wikimedia.oga",
    dragon: "static/sounds/big-cat-roar-public-domain.ogg",
    jacare: "static/sounds/alligator-bellow-pd.ogg",
    magic: "static/sounds/windchimes-public-domain.ogg",
    meow: "static/sounds/cat-meow-public-domain.mp3",
    monkey: "static/sounds/cute-monkey-chatter.mp3",
    moo: "static/sounds/cow-moo-wikimedia.ogg",
    plop: "static/sounds/balloon-pop.ogg",
    pop: "static/sounds/balloon-pop.ogg",
    quack: "static/sounds/duck-quack-wikimedia.ogg",
    robot: "static/sounds/robot-buzzing-pd.ogg",
    sheep: "static/sounds/sheep-baa-wikimedia.ogg",
    sparkle: "static/sounds/windchimes-public-domain.ogg",
    splash: "static/sounds/seal-calls-cc-by.ogg",
    tap: "static/sounds/boing-cc0.ogg",
    vroom: "static/sounds/car-horn-wikimedia.ogg",
    woof: "static/sounds/dog-bark-wikimedia.ogg",
    trumpet: "static/sounds/elephant-trumpet-cc0.ogg",
    ribbit: "static/sounds/frog-croak-open.oga",
    roar: "static/sounds/big-cat-roar-public-domain.ogg",
    tiger: "static/sounds/big-cat-roar-public-domain.ogg",
    wind: "static/sounds/windchimes-public-domain.ogg",
    zebra: "static/sounds/zebra-barking.ogg"
  };
  const publicSoundCache = new Map();
  const activeSoundNodes = new Set();
  let activePublicAudio = null;
  let activePublicStopTimer = null;
  let soundTicket = 0;
  let sessionStarted = false;
  let lastReportedPressCount = 0;

  function analytics() {
    return window.alankonGaming || null;
  }
  const FUN_MAP = {
    A: { emoji: "🐝", label: "A de abelha", sound: "buzz" },
    B: { emoji: "👶", label: "B de bebe", sound: "baby" },
    C: { emoji: "🐶", label: "C de cachorro", sound: "woof" },
    D: { emoji: "🐉", label: "D de dragao", sound: "dragon" },
    E: { emoji: "🐘", label: "E de elefante", sound: "trumpet" },
    F: { emoji: "🦭", label: "F de Foca", sound: "splash" },
    G: { emoji: "🐱", label: "G de gato", sound: "meow" },
    H: { emoji: "🦛", label: "H de hipopotamo", sound: "plop" },
    I: { emoji: "🏝️", label: "I de ilha", sound: "wind" },
    J: { emoji: "🐊", label: "J de jacare", sound: "jacare" },
    K: { emoji: "🥝", label: "K de kiwi", sound: "pop" },
    L: { emoji: "🦁", label: "L de leao", sound: "roar" },
    M: { emoji: "🐒", label: "M de macaco", sound: "monkey" },
    N: { emoji: "👶", label: "N de nenem", sound: "baby" },
    O: { emoji: "🐑", label: "O de ovelha", sound: "sheep" },
    P: { emoji: "🦆", label: "P de pato", sound: "quack" },
    Q: { emoji: "🧀", label: "Q de queijo", sound: "pop" },
    R: { emoji: "🤖", label: "R de robo", sound: "robot" },
    S: { emoji: "🐸", label: "S de sapo", sound: "ribbit" },
    T: { emoji: "🐯", label: "T de tigre", sound: "tiger" },
    U: { emoji: "🍇", label: "U de uva", sound: "pop" },
    V: { emoji: "🐄", label: "V de vaca", sound: "moo" },
    W: { emoji: "🧇", label: "W de waffle", sound: "ding" },
    X: { emoji: "☕", label: "X de xicara", sound: "tap" },
    Y: { emoji: "🪀", label: "Y de yoyo", sound: "boing" },
    Z: { emoji: "🦓", label: "Z de zebra", sound: "zebra" },
    0: { emoji: "⚽", label: "Zero de bola", sound: "bounce" },
    1: { emoji: "☀️", label: "Um sol brilhante", sound: "ding" },
    2: { emoji: "🦆", label: "Dois patinhos", sound: "quack" },
    3: { emoji: "🎈", label: "Tres baloes", sound: "balloon" },
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
    lastSoundSource: "downloaded-or-soft-imitation",
    lastInput: "aguardando interacao",
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
    masterGain.gain.value = 0.48;
    compressor.threshold.value = -18;
    compressor.knee.value = 24;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.18;
    masterGain.connect(compressor);
    compressor.connect(audioCtx.destination);
  }

  function rememberNode(node) {
    activeSoundNodes.add(node);
    node.addEventListener("ended", () => activeSoundNodes.delete(node), { once: true });
    return node;
  }

  function stopCurrentSound() {
    soundTicket += 1;
    if (activePublicStopTimer) {
      clearTimeout(activePublicStopTimer);
      activePublicStopTimer = null;
    }
    if (activePublicAudio) {
      try {
        activePublicAudio.pause();
        activePublicAudio.currentTime = 0;
      } catch {}
      activePublicAudio = null;
    }
    for (const node of activeSoundNodes) {
      try {
        node.stop(0);
      } catch {}
    }
    activeSoundNodes.clear();
  }

  function volumeFor(kind) {
    const volumes = {
      baby: 0.54,
      balloon: 0.5,
      bear: 0.42,
      buzz: 0.34,
      car: 0.42,
      ding: 0.44,
      donkey: 0.52,
      dragon: 0.48,
      magic: 0.44,
      meow: 0.58,
      monkey: 0.45,
      moo: 0.5,
      plop: 0.38,
      pop: 0.46,
      quack: 0.5,
      robot: 0.34,
      sheep: 0.48,
      sparkle: 0.42,
      splash: 0.34,
      tap: 0.34,
      vroom: 0.42,
      woof: 0.6,
      trumpet: 0.5,
      ribbit: 0.56,
      roar: 0.46,
      tiger: 0.46,
      wind: 0.38,
      zebra: 0.5,
      jacare: 0.34,
      boing: 0.46,
      bounce: 0.46,
      bubble: 0.42
    };
    return volumes[kind] || 0.52;
  }

  function publicAudioFor(kind) {
    const src = PUBLIC_SOUNDS[kind];
    if (!src) return null;
    if (!publicSoundCache.has(kind)) {
      const audio = new Audio(src);
      audio.preload = "auto";
      publicSoundCache.set(kind, audio);
    }
    const audio = publicSoundCache.get(kind);
    audio.volume = volumeFor(kind);
    return audio;
  }

  function playDownloadedSound(kind, ticket) {
    const audio = publicAudioFor(kind);
    if (!audio) return false;
    try {
      activePublicAudio = audio;
      audio.pause();
      const offsets = {
        balloon: 0.04,
        boing: 0.1,
        bounce: 0.1,
        bubble: 0.03,
        buzz: 0.7,
        car: 0.08,
        ding: 0.12,
        donkey: 0.02,
        jacare: 0.28,
        magic: 0.12,
        pop: 0.03,
        plop: 0.03,
        robot: 0.18,
        sparkle: 0.12,
        splash: 2.1,
        tap: 0.12,
        vroom: 0.08,
        wind: 0.12
      };
      audio.currentTime = offsets[kind] || 0;
      const playPromise = audio.play();
      const maxDurations = {
        boing: 0.95,
        bounce: 0.95,
        bubble: 0.42,
        car: 1.1,
        jacare: 1.55,
        plop: 0.32,
        pop: 0.38,
        robot: 1.25,
        sparkle: 1.15,
        splash: 1.45,
        tap: 0.45,
        vroom: 1.1
      };
      const maxDuration = maxDurations[kind];
      if (maxDuration) {
        activePublicStopTimer = setTimeout(() => {
          if (ticket !== soundTicket || activePublicAudio !== audio) return;
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch {}
          activePublicAudio = null;
          activePublicStopTimer = null;
          state.audioState = "ready";
          audioStatusEl.textContent = "Som pronto";
        }, Math.round(maxDuration * 1000));
      }
      state.audioReady = true;
      state.audioState = "playing-downloaded-file";
      state.lastSoundSource = "downloaded-file";
      audioStatusEl.textContent = `Som baixado: ${kind}`;
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          if (ticket === soundTicket) playGeneratedSound(kind, ticket);
        });
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
    const osc = rememberNode(audioCtx.createOscillator());
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
    const osc = rememberNode(audioCtx.createOscillator());
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
    const source = rememberNode(audioCtx.createBufferSource());
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
      dragon: 0.72,
      roar: 0.68,
      tiger: 0.68,
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
      balloon: 0.32,
      pop: 0.28,
      ding: 0.42,
      tap: 0.18,
      baby: 0.5,
      jump: 0.34,
      monkey: 0.64,
      jacare: 0.42,
      sheep: 0.5,
      moo: 0.56,
      zebra: 0.5,
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
        const base = kind === "dragon" ? 54 : kind === "tiger" ? 86 : 74;
        const sweep = base + Math.sin(t * 8) * 12 + (1 - t / duration) * 42;
        const bite = kind === "tiger" ? Math.sin(2 * Math.PI * 420 * t) * 0.1 : 0;
        value = env * (Math.sin(2 * Math.PI * sweep * t) * 0.58 + noise() * 0.32 + bite);
      } else if (kind === "donkey") {
        const first = burstEnvelope(t, 0.02, 0.42);
        const second = burstEnvelope(t, 0.48, 0.5);
        const p1 = 430 - 250 * Math.min(1, t / 0.42);
        const p2 = 165 + 390 * Math.max(0, (t - 0.48) / 0.5);
        value = first * (Math.sign(Math.sin(2 * Math.PI * p1 * t)) * 0.78 + noise() * 0.35);
        value += second * (Math.sign(Math.sin(2 * Math.PI * p2 * t)) * 0.9 + noise() * 0.42);
      } else if (kind === "trumpet") {
        const env = burstEnvelope(t, 0.02, 0.7);
        const pitch = 190 + Math.sin(t * 12) * 120 + (t / duration) * 360;
        value = env * (Math.sign(Math.sin(2 * Math.PI * pitch * t)) * 0.88 + Math.sin(2 * Math.PI * pitch * 2.01 * t) * 0.32);
      } else if (kind === "quack") {
        const env = burstEnvelope(t, 0.02, 0.2) + burstEnvelope(t, 0.22, 0.18);
        const pitch = 520 - t * 310;
        value = env * (Math.sign(Math.sin(2 * Math.PI * pitch * t)) * 0.78 + noise() * 0.18);
      } else if (kind === "jacare") {
        const snapA = burstEnvelope(t, 0.02, 0.08);
        const snapB = burstEnvelope(t, 0.16, 0.09);
        const growl = burstEnvelope(t, 0.25, 0.18);
        value = snapA * (noise() * 0.72 + Math.sin(2 * Math.PI * 180 * t) * 0.18);
        value += snapB * (noise() * 0.6 + Math.sin(2 * Math.PI * 145 * t) * 0.14);
        value += growl * (Math.sin(2 * Math.PI * 88 * t) * 0.2 + noise() * 0.12);
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
        const pitch = 360 + Math.sin(t * 125) * 135;
        value = env * (Math.sign(Math.sin(2 * Math.PI * pitch * t)) * 0.62 + noise() * 0.34);
      } else if (kind === "monkey") {
        const a = burstEnvelope(t, 0.02, 0.12);
        const b = burstEnvelope(t, 0.18, 0.12);
        const c = burstEnvelope(t, 0.34, 0.18);
        value = a * Math.sin(2 * Math.PI * (760 + Math.sin(t * 80) * 120) * t) * 0.7;
        value += b * Math.sin(2 * Math.PI * (980 - t * 300) * t) * 0.72;
        value += c * (Math.sin(2 * Math.PI * 640 * t) * 0.52 + noise() * 0.16);
      } else if (kind === "sheep") {
        const env = burstEnvelope(t, 0.03, 0.52);
        const pitch = 360 + Math.sin(t * 18) * 95 - t * 110;
        value = env * (Math.sin(2 * Math.PI * pitch * t) * 0.38 + Math.sin(2 * Math.PI * pitch * 1.5 * t) * 0.12);
      } else if (kind === "moo") {
        const env = burstEnvelope(t, 0.03, 0.62);
        const pitch = 145 - t * 45 + Math.sin(t * 10) * 18;
        value = env * (Math.sin(2 * Math.PI * pitch * t) * 0.42 + Math.sin(2 * Math.PI * pitch * 2 * t) * 0.1);
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
      } else if (kind === "balloon" || kind === "pop" || kind === "tap" || kind === "clip") {
        const env = burstEnvelope(t, 0.005, duration - 0.02);
        const snap = kind === "balloon" ? 0.8 : kind === "pop" ? 0.7 : 0.48;
        const thump = kind === "balloon" ? Math.sin(2 * Math.PI * 90 * t) * 0.16 : 0;
        value = env * (noise() * snap + Math.sin(2 * Math.PI * 980 * t) * 0.42 + thump);
      } else if (kind === "baby" || kind === "hug" || kind === "ding") {
        const env = burstEnvelope(t, 0.01, duration - 0.04);
        const pitch = kind === "baby" ? 760 + Math.sin(t * 22) * 160 : kind === "hug" ? 430 : 920;
        value = env * Math.sin(2 * Math.PI * pitch * t) * 0.62;
      } else if (kind === "zebra") {
        const env = burstEnvelope(t, 0.02, 0.42);
        const pitch = 410 + Math.sin(t * 32) * 210;
        value = env * (Math.sign(Math.sin(2 * Math.PI * pitch * t)) * 0.52 + noise() * 0.3);
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

    const source = rememberNode(audioCtx.createBufferSource());
    source.buffer = buffer;
    source.connect(masterGain || audioCtx.destination);
    source.start(nowTime() + 0.01);
    return true;
  }

  function playGeneratedSound(kind, ticket) {
    if (!audioCtx) {
      state.audioState = "unavailable";
      audioStatusEl.textContent = "Som indisponivel";
      return;
    }
    if (ticket !== soundTicket) return;
    const play = () => {
      if (ticket !== soundTicket) return;
      const t = nowTime() + 0.015;
      if (playBufferSound(kind)) {
        state.audioReady = true;
        state.audioState = audioCtx.state;
        state.lastSoundSource = "soft-imitation";
        audioStatusEl.textContent = `Imitacao suave: ${kind}`;
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
        splash: () => {
          addNoise(t, 0.16, 0.12, 780);
          addSlide(260, 620, t + 0.03, 0.16, "sine", 0.1);
          addSlide(420, 820, t + 0.16, 0.12, "sine", 0.08);
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
        jacare: () => {
          addNoise(t, 0.08, 0.16, 420);
          addNoise(t + 0.16, 0.09, 0.13, 360);
          addSlide(120, 70, t + 0.25, 0.16, "sawtooth", 0.1);
        },
        monkey: () => {
          addTone(760, t, 0.08, "triangle", 0.12);
          addTone(980, t + 0.1, 0.08, "triangle", 0.12);
          addTone(650, t + 0.22, 0.12, "triangle", 0.1);
        },
        sheep: () => addSlide(420, 260, t, 0.42, "triangle", 0.14),
        moo: () => addSlide(150, 95, t, 0.5, "sine", 0.16),
        zebra: () => {
          addSlide(520, 260, t, 0.12, "square", 0.1);
          addSlide(460, 640, t + 0.16, 0.18, "square", 0.09);
        },
        balloon: () => {
          addNoise(t, 0.08, 0.18, 900);
          addTone(90, t, 0.12, "sine", 0.1);
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
      state.lastSoundSource = "soft-imitation";
      audioStatusEl.textContent = `Imitacao suave: ${kind}`;
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
    stopCurrentSound();
    const ticket = soundTicket;
    if (playDownloadedSound(kind, ticket)) return;
    playGeneratedSound(kind, ticket);
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

  function registerChar(char, displayKey, inputSource = "teclado") {
    const fun = char.startsWith("STAR:") ? STAR_FUN : char.startsWith("ARROW:") ? FALLBACK_FUN : FUN_MAP[char] || STAR_FUN;
    state.lastKey = char;
    state.lastItem = fun.fallback || fun.star ? `${fun.label}: tecla ${displayKey}` : fun.label;
    state.lastSound = fun.sound;
    state.lastInput = inputSource;
    state.pressCount += 1;
    lastKeyEl.textContent = fun.fallback ? "!" : fun.star ? "★" : char;
    pressCountEl.textContent = String(state.pressCount);
    hintTextEl.textContent = fun.star
      ? "Espaco chamou a estrelinha inicial."
      : fun.fallback
      ? "A seta para baixo chamou o burrinho surpresa."
      : "Toque, arraste ou aperte outra tecla para chamar outro amiguinho.";
    funEmojiEl.textContent = fun.emoji;
    funLabelEl.textContent = fun.fallback || fun.star ? `${fun.label}: ${displayKey}` : fun.label;
    funCardEl.classList.toggle("silly", Boolean(fun.fallback));
    flashButton(char);
    replayAnimation();
    playCuteSound(fun.sound);
    reportKeyProgress();
  }

  function reportKeyProgress(force = false) {
    if (!analytics()) return;
    if (!sessionStarted) {
      analytics().trackGameStart("learn-keys");
      sessionStarted = true;
    }
    if (!force && state.pressCount !== 1 && state.pressCount - lastReportedPressCount < 5) {
      return;
    }
    lastReportedPressCount = state.pressCount;
    analytics().trackGameProgress("learn-keys", {
      key_presses: state.pressCount,
      state: "active"
    });
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
    if ((event.ctrlKey && event.key !== "Control") || (event.metaKey && event.key !== "Meta") || (event.altKey && event.key !== "Alt")) return;
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
    if (event.key === "ArrowDown") {
      registerChar(`ARROW:${labelForOtherKey(event.key)}`, labelForOtherKey(event.key));
      return;
    }
    triggerRandomUnmapped(labelForOtherKey(event.key));
  }

  function buildTouchKeyboard() {
    for (const char of ALLOWED) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "key-btn";
      btn.textContent = char;
      btn.setAttribute("aria-label", `Tecla ${char}`);
      btn.addEventListener("click", () => registerChar(char, char, "teclado touch"));
      touchKeysEl.appendChild(btn);
      buttons.set(char, btn);
    }
  }

  let randomPointer = null;
  let lastRandomAt = Number.NEGATIVE_INFINITY;
  const RANDOM_DRAG_THRESHOLD = 24;
  const RANDOM_THROTTLE_MS = 170;

  function shouldIgnoreRandomPointer(target) {
    return Boolean(target && target.closest && target.closest("button, a"));
  }

  function triggerRandomFriend(inputSource) {
    const now = performance.now();
    if (now - lastRandomAt < RANDOM_THROTTLE_MS) return false;
    lastRandomAt = now;
    const char = ALLOWED[Math.floor(Math.random() * ALLOWED.length)];
    registerChar(char, char, inputSource);
    return true;
  }

  function triggerRandomUnmapped(displayKey) {
    const char = ALLOWED[Math.floor(Math.random() * ALLOWED.length)];
    registerChar(char, char, `tecla aleatoria: ${displayKey}`);
  }

  document.addEventListener("pointerdown", (event) => {
    if (shouldIgnoreRandomPointer(event.target)) return;
    randomPointer = {
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      dragged: false
    };
  });

  document.addEventListener("pointermove", (event) => {
    if (!randomPointer) return;
    const dx = event.clientX - randomPointer.lastX;
    const dy = event.clientY - randomPointer.lastY;
    if (Math.hypot(dx, dy) < RANDOM_DRAG_THRESHOLD) return;
    randomPointer.lastX = event.clientX;
    randomPointer.lastY = event.clientY;
    randomPointer.dragged = triggerRandomFriend("arrasto aleatorio") || randomPointer.dragged;
  });

  document.addEventListener("pointerup", () => {
    if (!randomPointer) return;
    if (!randomPointer.dragged) triggerRandomFriend("toque aleatorio");
    randomPointer = null;
  });

  document.addEventListener("pointercancel", () => {
    randomPointer = null;
  });

  window.render_game_to_text = function renderGameToText() {
    return JSON.stringify({
      mode: "learn-keys",
      last_key: state.lastKey,
      last_item: state.lastItem,
      last_sound: state.lastSound,
      last_sound_source: state.lastSoundSource,
      last_input: state.lastInput,
      press_count: state.pressCount,
      audio_ready: state.audioReady,
      audio_state: state.audioState,
      active_voice_count: (activePublicAudio && !activePublicAudio.paused ? 1 : 0) + activeSoundNodes.size,
      sound_engine_version: SOUND_ENGINE_VERSION,
      animated_visual: true,
      note: "A-Z e 0-9 usam palavras em portugues do Brasil; F e foca. Espaco mostra estrela, seta para baixo chama o burrinho, e Ctrl/outras teclas nao mapeadas sorteiam amiguinhos com som imediato."
    });
  };

  window.advanceTime = function advanceTime() {
    return Promise.resolve();
  };

  buildTouchKeyboard();
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("beforeunload", () => {
    if (!analytics() || !sessionStarted) return;
    analytics().trackGameProgressBeacon("learn-keys", {
      key_presses: state.pressCount,
      state: "active"
    });
  });
})();
