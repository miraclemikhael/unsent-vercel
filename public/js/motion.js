/* motion.js — calm motion layer for Unsent (ES module, additive: nothing else depends on it).
   number count-up, icon draw, scroll reveal, postcard caption tint.
   No 3D, no WebGL. Respects body.calm and prefers-reduced-motion. */

const doc = typeof document !== 'undefined' ? document : null;
const calm = () => !!doc && (doc.body.classList.contains('calm') || matchMedia('(prefers-reduced-motion: reduce)').matches);

/* ===================== 4. MOTION HELPERS ===================== */
function countUp() {
  if (calm()) return;
  doc.querySelectorAll('.stats big, .sc big, .streak').forEach((el) => {
    const m = el.textContent.match(/^(\s*)([\d,]+)(.*)$/s);
    if (!m) return;
    const end = parseInt(m[2].replace(/,/g, ''), 10);
    if (!end || end > 1e7) return;
    const t0 = performance.now() + 250, dur = 700;
    const step = (now) => {
      const p = Math.min(1, Math.max(0, (now - t0) / dur)), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
      el.textContent = m[1] + v.toLocaleString('en-US') + m[3];
      if (p < 1) requestAnimationFrame(step);
    };
    el.textContent = m[1] + '0' + m[3];
    requestAnimationFrame(step);
  });
}

/* ===================== 6. MOTION HELPERS: icon draw + scroll reveal ===================== */
function drawIcons() {
  if (calm()) return;
  doc.querySelectorAll('.ic svg, .ico svg, .sc > .between svg').forEach((svg) => {
    svg.querySelectorAll('path,circle,rect,line,polyline').forEach((el, i) => {
      el.setAttribute('pathLength', '1'); el.classList.add('fx-d'); el.style.setProperty('--di', i);
    });
  });
}
function scrollReveal() {
  if (calm() || !('IntersectionObserver' in window)) return;
  const kinds = [['.hside > *', 'right'], ['.card.chart', 'wipe'], ['.sg > .sc', 'grow'], ['.at tbody tr', 'fade'], ['.row', 'left'], ['.card, .green, .afoot', 'rise']];
  const seen = new Set(), todo = [];
  kinds.forEach(([sel, kind]) => doc.querySelectorAll(sel).forEach((el) => {
    if (seen.has(el)) return; seen.add(el);
    const r = el.getBoundingClientRect();
    if (r.height && r.top > innerHeight * 0.96) { el.setAttribute('data-rv', kind); todo.push(el); }
  }));
  if (!todo.length) return;
  const io = new IntersectionObserver((ents) => {
    ents.filter((e) => e.isIntersecting).forEach((e, i) => {
      const el = e.target; io.unobserve(el);
      el.style.transitionDelay = i * 60 + 'ms'; el.classList.add('rv-in');
      setTimeout(() => { el.removeAttribute('data-rv'); el.classList.remove('rv-in'); el.style.transitionDelay = ''; }, 1200 + i * 60);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  todo.forEach((el) => io.observe(el));
}

/* ===================== POSTCARD CAPTION: colour follows the picture =====================
   Samples the strip of the front image where the caption sits, then sets --cap-bg / --cap-ink /
   --cap-edge on the card. Light picture -> pale tinted label + deep ink. Dark picture -> deep
   tinted label + pale ink. Works for the built-in cards and for the person's own upload. */
function capTint(img) {
  try {
    const card = img.closest('.pc'); if (!card || !img.naturalWidth) return;
    const W = img.naturalWidth, H = img.naturalHeight;
    const c = doc.createElement('canvas'); c.width = 32; c.height = 8;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, W * 0.04, H * 0.78, W * 0.84, H * 0.16, 0, 0, 32, 8);
    const d = g.getImageData(0, 0, 32, 8).data;
    /* average lightness decides light or dark label; the strongest colours decide the hue */
    let lum = 0, vx = 0, vy = 0, sw = 0, ss = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i] / 255, gr = d[i + 1] / 255, b = d[i + 2] / 255;
      const mx = Math.max(r, gr, b), mn = Math.min(r, gr, b), dl = mx - mn, l = (mx + mn) / 2;
      lum += l; n++;
      if (!dl) continue;
      const s = dl / (1 - Math.abs(2 * l - 1) || 1);
      let h = mx === r ? ((gr - b) / dl) % 6 : mx === gr ? (b - r) / dl + 2 : (r - gr) / dl + 4;
      h *= Math.PI / 3;
      const w = s * s;                       /* vivid pixels count much more than grey ones */
      vx += Math.cos(h) * w; vy += Math.sin(h) * w; sw += w; ss += s * w;
    }
    lum /= n;
    let hue = sw ? Math.atan2(vy, vx) * 180 / Math.PI : 0; if (hue < 0) hue += 360;
    let sat = sw ? Math.min(1, ss / sw) : 0;
    if (hue < 55 || hue > 335) hue = (hue + 360 - 10) % 360;      /* warm picture: lean a little toward red */
    const green = hue > 75 && hue < 170;
    sat = Math.max(green ? 0.4 : 0.38, Math.min(0.7, sat * 1.25));  /* never fall back to grey */
    const S = (k) => Math.round(sat * k);
    let bg, ink, edge;
    if (lum > 0.5) {
      bg = `hsla(${hue}, ${S(75)}%, 93%, .94)`; ink = `hsl(${hue}, ${S(85)}%, 16%)`; edge = `hsla(${hue}, ${S(70)}%, 28%, .22)`;
    } else {
      bg = `hsla(${hue}, ${S(green ? 85 : 75)}%, ${green ? 11 : 15}%, .92)`;
      ink = `hsl(${hue}, ${S(45)}%, 93%)`; edge = `hsla(${hue}, ${S(60)}%, 62%, .28)`;
    }
    card.style.setProperty('--cap-bg', bg); card.style.setProperty('--cap-ink', ink); card.style.setProperty('--cap-edge', edge);
  } catch (e) { /* tainted canvas or no pixels: keep the default white label */ }
}
if (doc) {
  doc.addEventListener('load', (e) => { const t = e.target; if (t && t.tagName === 'IMG' && t.closest && t.closest('.pc-front')) capTint(t); }, true);
  const scan = () => doc.querySelectorAll('.pc-front img').forEach((i) => i.complete && capTint(i));
  doc.readyState === 'loading' ? doc.addEventListener('DOMContentLoaded', scan) : scan();
}

/* ===================== BOOT ===================== */
function start() {
  countUp(); drawIcons(); scrollReveal();
}
if (doc) (doc.readyState === 'loading' ? doc.addEventListener('DOMContentLoaded', start) : start());
