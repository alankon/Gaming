(function () {
  const statusMeta = document.querySelector("meta[name='theme-color']");

  function setViewportHeightVar() {
    document.documentElement.style.setProperty("--app-height", `${window.innerHeight}px`);
  }

  function updateThemeColor() {
    if (!statusMeta) return;
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    statusMeta.setAttribute("content", standalone ? "#0f766e" : statusMeta.getAttribute("content") || "#0f766e");
  }

  function serviceWorkerUrl() {
    const path = window.location.pathname;
    const repoBase = path.includes("/Gaming/") ? "/Gaming/" : "/";
    return new URL(`${repoBase}service-worker.js`, window.location.origin).toString();
  }

  function apiEnabled() {
    return window.location.protocol !== "file:" && !window.location.hostname.endsWith("github.io");
  }

  function postJson(path, payload, useBeacon) {
    if (!apiEnabled()) return Promise.resolve(false);
    const url = new URL(path, window.location.origin).toString();
    if (useBeacon && navigator.sendBeacon) {
      try {
        const sent = navigator.sendBeacon(url, new Blob([JSON.stringify(payload)], { type: "application/json" }));
        return Promise.resolve(sent);
      } catch {}
    }
    return fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((response) => response.ok)
      .catch(() => false);
  }

  window.alankonGaming = {
    playerId() {
      return document.body.dataset.playerId || "";
    },
    trackGameStart(gameSlug) {
      return postJson("/api/track/start", { game_slug: gameSlug }, false);
    },
    trackGameProgress(gameSlug, payload) {
      return postJson("/api/track/progress", { game_slug: gameSlug, ...(payload || {}) }, false);
    },
    trackGameProgressBeacon(gameSlug, payload) {
      return postJson("/api/track/progress", { game_slug: gameSlug, ...(payload || {}) }, true);
    },
    setFavoriteGame(gameSlug) {
      return postJson("/api/player/favorite", { game_slug: gameSlug }, false);
    },
  };

  window.addEventListener("resize", setViewportHeightVar, { passive: true });
  window.addEventListener("orientationchange", setViewportHeightVar, { passive: true });
  setViewportHeightVar();
  updateThemeColor();

  if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register(serviceWorkerUrl()).catch(() => {});
    });
  }
})();
