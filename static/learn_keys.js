(function () {
  const lastKeyEl = document.getElementById("last-key");
  const hintTextEl = document.getElementById("hint-text");
  const pressCountEl = document.getElementById("press-count");
  const toggleSpeechBtn = document.getElementById("toggle-speech");
  const touchKeysEl = document.getElementById("touch-keys");
  const ALLOWED = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
  const buttons = new Map();

  const state = {
    pressCount: 0,
    lastKey: "-",
    speechEnabled: true,
    audioReady: false
  };

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  function freqFor(char) {
    const code = char.charCodeAt(0);
    return 220 + (code % 24) * 18;
  }

  function playTone(char) {
    try {
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freqFor(char), now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
      state.audioReady = true;
    } catch {}
  }

  function speakChar(char) {
    if (!state.speechEnabled || !("speechSynthesis" in window)) return;
    const utter = new SpeechSynthesisUtterance(char);
    utter.lang = "pt-BR";
    utter.rate = 0.92;
    utter.pitch = 1.04;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  function flashButton(char) {
    const btn = buttons.get(char);
    if (!btn) return;
    btn.classList.add("active");
    window.setTimeout(() => btn.classList.remove("active"), 120);
  }

  function registerChar(char) {
    state.lastKey = char;
    state.pressCount += 1;
    lastKeyEl.textContent = char;
    pressCountEl.textContent = String(state.pressCount);
    hintTextEl.textContent = `Voce tocou: ${char}`;
    flashButton(char);
    playTone(char);
    speakChar(char);
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

  toggleSpeechBtn.addEventListener("click", () => {
    state.speechEnabled = !state.speechEnabled;
    toggleSpeechBtn.textContent = state.speechEnabled ? "Voz: ligada" : "Voz: desligada";
  });

  window.render_game_to_text = function renderGameToText() {
    return JSON.stringify({
      mode: "learn-keys",
      last_key: state.lastKey,
      press_count: state.pressCount,
      speech_enabled: state.speechEnabled,
      audio_ready: state.audioReady,
      note: "Aceita A-Z e 0-9 por teclado fisico ou botoes touch"
    });
  };

  window.advanceTime = function advanceTime() {
    return Promise.resolve();
  };

  buildTouchKeyboard();
  window.addEventListener("keydown", onKeyDown);
})();
