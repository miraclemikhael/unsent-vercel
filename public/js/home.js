/* Unsent · js/home.js · daily check-in. Loaded in order by includes/footer.php (core.js first). */
/* global $, CSRF, post, Swal */
/* daily check-in: pick a face, then log it; week tracker detail */
(() => {
  const f = document.getElementById("mform");
  if (f) {
    const val = document.getElementById("mval"),
      btn = document.getElementById("mlog"),
      faces = $("#mform .mo");
    faces.forEach(
      (b) =>
        (b.onclick = () => {
          val.value = b.dataset.m;
          faces.forEach((x) => {
            const on = x === b;
            x.classList.toggle("on", on);
            x.setAttribute("aria-pressed", on);
            x.querySelector("img").src =
              "img/mood/" + x.dataset.k + (on ? "-on" : "") + ".svg";
          });
          btn.disabled = false;
          const h = document.getElementById("mhint"),
            g = document.getElementById("gtxt");
          if (h) h.textContent = b.dataset.hint;
          if (g) {
            g.placeholder = b.dataset.ph;
            g.setAttribute("aria-label", b.dataset.ph);
          }
        }),
    );
    f.addEventListener("submit", (e) => {
      if (!val.value) e.preventDefault();
    });
  }
  const det = document.getElementById("wdet");
  if (det)
    $(".week .wd").forEach(
      (b) =>
        (b.onclick = () => {
          $(".week .wd").forEach((x) =>
            x.setAttribute("aria-pressed", x === b),
          );
          det.textContent = b.dataset.t;
        }),
    );
})();

