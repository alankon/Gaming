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
