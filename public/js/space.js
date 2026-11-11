/* Unsent · js/space.js · Mood journal day editor + "Me" page (look, public/private). */
/* global $, post */
/* Send a letter by Gmail only. Ask who gets it, then open Gmail with To, Subject and the whole letter already filled in. */
window.letterOut = (title, body) => {
  const text = String(body || "").trim();
  if (!text) return Swal.fire({ toast: true, position: "top", timer: 2000, showConfirmButton: false, icon: "info", title: "Write something first" });
  const subj = String(title || "").trim() || "A letter for you";
  const enc = encodeURIComponent;
  let last = "";
  try { last = localStorage.getItem("unsent-mailto") || ""; } catch (e) {}
  const open = (to) => {
    let b = text + "\n\n— Written on Unsent", cut = false;
    while (enc(b).length > 6500 && b.length > 200) { b = b.slice(0, Math.floor(b.length * 0.9)); cut = true; }
    if (cut) {
      b = b.replace(/\s+\S*$/, "") + "…\n\n(Long letter. The full text is copied: paste it here.)";
      try { navigator.clipboard.writeText(text); } catch (e) {}
    }
    const web = "https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=" + enc(to) + "&su=" + enc(subj) + "&body=" + enc(b), ua = navigator.userAgent;
    if (/Android/i.test(ua)) location.href = "intent:" + to + "?subject=" + enc(subj) + "&body=" + enc(b) + "#Intent;scheme=mailto;package=com.google.android.gm;S.browser_fallback_url=" + enc(web) + ";end";
    else if (/iPhone|iPad|iPod/i.test(ua)) {
      location.href = "googlegmail:///co?to=" + enc(to) + "&subject=" + enc(subj) + "&body=" + enc(b);
      setTimeout(() => { if (!document.hidden) location.href = web; }, 1300);
    } else if (!window.open(web, "_blank", "noopener")) location.href = web;
  };
  Swal.fire({
    title: "Send with Gmail",
    html: '<div class="lo-w"><p>Gmail opens with your letter already written. Just press send.</p><label class="lo-f"><span>Send to</span><input id="lo-to" class="swal2-input" type="email" inputmode="email" autocomplete="email" autocapitalize="off" placeholder="name@gmail.com" value="' + last.replace(/"/g, "") + '"></label></div>',
    showCancelButton: true,
    confirmButtonText: "Open Gmail",
    focusConfirm: false,
    didOpen: () => { const i = document.getElementById("lo-to"); if (!i.value) i.focus(); },
    preConfirm: () => {
      const to = document.getElementById("lo-to").value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) { Swal.showValidationMessage("Enter a valid email address."); return false; }
      return to;
    },
  }).then((r) => {
    if (!r.isConfirmed) return;
    try { localStorage.setItem("unsent-mailto", r.value); } catch (e) {}
    open(r.value);
  });
};
(() => {
  /* 3D that only exists on phones */
  if (matchMedia("(max-width:900px)").matches && window.mount3d) $(".write3d").forEach((h) => window.mount3d(h));
  /* ---- Friends: share my username ---- */
  const fc = document.getElementById("fcopy");
  if (fc) fc.onclick = async () => {
    const t = "Find me on Unsent: " + fc.dataset.u;
    try { if (navigator.share) await navigator.share({ text: t }); else { await navigator.clipboard.writeText(t); fc.textContent = "Copied"; } } catch (e) {}
  };
  /* ---- Mood journal: tap a day, pick a face, save ---- */
  const f = document.getElementById("mjf");
  if (f) {
    const day = mjday, val = mjm, sv = mjs, ttl = mjt, note = mjg;
    const faces = $("#mjf .mo");
    const pick = (m) => {
      val.value = m;
      faces.forEach((b) => b.setAttribute("aria-pressed", b.dataset.m == m));
      faces.forEach((b) => b.classList.toggle("on", b.dataset.m == m));
      sv.disabled = !m;
    };
    faces.forEach((b) => (b.onclick = () => pick(b.dataset.m)));
    $(".mj-d").forEach((c) => (c.onclick = () => {
      $(".mj-d").forEach((x) => x.classList.toggle("sel", x === c));
      f.hidden = false;
      day.value = c.dataset.day;
      note.value = c.dataset.g || "";
      pick(c.dataset.m || "");
      ttl.textContent = new Date(c.dataset.day + "T12:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
      f.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }));
  }

  /* ---- Mood calendar: leans toward your finger (or your phone tilt) ---- */
  const stg = document.querySelector(".mj-stage");
  if (stg && !document.documentElement.hasAttribute("data-calm") && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const lean = (x, y) => { stg.style.setProperty("--ry", (x * 8).toFixed(2) + "deg"); stg.style.setProperty("--rx", (16 - y * 6).toFixed(2) + "deg"); };
    const holder = stg.closest(".card") || stg;
    holder.addEventListener("pointermove", (e) => { const r = stg.getBoundingClientRect(); lean(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1); });
    holder.addEventListener("pointerleave", () => lean(0, 0));
    addEventListener("deviceorientation", (e) => { if (e.gamma != null) lean(Math.max(-1, Math.min(1, e.gamma / 30)), Math.max(-1, Math.min(1, ((e.beta || 45) - 45) / 30))); }, { passive: true });
  }
  /* ---- "Me" page ---- */
  /* Customize button: opens / closes the vibe, color, account and alerts panels */
  const cz = document.getElementById("spcz"), cp = document.getElementById("spcust");
  if (cz && cp) {
    const set = (open, focus) => {
      cp.hidden = !open;
      cz.setAttribute("aria-expanded", String(open));
      cz.classList.toggle("on", open);
      if (open && focus) cp.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    };
    cz.onclick = () => set(cp.hidden, true);
    if (location.hash == "#customize") set(true, true);
  }
  const w = document.getElementById("spw");
  if (!w || !document.getElementById("splook")) return;
  const root = document.documentElement.style;
  const st = { accent: (($(".sp-c.on")[0] || {}).dataset || {}).c || sphex.value, vibe: w.dataset.vibe };
  /* colour helpers: hex <-> hsl, and a mix() for the dark-theme version of a vibe (same maths as space_dark_vibe in functions.php) */
  const HEX = /^#[0-9a-f]{6}$/i;
  const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, t) => "#" + rgb(a).map((v, i) => Math.round(v * (1 - t) + rgb(b)[i] * t).toString(16).padStart(2, "0")).join("");
  const toHsl = (h) => {
    const [r, g, b] = rgb(h).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    let hh = 0, s = 0;
    if (d) { s = d / (1 - Math.abs(2 * l - 1)); hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh = (hh * 60 + 360) % 360; }
    return [hh, s * 100, l * 100];
  };
  const toHex = (h, s, l) => {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    return "#" + [0, 8, 4].map((n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))))).toString(16).padStart(2, "0")).join("");
  };
  const dark = (c) => { const n = parseInt(c.slice(1), 16); return (((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) < 110; };
  const accent = (c) => {
    st.accent = c;
    root.setProperty("--sa", c);
    root.setProperty("--son", dark(c) ? "#ffffff" : "#2a2a2a");
    if (window.syncBar) window.syncBar();
    let hit = false;
    $(".sp-c[data-c]").forEach((b) => { const on = b.dataset.c.toLowerCase() == c.toLowerCase(); hit = hit || on; b.classList.toggle("on", on); });
    spwb.classList.toggle("on", !hit);
    if (document.activeElement !== sphex) sphex.value = c;
    if (document.activeElement !== splite) splite.value = Math.round(Math.min(92, Math.max(8, toHsl(c)[2])));
  };
  $(".sp-c[data-c]").forEach((b) => (b.onclick = () => accent(b.dataset.c)));
  /* color wheel: the round button opens it. Wheel = hue + strength (js/colorwheel.js draws it under the Hex box), slider = light */
  spwb.onclick = () => { const open = spwheel.hidden; spwheel.hidden = !open; spwb.setAttribute("aria-expanded", String(open)); };
  sphex.addEventListener("input", () => {
    let v = sphex.value.trim();
    if (v && v[0] != "#") v = "#" + v;
    if (HEX.test(v)) accent(v.toLowerCase());
  });
  splite.addEventListener("input", () => {
    const [h, s] = toHsl(HEX.test(sphex.value.trim()) ? sphex.value.trim() : st.accent);
    const hex = toHex(h, s, +splite.value);
    sphex.value = hex;
    accent(hex);
  });
  accent(st.accent);
  $(".sp-v").forEach((b) => (b.onclick = () => {
    st.vibe = b.dataset.vibe;
    w.dataset.vibe = st.vibe;
    /* "-l" colours show in the light theme, "-d" in the dark theme (css/space.css picks). Dark vibes stay as they are. */
    const bg = b.dataset.bg, ink = b.dataset.ink, card = b.dataset.card, isDark = dark(bg);
    root.setProperty("--sbg-l", bg);
    root.setProperty("--sink-l", ink);
    root.setProperty("--scard-l", card);
    root.setProperty("--sbg-d", isDark ? bg : mix("#131211", bg, 0.09));
    root.setProperty("--sink-d", isDark ? ink : "#f4efe9");
    root.setProperty("--scard-d", isDark ? card : mix("#1f1d1b", card, 0.07));
    root.setProperty("--slogo-l", isDark ? "invert(1)" : "none");
    if (window.syncBar) window.syncBar();
    $(".sp-v").forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", x === b); });
  }));
  const say = (m, t) => window.Swal ? Swal.fire({ toast: true, position: "top", timer: 1800, showConfirmButton: false, icon: t || "success", title: m }) : alert(m);
  const send = (o) => { const fd = new FormData(); fd.set("a", "space"); fd.set("ajax", 1); Object.keys(o).forEach((k) => fd.set(k, o[k])); return post(fd).then((r) => r.json()).catch(() => ({ ok: 0 })); };
  /* banner: one wide picture behind the avatar, like YouTube / Twitter */
  const bn = document.getElementById("spbn"), bnb = document.getElementById("bnb");
  if (bn && bnb) {
    const bnx = document.getElementById("bnx"), bna = document.getElementById("bna"), bnt = document.getElementById("bnt");
    const cur = () => (bn.style.backgroundImage.match(/url\(["']?(.*?)["']?\)/) || [])[1] || "";
    const show = (src) => { bn.style.backgroundImage = src ? "url(" + src + ")" : ""; bn.classList.toggle("has", !!src); bnx.hidden = !src; bna.hidden = !src; bnt.textContent = src ? "Change banner" : "Add banner"; };
    /* choose a picture, then move + resize it inside a 3:1 frame. "Adjust" reopens the saved picture. */
    const edit = async (reuse) => {
      const r = await window.pictureFlow({ kind: "banner", current: reuse ? cur() : "", orig: reuse ? bn.dataset.orig : "", ratio: 3, out: 1200, title: "Banner" });
      if (!r) return;
      bn.dataset.orig = r.orig || r.src;
      show(r.src + "?" + Date.now());
      say("Banner saved");
    };
    bnb.onclick = () => edit(false);
    bna.onclick = () => edit(true);
    bnx.onclick = async () => {
      const fd = new FormData();
      fd.set("a", "bnrm");
      try { const r = await (await post(fd)).json(); if (r.ok) { bn.dataset.orig = ""; show(""); say("Banner removed"); } else say("Could not remove", "error"); } catch (e) { say("Could not remove", "error"); }
    };
  }
  /* profile photo, right on the Me page: tap the little camera */
  const ave = document.getElementById("ave");
  if (ave) ave.onclick = async () => {
    const r = await window.pictureFlow({ kind: "avatar", current: ave.dataset.src, orig: ave.dataset.orig, ratio: 1, round: true, out: 512, title: "Profile photo" });
    if (!r) return;
    ave.dataset.src = r.src; ave.dataset.orig = r.orig || r.src;
    $(".av").forEach((a) => { a.style.backgroundImage = "url('" + r.src + "?" + Date.now() + "')"; a.classList.add("has"); a.textContent = ""; });
    say("Photo updated");
  };
  spsave.onclick = () => send({ f: "look", accent: st.accent, vibe: st.vibe, bio: spbio.value }).then((r) => say(r.ok ? "Look saved" : "Could not save", r.ok ? "success" : "error"));
  spacct.onchange = () => send({ f: "acct", v: spacct.checked ? 1 : 0 }).then((r) => {
    if (!r.ok) { spacct.checked = !spacct.checked; return say("Could not save", "error"); }
    const on = spacct.checked;
    spat.textContent = on ? "Public account" : "Private account";
    spas.textContent = on ? "Others can see this page and the letters you made public." : "Only you can see this page.";
    sppill.classList.toggle("pub", on);
    sppill.lastElementChild.textContent = on ? "Public" : "Private";
  });
  const count = () => {};
  $(".sp-l .sw input").forEach((c) => (c.onchange = () => {
    const row = c.closest(".sp-l");
    send({ f: "pub", id: row.dataset.id, v: c.checked ? 1 : 0 }).then((r) => {
      if (!r.ok) { c.checked = !c.checked; return say("Could not save", "error"); }
      row.classList.toggle("pub", c.checked);
      row.querySelector(".sp-st").textContent = c.checked ? "Public" : "Private";
      count();
    });
  }));
})();

/* Sticky notes lean a little toward your finger (CSS 3D, no library). Off for calm mode / reduced motion. */
(() => {
  if (document.documentElement.hasAttribute("data-calm") || matchMedia("(prefers-reduced-motion: reduce)").matches || !matchMedia("(hover:hover)").matches) return;
  document.querySelectorAll(".sp-l, .sp-stats > div").forEach((n) => {
    n.addEventListener("pointermove", (e) => {
      const r = n.getBoundingClientRect();
      n.style.setProperty("--tx", (((e.clientY - r.top) / r.height) * 2 - 1) * -7 + "deg");
      n.style.setProperty("--ty", (((e.clientX - r.left) / r.width) * 2 - 1) * 9 + "deg");
    });
    n.addEventListener("pointerleave", () => { n.style.removeProperty("--tx"); n.style.removeProperty("--ty"); });
  });
})();

/* Postcards: real 3D, swipe to turn, tap twice to read; the words on the back shrink to fit the card (works on anyone's space too). */
(() => {
  const cards = document.querySelectorAll(".spk");
  if (!cards.length) return;
  const FACT = { caveat: 1.3, dancing: 1.2, kalam: 1.1 };
  const fit = (c) => {
    const box = c.querySelector(".spk-msg"), txt = c.querySelector(".spk-text");
    if (!box || !txt) return;
    const over = () => box.scrollHeight > box.clientHeight + 1;
    let lo = 1, hi = 4.6 * (FACT[c.dataset.pf] || 1.3);
    txt.style.fontSize = hi + "cqw";
    if (over()) {
      while (hi - lo > 0.05) { const m = (lo + hi) / 2; txt.style.fontSize = m + "cqw"; if (over()) hi = m; else lo = m; }
      txt.style.fontSize = lo + "cqw";
    }
    const cut = over();
    c.classList.toggle("cut", cut);
    const more = c.parentElement.querySelector(".spk-more");
    if (more) more.hidden = !cut;
  };
  /* The card is a real 3D object now: two faces, a little thickness, a shadow and a light that move with it.
     --ang is the turn (0 = picture, 180 = words). Swipe and it follows your finger, let go and it settles on the nearest face
     (a long enough swipe always goes over, in the direction you swiped). Two quick taps open the whole letter. One tap does nothing. */
  const openIt = (c) => { const b = c.parentElement.querySelector(".spk-more"); if (b) b.click(); };
  const calm = document.documentElement.hasAttribute("data-calm") || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const RAD = Math.PI / 180;
  const apply = (c, a) => { /* turn + light + shadow follow the angle */
    c._a = a;
    const r = a * RAD;
    c.style.setProperty("--ang", a.toFixed(2) + "deg");
    c.style.setProperty("--gl", (50 + Math.sin(r) * 80).toFixed(1) + "%");
    c.style.setProperty("--sc", Math.max(0.3, Math.abs(Math.cos(r))).toFixed(3));
    c.style.setProperty("--sx", (Math.sin(r) * 22).toFixed(1) + "px");
  };
  const faceOf = (a) => Math.round(a / 180) % 2 !== 0; /* true = words side */
  const settle = (c, to) => {
    c.classList.add("turned");
    if (!calm) { c.classList.add("snap"); clearTimeout(c._t); c._t = setTimeout(() => { c.classList.remove("snap"); const n = ((c._a % 360) + 360) % 360; apply(c, n); }, 860); }
    apply(c, to);
    const back = faceOf(to);
    c.classList.toggle("is-back", back);
    c.setAttribute("aria-pressed", String(back));
  };
  cards.forEach((c) => {
    let x0 = 0, y0 = 0, id = -1, moved = false, drag = false, a = 0, lastT = 0, lx = 0, ly = 0, from = 0;
    c._a = 0;
    apply(c, 0);
    c.setAttribute("aria-label", (c.getAttribute("aria-label") || "").replace("Press to turn it over.", "Swipe to turn it over. Tap twice to read the letter."));
    c.addEventListener("pointerdown", (e) => { if (e.button) return; id = e.pointerId; x0 = e.clientX; y0 = e.clientY; moved = drag = false; a = 0; from = c._a; });
    c.addEventListener("pointermove", (e) => {
      if (e.pointerId !== id) return;
      const dx = e.clientX - x0, dy = e.clientY - y0;
      if (Math.hypot(dx, dy) > 10) moved = true;
      if (!drag && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) { drag = true; try { c.setPointerCapture(id); } catch (z) {} clearTimeout(c._t); c.classList.remove("snap"); c.classList.add("drag", "turned"); }
      if (!drag) return;
      a = Math.max(-175, Math.min(175, (dx / Math.max(1, c.clientWidth)) * 200)); /* a full card width is a bit more than a half turn */
      apply(c, from + a);
    });
    const end = (e, cancel) => {
      if (e.pointerId !== id) return;
      id = -1;
      if (drag) {
        drag = false;
        c.classList.remove("drag");
        const commit = !cancel && Math.abs(a) > 52;
        settle(c, commit ? from + (a < 0 ? -180 : 180) : from);
        lastT = 0;
        return;
      }
      if (cancel || moved) return;
      const now = Date.now();
      if (now - lastT < 360 && Math.hypot(e.clientX - lx, e.clientY - ly) < 30) { lastT = 0; openIt(c); } else { lastT = now; lx = e.clientX; ly = e.clientY; }
    };
    c.addEventListener("pointerup", (e) => end(e, false));
    c.addEventListener("pointercancel", (e) => end(e, true));
    c.addEventListener("dblclick", (e) => { e.preventDefault(); });
    c.addEventListener("dragstart", (e) => e.preventDefault()); /* a mouse drag must turn the card, not drag the picture away */
    c.addEventListener("keydown", (e) => {
      if (e.target !== c) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); settle(c, c._a - 180); }
      else if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); settle(c, c._a + 180); }
      else if (e.key === "Enter") { e.preventDefault(); openIt(c); }
    });
  });
  /* cards lean a little with where they sit on the screen, so scrolling the board feels like looking down a table of real cards */
  if (!calm) {
    let raf = 0;
    const lean = () => {
      raf = 0;
      const vh = innerHeight;
      cards.forEach((c) => {
        const r = c.getBoundingClientRect();
        if (r.bottom < -80 || r.top > vh + 80) return;
        const k = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / (vh / 2)));
        c.style.setProperty("--lean", (k * 9).toFixed(2) + "deg");
      });
    };
    addEventListener("scroll", () => { raf = raf || requestAnimationFrame(lean); }, { passive: true });
    addEventListener("resize", lean);
    lean();
  }
  /* caption colour comes from the picture: light picture = pale label, dark picture = deep label */
  const tint = (img) => {
    try {
      const card = img.closest(".spk");
      if (!card || !img.naturalWidth) return;
      const W = img.naturalWidth, H = img.naturalHeight, c = document.createElement("canvas");
      c.width = 32; c.height = 8;
      const g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(img, W * 0.04, H * 0.78, W * 0.84, H * 0.16, 0, 0, 32, 8);
      const d = g.getImageData(0, 0, 32, 8).data;
      let lum = 0, vx = 0, vy = 0, sw = 0, ss = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i] / 255, gr = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, gr, b), mn = Math.min(r, gr, b), dl = mx - mn, l = (mx + mn) / 2;
        lum += l; n++;
        if (!dl) continue;
        const s = dl / (1 - Math.abs(2 * l - 1) || 1);
        let h = mx === r ? ((gr - b) / dl) % 6 : mx === gr ? (b - r) / dl + 2 : (r - gr) / dl + 4;
        h *= Math.PI / 3;
        const w = s * s; vx += Math.cos(h) * w; vy += Math.sin(h) * w; sw += w; ss += s * w;
      }
      lum /= n;
      let hue = sw ? (Math.atan2(vy, vx) * 180) / Math.PI : 0; if (hue < 0) hue += 360;
      let sat = sw ? Math.min(1, ss / sw) : 0;
      if (hue < 55 || hue > 335) hue = (hue + 350) % 360;
      const green = hue > 75 && hue < 170;
      sat = Math.max(green ? 0.4 : 0.38, Math.min(0.7, sat * 1.25));
      const S = (k) => Math.round(sat * k);
      const set = (k, v) => card.style.setProperty(k, v);
      if (lum > 0.5) { set("--cap-bg", `hsla(${hue},${S(75)}%,93%,.94)`); set("--cap-ink", `hsl(${hue},${S(85)}%,16%)`); set("--cap-edge", `hsla(${hue},${S(70)}%,28%,.22)`); }
      else { set("--cap-bg", `hsla(${hue},${S(green ? 85 : 75)}%,${green ? 11 : 15}%,.92)`); set("--cap-ink", `hsl(${hue},${S(45)}%,93%)`); set("--cap-edge", `hsla(${hue},${S(60)}%,62%,.28)`); }
    } catch (e) { /* keep the default dark label */ }
  };
  cards.forEach((c) => { const i = c.querySelector(".spk-front img"); if (i) { i.complete ? tint(i) : i.addEventListener("load", () => tint(i)); } });
  const run = () => cards.forEach(fit);
  run();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
  addEventListener("load", run);
})();
