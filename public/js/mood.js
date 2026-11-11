/* Unsent · js/mood.js · mood faces. Loaded in order by includes/footer.php (core.js first). */
/* global $, CSRF, post, Swal */
/* mood faces: the unselected faces have a white sticker background baked into
   the image. Redraw each one on a canvas with the white removed, so only the
   black drawing is left and the card colour shows through. */
(() => {
  const form = document.getElementById("mform");
  if (!form) return;
  const cache = {};
  const strip = (url) =>
    cache[url] ||
    (cache[url] = new Promise((ok, no) => {
      const im = new Image();
      im.onerror = no;
      im.onload = () => {
        try {
          const w = 192,
            h = Math.round((w * (im.naturalHeight || 1)) / (im.naturalWidth || 1)),
            c = document.createElement("canvas");
          c.width = w;
          c.height = h;
          const x = c.getContext("2d");
          x.drawImage(im, 0, 0, w, h);
          const d = x.getImageData(0, 0, w, h),
            p = d.data;
          for (let i = 0; i < p.length; i += 4) {
            const lum = (p[i] * 0.2126 + p[i + 1] * 0.7152 + p[i + 2] * 0.0722) / 255;
            p[i + 3] = Math.round(p[i + 3] * (1 - lum));
            p[i] = p[i + 1] = p[i + 2] = 0;
          }
          x.putImageData(d, 0, 0);
          ok(c.toDataURL("image/png"));
        } catch (e) {
          no(e);
        }
      };
      im.src = url;
    }));
  const fix = (img) => {
    const u = img.getAttribute("src") || "",
      m = /\/mood\/(\w+)\.svg(?:\?.*)?$/.exec(u);
    if (!m || m[1] == "good") return; /* "-on" faces and the yellow face keep their own look */
    strip(u)
      .then((d) => {
        if (img.getAttribute("src") == u) img.src = d;
      })
      .catch(() => {});
  };
  form.querySelectorAll(".mo img").forEach(fix);
  new MutationObserver((ms) =>
    ms.forEach((m) => m.target.matches && m.target.matches(".mo img") && fix(m.target)),
  ).observe(form, { subtree: true, attributes: true, attributeFilter: ["src"] });
})();

;


/* the check-in card takes the colour of the mood you pick */
(() => {
  const card = document.getElementById("moodcard"), form = document.getElementById("mform");
  if (!card || !form) return;
  const K = { Heavy: "heavy", Low: "low", Okay: "okay", Good: "good", Bright: "bright" };
  form.addEventListener("click", (e) => {
    const b = e.target.closest(".mo");
    if (!b || !K[b.dataset.m]) return;
    card.className = card.className.replace(/\bt-\w+/g, "").trim() + " t-" + K[b.dataset.m];
  });
})();
