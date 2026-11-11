/* Unsent · js/pwa.js · install as an app. Service worker needs https (or localhost). */
(() => {
  if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  let ev = null;
  const btn = () => document.getElementById("pwaI");
  addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); ev = e; if (btn()) btn().hidden = false; });
  addEventListener("appinstalled", () => { ev = null; if (btn()) btn().hidden = true; });
  const b = btn();
  if (!b) return;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !matchMedia("(display-mode:standalone)").matches;
  if (ios) b.hidden = false;
  b.onclick = () => {
    if (ev) { ev.prompt(); ev.userChoice.finally(() => (ev = null)); }
    else if (window.Swal) Swal.fire({ title: "Add to Home Screen", text: "Tap the Share button, then “Add to Home Screen”.", confirmButtonText: "Got it" });
  };
})();

/* ---- push alerts (Me page card, plus quiet re-sync on every page) ---- */
(() => {
  const can = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  const standalone = matchMedia("(display-mode:standalone)").matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const api = (a, body) => fetch("index.php?api=push&a=" + a, { method: body ? "POST" : "GET", body, headers: { "X-CSRF": CSRF() }, credentials: "same-origin" }).then((r) => r.json());
  const u8 = (b) => Uint8Array.from(atob(b.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(b.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
  const save = (sub) => { const fd = new FormData(); fd.set("endpoint", sub.endpoint); return api("sub", fd); };
  const reg = () => navigator.serviceWorker.ready;
  const current = async () => (await reg()).pushManager.getSubscription();
  if (can && Notification.permission === "granted") current().then((s) => s && save(s)).catch(() => {});
  const b = document.getElementById("pushb"), t = document.getElementById("pusht");
  if (!b) return;
  const say = (m) => (t.textContent = m);
  const paint = async () => {
    if (!can || (ios && !standalone)) { b.hidden = true; say(ios && !standalone && can !== undefined ? "On iPhone: tap Share, then Add to Home Screen. Open Unsent from the new icon, then turn this on." : "This browser cannot show alerts."); return; }
    if (Notification.permission === "denied") { b.hidden = true; say("Alerts are blocked. Allow notifications for this app in your phone settings."); return; }
    const on = Notification.permission === "granted" && (await current());
    b.hidden = false; b.dataset.on = on ? "1" : "";
    b.textContent = on ? "Send a test alert" : "Turn on alerts";
    say(on ? "On. You will hear about messages and calls, even when the app is closed." : "Get a nudge for new messages and calls.");
  };
  const off = document.getElementById("pushoff");
  b.onclick = async () => {
    try {
      if (b.dataset.on) { await api("test"); return say("Test sent. It should arrive in a few seconds."); }
      if ((await Notification.requestPermission()) !== "granted") return paint();
      const key = (await api("key")).key;
      const sub = (await current()) || (await (await reg()).pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(key) }));
      await save(sub);
      await paint();
      if (off) off.hidden = false;
    } catch (e) { say("Could not turn on alerts. Calls and alerts need https."); }
  };
  if (off) off.onclick = async () => { const s = await current(); if (s) { const fd = new FormData(); fd.set("endpoint", s.endpoint); await api("unsub", fd); await s.unsubscribe(); } off.hidden = true; paint(); };
  paint().then(async () => { if (off && can && (await current())) off.hidden = false; });
})();


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

/* Unsent · Friends "Add" failsafe. If the page's own script is missing or broken, the form used to reload the page
   as ?who=name and land on Home. This catches the submit first, posts it itself, and never leaves the page. */
(() => {
  const tell = (m, ok) => (window.Swal ? Swal.fire({ toast: true, position: "top-end", icon: ok ? "success" : "error", title: m, showConfirmButton: false, timer: 2800, timerProgressBar: true }) : alert(m));
  const tok = () => { try { return typeof CSRF === "function" ? CSRF() : (document.querySelector("meta[name=csrf]") || {}).content || ""; } catch (e) { return ""; } };
  document.addEventListener("submit", async (e) => {
    const f = e.target;
    if (!f || !f.matches || !f.matches("form[data-add]")) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const inp = f.elements.who, who = ((inp && inp.value) || "").trim();
    if (!who) { tell("Type a username or email first.", false); return; }
    const btn = f.querySelector("button"); if (btn) btn.disabled = true;
    const fd = new FormData(); fd.append("who", who);
    let r = {}, raw = "", st = 0;
    try {
      const res = await fetch("index.php?api=chat&a=add", { method: "POST", body: fd, headers: { "X-CSRF": tok() }, credentials: "same-origin" });
      st = res.status; raw = await res.text();
      try { r = JSON.parse(raw); } catch (x) { r = {}; }
    } catch (x) { raw = "No connection: " + x; }
    if (btn) btn.disabled = false;
    if (!r.msg && !r.err) {
      /* show what the server really said, so the cause can be found */
      const txt = String(raw).replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500) || "(empty reply)";
      if (window.Swal) Swal.fire({ icon: "error", title: "Add failed" + (st ? " (" + st + ")" : ""), text: txt, confirmButtonText: "OK" }); else alert("Add failed " + st + ": " + txt);
      return;
    }
    tell(r.msg || r.err, !!r.ok);
    if (r.ok) { f.reset(); setTimeout(() => location.reload(), 1400); }
  }, true);
})();
