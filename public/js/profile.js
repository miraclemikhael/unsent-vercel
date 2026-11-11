/* Unsent · js/profile.js · profile tabs + theme radios. Loaded in order by includes/footer.php (core.js first). */
/* global $, CSRF, post, Swal */
if (window.ptabs) {
  const T = $("#ptabs a"),
    P = $("#ppanels [data-p]");
  const go = (k) => {
    if (!P.some((p) => p.dataset.p == k)) k = "profile";
    T.forEach((a) => a.classList.toggle("on", a.dataset.t == k));
    P.forEach((p) => (p.hidden = p.dataset.p != k));
    tabin.value = k;
  };
  T.forEach(
    (a) =>
      (a.onclick = (e) => {
        e.preventDefault();
        history.replaceState(null, "", "#" + a.dataset.t);
        go(a.dataset.t);
      }),
  );
  go(location.hash.slice(1));
  addEventListener("hashchange", () => go(location.hash.slice(1)));
}

(() => {
  const h = document.documentElement,
    mq = matchMedia("(prefers-color-scheme:dark)");
  const eff = () => {
    let t = h.dataset.theme || "light";
    if (t == "auto") t = mq.matches ? "dark" : "light";
    h.dataset.eff = t;
  };
  const set = (t) => {
    h.dataset.theme = t;
    eff();
    $("input[name=a_theme]").forEach((r) => (r.checked = r.value == t));
  };
  mq.addEventListener && mq.addEventListener("change", eff);
  $("input[name=a_theme]").forEach(
    (r) =>
      (r.onchange = () => (window.swapTheme || ((f) => f()))(() => set(r.value))),
  );
})();

