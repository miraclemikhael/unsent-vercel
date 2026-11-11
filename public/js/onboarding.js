/* Unsent · js/onboarding.js · first-run welcome (2 slides) on phones. Loaded by includes/footer.php.
   The head script in includes/header.php adds class "onb" to <html> when it should show.
   Seen once -> localStorage "unsent-onb" is set and it never appears again (add ?onb=1 to the address to replay). */
(() => {
  const box = document.getElementById("onb");
  if (!box) return;
  const KEY = "unsent-onb";
  const root = document.documentElement;
  const next = box.querySelector(".onb-next");
  const skip = box.querySelector(".onb-skip");
  const last = box.querySelectorAll(".onb-page").length - 1;
  let i = 0;

  const go = (n) => {
    i = Math.max(0, Math.min(last, n));
    box.dataset.i = i;
    next.textContent = i === last ? "Get Started" : "Next";
    box.querySelectorAll(".onb-page").forEach((p, k) => p.setAttribute("aria-hidden", k === i ? "false" : "true"));
  };
  const finish = () => {
    try { localStorage.setItem(KEY, "1"); } catch (e) { /* private mode: it just shows again next visit */ }
    box.classList.add("out");
    setTimeout(() => { root.classList.remove("onb"); box.classList.remove("out"); }, 520);
  };

  next.onclick = () => (i === last ? finish() : go(i + 1));
  skip.onclick = finish;

  /* swipe left / right */
  let x0 = null, y0 = 0;
  box.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  box.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) dx < 0 ? (i === last ? finish() : go(i + 1)) : go(i - 1);
  }, { passive: true });
  document.addEventListener("keydown", (e) => {
    if (!root.classList.contains("onb")) return;
    if (e.key === "ArrowRight") go(i + 1);
    else if (e.key === "ArrowLeft") go(i - 1);
    else if (e.key === "Escape") finish();
  });

  window.showOnboarding = () => { go(0); root.classList.add("onb"); };
  go(0);
})();
