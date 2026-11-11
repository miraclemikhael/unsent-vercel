/* Unsent · js/effects.js · back-to-top, greeting. Loaded in order by includes/footer.php (core.js first). */
/* global $, CSRF, post, Swal */
/* Unsent · calm extras: back-to-top button only.
   (The old tilt / ripple / drifting sheets / parallax layer is gone: it fought motion.css and the
   "calm motion" rule. Number count-up and scroll reveal live in motion.js.) */
(() => {
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.hasAttribute("data-calm");
  const up = document.createElement("button");
  up.type = "button";
  up.className = "fx-top";
  up.setAttribute("aria-label", "Back to top");
  up.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  up.onclick = () => scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" });
  document.body.append(up);
  let tick = false;
  addEventListener("scroll", () => {
    if (tick) return;
    tick = true;
    requestAnimationFrame(() => {
      up.classList.toggle("on", scrollY > 600);
      tick = false;
    });
  }, { passive: true });
})();

/* greeting follows the visitor's own clock */
(() => {
  const g = document.querySelector("[data-greet]");
  if (!g) return;
  const h = new Date().getHours();
  g.textContent = h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
})();
