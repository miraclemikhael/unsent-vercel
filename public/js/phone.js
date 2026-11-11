/* Unsent · js/phone.js · keeps the phone's browser bar (theme-color) in step with the top bar. */
(() => {
  let meta = document.querySelector("meta[name=theme-color]");
  if (!meta) { meta = document.createElement("meta"); meta.name = "theme-color"; document.head.appendChild(meta); }
  let t;
  const sync = () => {
    clearTimeout(t);
    /* wait for the 350ms colour transition, then read the real colour of the top bar */
    t = setTimeout(() => {
      const a = document.querySelector("aside");
      if (!a) return;
      const c = getComputedStyle(a).backgroundColor;
      if (c && c !== "rgba(0, 0, 0, 0)") meta.setAttribute("content", c);
    }, 380);
  };
  window.syncBar = sync;
  sync();
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ["data-eff", "data-theme"] });
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", sync);
})();
