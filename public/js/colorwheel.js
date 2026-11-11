/* Unsent · js/colorwheel.js · adds a real color wheel above every "Hex" box (Background + Color pickers).
   Wheel = hue around, strength out from the middle. Light stays what the Light slider says.
   It writes the hex box and fires "input", so the sliders, preview and Save keep working as before. */
(() => {
  const HEX = /^#[0-9a-f]{6}$/i, SIZE = 180;
  const toHsl = (h) => {
    const n = parseInt(h.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    let hh = 0, s = 0;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      hh = (hh * 60 + 360) % 360;
    }
    return [hh, s * 100, l * 100];
  };
  const toHex = (h, s, l) => {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
    return "#" + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, "0")).join("");
  };
  const draw = (cv) => {
    const dpr = Math.min(2, devicePixelRatio || 1), px = Math.round(SIZE * dpr);
    cv.width = cv.height = px;
    const ctx = cv.getContext("2d"), img = ctx.createImageData(px, px), c = px / 2;
    for (let y = 0; y < px; y++) for (let x = 0; x < px; x++) {
      const dx = x + 0.5 - c, dy = y + 0.5 - c, r = Math.hypot(dx, dy) / c, i = (y * px + x) * 4;
      if (r > 1) continue;
      const hex = toHex((Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360, r * 100, 50), n = parseInt(hex.slice(1), 16);
      img.data[i] = (n >> 16) & 255; img.data[i + 1] = (n >> 8) & 255; img.data[i + 2] = n & 255;
      img.data[i + 3] = r > 1 - 1 / c ? Math.round(255 * (1 - r) * c) : 255;
    }
    ctx.putImageData(img, 0, 0);
  };
  const enhance = (inp) => {
    if (inp.dataset.wheel) return;
    inp.dataset.wheel = 1;
    let host = inp.closest("label, div, p") || inp.parentElement;
    if (host.querySelector("input[type=range]")) host = inp;   /* box shares a wrapper with the sliders: put the wheel right after the box */
    const wrap = document.createElement("div"), box = document.createElement("div"), cv = document.createElement("canvas"), dot = document.createElement("i");
    wrap.className = "cw"; box.className = "cw-in"; dot.className = "cw-dot";
    cv.setAttribute("role", "img"); cv.setAttribute("aria-label", "Color wheel: drag to pick hue and strength");
    box.append(cv, dot); wrap.append(box); host.after(wrap);
    draw(cv);
    let last = "";
    const place = () => {
      const v = inp.value.trim();
      if (!HEX.test(v) || v === last) return;
      last = v;
      const [h, s] = toHsl(v), r = (s / 100) * (SIZE / 2), a = h * Math.PI / 180;
      dot.style.left = SIZE / 2 + Math.cos(a) * r + "px";
      dot.style.top = SIZE / 2 + Math.sin(a) * r + "px";
      dot.style.background = v;
    };
    const pick = (e) => {
      const b = cv.getBoundingClientRect(), dx = e.clientX - b.left - b.width / 2, dy = e.clientY - b.top - b.height / 2;
      const r = Math.min(1, Math.hypot(dx, dy) / (b.width / 2)), h = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
      const cur = HEX.test(inp.value.trim()) ? toHsl(inp.value.trim()) : [0, 0, 50];
      const l = Math.min(92, Math.max(8, cur[2]));   /* keep it from going pure black / white, so the wheel always shows a change */
      inp.value = toHex(h, r * 100, l);
      inp.dispatchEvent(new Event("input", { bubbles: true }));
      last = ""; place();
    };
    let down = false;
    cv.addEventListener("pointerdown", (e) => { down = true; cv.setPointerCapture(e.pointerId); pick(e); e.preventDefault(); });
    cv.addEventListener("pointermove", (e) => { if (down) pick(e); });
    const up = () => { if (down) { down = false; inp.dispatchEvent(new Event("change", { bubbles: true })); } };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    place();
    setInterval(place, 250);   /* sliders change the box without an event, so keep the dot in step */
  };
  const scan = () => document.querySelectorAll("input").forEach((i) => {
    if (["color", "range", "checkbox", "radio", "hidden", "file"].includes(i.type)) return;
    if (HEX.test((i.value || "").trim())) enhance(i);
  });
  const go = () => { scan(); setInterval(scan, 600); };
  document.readyState === "loading" ? addEventListener("DOMContentLoaded", go) : go();
})();
