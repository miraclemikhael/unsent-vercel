/* Unsent · js/stickers.js · write page: pictures placed freely ON the note, and "Email this letter". Loaded in order by includes/footer.php (core.js first).
   How the pictures work:
   - every picture is its own element on the note. Grab it anywhere to move it, anywhere on the note (the note grows to hold it).
   - handles (hover, or tap the picture): resize (bottom-right), turn (bottom-left), remove (top-right). Arrow keys nudge it.
   - words flow around the pictures: the editor is a normal block, and two invisible floats (css/stickers.css) are shaped like the pictures.
     Words above a picture stay put, words beside it get shorter, words below it carry on. Nothing is added to the letter text. */
/* global $, CSRF, post, Swal */
(() => {
  const G = (id) => document.getElementById(id);
  const sheet = document.querySelector(".sheet"),
    field = G("stk"),
    ed = G("ed");
  if (!sheet || !field || !ed) return;
  const tell = (m, icon) => (window.Swal ? Swal.fire({ icon: icon || "info", title: m, confirmButtonText: "OK" }) : alert(m));
  const MAX = 12;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const W = () => sheet.clientWidth || 1;
  let S = Array.isArray(window.STK) ? window.STK : [];
  let sel = null;
  const nodes = []; /* [{s, d, draw}] picture data + its element */

  /* keep a picture fully on the note, whatever the screen size (x, w in % of the note width; y is in % of the note width too) */
  const fit = (s) => {
    s.w = clamp(s.w, 8, 96);
    s.x = clamp(s.x, 1.5, Math.max(1.5, 98.5 - s.w));
    s.y = clamp(s.y, 18 / W() * 100, 390);
  };

  /* which paragraph the picture sits next to (used when the letter is emailed) */
  const nearPara = (d) => {
    const c = d.getBoundingClientRect();
    const mid = c.top + c.height / 2;
    let k = 0;
    [...ed.children].forEach((p, i) => {
      if (p.getBoundingClientRect().top < mid) k = i + 1;
    });
    return k;
  };
  /* any change: store as JSON in the form and let the editor's own autosave pick it up */
  const changed = () => {
    nodes.forEach((n) => (n.s.p = nearPara(n.d)));
    field.value = JSON.stringify(S.map((s) => ({ src: s.src, x: +s.x.toFixed(2), y: +s.y.toFixed(2), w: +s.w.toFixed(2), r: Math.round(s.r || 0), p: s.p || 0 })));
    ed.dispatchEvent(new Event("input", { bubbles: true }));
  };

  /* ---- words flow around the pictures ---- */
  /* blocked-width profile of one side: a list of {t, b, x} bands -> float size + polygon (zero-width slivers join separate pictures) */
  const profile = (list, right) => {
    if (!list.length) return null;
    const ys = [...new Set(list.flatMap((o) => [o.t, o.b]))].sort((a, b) => a - b);
    const segs = [];
    for (let i = 0; i < ys.length - 1; i++) {
      const m = (ys[i] + ys[i + 1]) / 2;
      const w = Math.max(0, ...list.filter((o) => o.t <= m && m < o.b).map((o) => o.x));
      if (w > 0) segs.push([ys[i], ys[i + 1], w]);
    }
    if (!segs.length) return null;
    const fw = Math.max(...segs.map((g) => g[2]));
    const X = (w) => (right ? fw - w : w); /* x of the shape's inner edge */
    const E = right ? fw : 0; /* x of the page edge */
    const f = (n) => n.toFixed(1) + "px";
    const pts = [[E, segs[0][0]]];
    segs.forEach((g, i) => {
      if (i && segs[i - 1][1] !== g[0]) pts.push([E, segs[i - 1][1]], [E, g[0]]);
      pts.push([X(g[2]), g[0]], [X(g[2]), g[1]]);
    });
    const last = segs[segs.length - 1][1];
    pts.push([E, last]);
    return { w: fw, h: last, shape: "polygon(" + pts.map((p) => f(p[0]) + " " + f(p[1])).join(",") + ")" };
  };
  const setSide = (k, prof) => {
    ["w", "h", "s"].forEach((n) => ed.style.removeProperty("--" + k + n));
    if (!prof) return;
    ed.style.setProperty("--" + k + "w", prof.w.toFixed(1) + "px");
    ed.style.setProperty("--" + k + "h", prof.h.toFixed(1) + "px");
    ed.style.setProperty("--" + k + "s", prof.shape);
  };
  let raf = 0;
  const layout = () => {
    raf = 0;
    const cs = getComputedStyle(ed);
    const pl = parseFloat(cs.paddingLeft) || 0,
      pr = parseFloat(cs.paddingRight) || 0,
      pt = parseFloat(cs.paddingTop) || 0,
      bl = parseFloat(cs.borderLeftWidth) || 0,
      bt = parseFloat(cs.borderTopWidth) || 0;
    const er = ed.getBoundingClientRect();
    const x0 = er.left + bl + pl,
      y0 = er.top + bt + pt;
    const Wc = ed.clientWidth - pl - pr;
    const boxes = nodes.map((n) => n.d.getBoundingClientRect());

    /* the note grows so a picture is never cut off, wherever you put it */
    ed.style.minHeight = "";
    const base = parseFloat(getComputedStyle(ed).minHeight) || 0;
    const bottom = boxes.reduce((m, b) => Math.max(m, b.bottom), 0);
    const need = bottom ? Math.ceil(bottom - er.top + 34) : 0;
    if (need > base) ed.style.minHeight = need + "px";

    const L = [],
      R = [];
    const minRoom = Math.min(150, Wc * 0.42);
    if (Wc > 120)
      boxes.forEach((b) => {
        const o = { l: Math.max(0, b.left - 12 - x0), r: Math.min(Wc, b.right + 12 - x0), t: Math.max(0, b.top - 6 - y0), b: b.bottom + 6 - y0 };
        if (o.r - o.l < 4 || o.b <= o.t) return;
        const lr = o.l,
          rr = Wc - o.r;
        if (Math.max(lr, rr) < minRoom) L.push({ t: o.t, b: o.b, x: Wc }); /* no room beside it: words skip the whole band */
        else if (rr >= lr) L.push({ t: o.t, b: o.b, x: o.r }); /* words go to its right */
        else R.push({ t: o.t, b: o.b, x: Wc - o.l }); /* words go to its left */
      });
    /* the two floats must fit side by side with room left to type, or the right one would drop below the left one */
    const wl = L.length ? Math.max(...L.map((o) => o.x)) : 0,
      wr = R.length ? Math.max(...R.map((o) => o.x)) : 0;
    if (wl + wr > Wc - 110) {
      L.push(...R.map((o) => ({ t: o.t, b: o.b, x: Wc })));
      R.length = 0;
    }
    setSide("l", profile(L, false));
    setSide("r", profile(R, true));
  };
  const wrap = () => {
    if (!raf) raf = requestAnimationFrame(layout);
  };

  /* ---- one picture ---- */
  const ICON = {
    rs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7l10 10M17 9v8H9"/></svg>',
    ro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v4h-4"/></svg>',
    rm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  };
  const put = (s) => {
    s.x = +s.x || 0;
    s.y = +s.y || 0;
    s.w = +s.w || 34;
    s.r = +s.r || 0;
    fit(s);
    const d = document.createElement("div");
    d.className = "stk";
    d.tabIndex = 0;
    d.setAttribute("role", "img");
    d.setAttribute("aria-label", "Picture on your note. Drag to move it. Arrow keys nudge it, plus and minus resize it, Delete removes it.");
    d.innerHTML = `<img src="${s.src}" alt="" draggable="false"><button type="button" class="hd rs" aria-label="Resize picture">${ICON.rs}</button><button type="button" class="hd ro" aria-label="Turn picture">${ICON.ro}</button><button type="button" class="hd rm" aria-label="Remove picture">${ICON.rm}</button>`;
    const draw = () => {
      d.style.left = s.x + "%";
      d.style.top = (s.y / 100) * W() + "px";
      d.style.width = s.w + "%";
      d.style.transform = s.r ? `rotate(${s.r}deg)` : "";
      wrap();
    };
    const pick = () => {
      if (sel && sel !== d) sel.classList.remove("sel");
      sel = d;
      d.classList.add("sel");
    };
    /* start a drag: fn gets how far the pointer moved (page scroll included) and the picture's values at the start */
    const drag = (e, fn) => {
      if (e.button > 0) return;
      e.preventDefault();
      e.stopPropagation();
      pick();
      const x0 = e.clientX,
        y0 = e.clientY,
        sx0 = scrollX,
        sy0 = scrollY,
        o = { ...s };
      let cx = x0,
        cy = y0,
        run = true;
      d.classList.add("drag");
      const apply = () => {
        fn({ dx: cx - x0 + (scrollX - sx0), dy: cy - y0 + (scrollY - sy0), cx, cy, W: W() }, o);
        fit(s);
        draw();
      };
      const mv = (ev) => {
        cx = ev.clientX;
        cy = ev.clientY;
        apply();
      };
      /* near the top or bottom of the screen the page scrolls for you, so you can carry a picture a long way down */
      const tick = () => {
        if (!run) return;
        const edge = 70,
          top = innerWidth <= 900 ? 120 : 40;
        let v = 0;
        if (cy > innerHeight - edge) v = Math.min(20, 4 + (cy - (innerHeight - edge)) / 3);
        else if (cy < top + edge) v = -Math.min(20, 4 + (top + edge - cy) / 3);
        if (v) {
          const b = scrollY;
          scrollBy(0, v);
          if (scrollY !== b) apply();
        }
        requestAnimationFrame(tick);
      };
      const up = () => {
        run = false;
        d.classList.remove("drag");
        removeEventListener("pointermove", mv);
        removeEventListener("pointerup", up);
        removeEventListener("pointercancel", up);
        changed();
      };
      addEventListener("pointermove", mv);
      addEventListener("pointerup", up);
      addEventListener("pointercancel", up);
      requestAnimationFrame(tick);
    };
    d.onpointerdown = (e) =>
      drag(e, (m, o) => {
        s.x = o.x + (m.dx / m.W) * 100;
        s.y = o.y + (m.dy / m.W) * 100;
      });
    d.querySelector(".rs").onpointerdown = (e) =>
      drag(e, (m, o) => {
        s.w = o.w + (m.dx / m.W) * 100;
      });
    d.querySelector(".ro").onpointerdown = (e) => {
      const B = d.getBoundingClientRect(),
        mx = B.left + B.width / 2,
        my = B.top + B.height / 2,
        a0 = Math.atan2(e.clientY - my, e.clientX - mx);
      drag(e, (m, o) => {
        let r = o.r + ((Math.atan2(m.cy - my, m.cx - mx) - a0) * 180) / Math.PI;
        r = ((((r + 180) % 360) + 360) % 360) - 180;
        for (const k of [-180, -90, 0, 90, 180]) if (Math.abs(r - k) < 4) r = k;
        s.r = Math.round(r);
      });
    };
    d.querySelector(".rm").onpointerdown = (e) => e.stopPropagation();
    d.querySelector(".rm").onclick = (e) => {
      e.stopPropagation();
      S = S.filter((x) => x !== s);
      const i = nodes.findIndex((n) => n.d === d);
      if (i > -1) nodes.splice(i, 1);
      if (sel === d) sel = null;
      d.remove();
      changed();
      wrap();
    };
    d.onkeydown = (e) => {
      const step = e.shiftKey ? 5 : 1;
      const k = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (k) {
        e.preventDefault();
        s.x += k[0];
        s.y += k[1];
        fit(s);
        draw();
        changed();
      } else if (e.key === "+" || e.key === "=" || e.key === "-") {
        e.preventDefault();
        s.w += e.key === "-" ? -3 : 3;
        fit(s);
        draw();
        changed();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        d.querySelector(".rm").click();
      } else if (e.key === "Escape") d.blur();
    };
    d.addEventListener("focus", pick);
    d.querySelector("img").addEventListener("load", () => {
      wrap();
      nodes.forEach((n) => (n.s.p = nearPara(n.d)));
    });
    nodes.push({ s, d, draw });
    sheet.appendChild(d);
    draw();
  };
  S.forEach(put);
  /* the note got wider or narrower (window, phone turned): reposition. Only width matters; height changes come from us. */
  let lastW = W();
  new ResizeObserver(() => {
    if (Math.abs(W() - lastW) < 1) return;
    lastW = W();
    nodes.forEach((n) => {
      fit(n.s);
      n.draw();
    });
  }).observe(sheet);
  addEventListener("pointerdown", (e) => {
    if (sel && !e.target.closest(".stk")) {
      sel.classList.remove("sel");
      sel = null;
    }
  });
  /* words typed or deleted move the text, so re-flow */
  ed.addEventListener("input", wrap);
  document.fonts && document.fonts.ready.then(wrap);
  addEventListener("load", wrap);
  wrap();

  /* ---- adding pictures: button, drag a file onto the note, or paste ---- */
  const btn = G("stkb"),
    file = G("stkf");
  const shrink = async (f) => {
    /* phone photos are huge: scale them down first so uploading and emailing stay fast */
    try {
      if (f.size < 500 * 1024) return f;
      const bmp = await createImageBitmap(f);
      const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      if (k === 1 && f.size < 2 * 1048576) return f;
      const c = document.createElement("canvas");
      c.width = Math.round(bmp.width * k);
      c.height = Math.round(bmp.height * k);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      const png = f.type === "image/png";
      const blob = await new Promise((res) => c.toBlob(res, png ? "image/png" : "image/jpeg", 0.86));
      return blob && blob.size < f.size ? new File([blob], f.name.replace(/\.\w+$/, png ? ".png" : ".jpg"), { type: blob.type }) : f;
    } catch (x) {
      return f;
    }
  };
  /* at = {x, y} in client pixels where it was dropped; otherwise it lands in the middle of what you can see */
  const add = async (f, at) => {
    if (S.length >= MAX) return tell("Up to " + MAX + " pictures per note.");
    if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) return tell("Please choose a PNG, JPG or WebP picture.");
    btn.disabled = true;
    try {
      const f2 = await shrink(f);
      const fd = new FormData();
      fd.set("a", "pcup");
      fd.set("pic", f2, f2.name || "picture.jpg");
      const r = await (await post(fd)).json();
      if (!r.ok) return tell(r.err || "Could not add that picture.", "error");
      const B = sheet.getBoundingClientRect();
      const s = { src: r.src, x: 60, y: 10, w: B.width < 500 ? 42 : 34, r: 0 };
      const h = s.w / 100 * B.width * 0.7; /* a typical picture height */
      if (at) {
        s.x = ((at.x - B.left) / B.width) * 100 - s.w / 2;
        s.y = ((at.y - B.top - h / 2) / B.width) * 100;
      } else {
        const a = Math.max(B.top, 70),
          b = Math.min(B.bottom, innerHeight);
        const mid = b > a ? (a + b) / 2 : B.top + 120;
        s.x = 62 - S.length * 2;
        s.y = ((mid - B.top - h / 2) / B.width) * 100;
      }
      fit(s);
      S.push(s);
      put(s);
      nodes[nodes.length - 1].d.focus({ preventScroll: true });
      changed();
    } catch (x) {
      tell("Could not add that picture.", "error");
    } finally {
      btn.disabled = false;
    }
  };
  btn.onclick = () => file.click();
  file.onchange = async (e) => {
    const fs = [...e.target.files];
    e.target.value = "";
    for (const f of fs) await add(f);
  };
  const hasFiles = (e) => [...((e.dataTransfer && e.dataTransfer.types) || [])].includes("Files");
  sheet.addEventListener("dragover", (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    sheet.classList.add("dropping");
  });
  ["dragleave", "dragend"].forEach((t) => sheet.addEventListener(t, () => sheet.classList.remove("dropping")));
  sheet.addEventListener("drop", async (e) => {
    sheet.classList.remove("dropping");
    const fs = [...(e.dataTransfer?.files || [])].filter((f) => f.type.startsWith("image/"));
    if (!fs.length) return;
    e.preventDefault();
    let i = 0;
    for (const f of fs) await add(f, { x: e.clientX + i * 30, y: e.clientY + i++ * 30 });
  });
  ed.addEventListener("paste", async (e) => {
    const fs = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith("image/"));
    if (!fs.length) return;
    e.preventDefault();
    for (const f of fs) await add(f);
  });

  /* ---- Email this letter ---- */
  const emb = document.getElementById("emb");
  if (!emb) return;
  emb.onclick = async () => {
    return window.letterOut((document.getElementById("ttl") || {}).value || "", ((document.querySelector("#ed,.page,[contenteditable]") || {}).innerText || "").trim());
    const lid = document.getElementById("lid"),
      ttl = document.getElementById("ttl"),
      ef = document.getElementById("ef");
    const v = await Swal.fire({
      title: "Email this letter",
      html: '<input id="mt" class="swal2-input" type="email" placeholder="name@gmail.com" aria-label="Send to"><input id="ms" class="swal2-input" maxlength="150" placeholder="Subject" aria-label="Subject"><textarea id="mn" class="swal2-textarea" maxlength="600" placeholder="A note to go with it (optional)" aria-label="Note"></textarea>',
      didOpen: () => { document.getElementById("ms").value = ttl.value || "A letter for you"; document.getElementById("mt").focus(); },
      showCancelButton: true,
      confirmButtonText: "Send",
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        const to = document.getElementById("mt").value.trim();
        if (!/^\S+@\S+\.\S+$/.test(to)) { Swal.showValidationMessage("Enter a valid email address."); return false; }
        /* save the letter first so the email has the latest words and pictures */
        document.getElementById("body").value = ed.innerHTML;
        const sf = new FormData(ef);
        sf.set("ajax", "1");
        try {
          const sr = await (await post(sf)).json();
          if (!sr.ok) throw 0;
          lid.value = sr.id;
          const f = new FormData();
          f.set("a", "email");
          f.set("id", sr.id);
          f.set("to", to);
          f.set("subject", document.getElementById("ms").value);
          f.set("note", document.getElementById("mn").value);
          const r = await (await post(f)).json();
          if (!r.ok) { Swal.showValidationMessage(r.err || "Could not send."); return false; }
          return true;
        } catch (x) {
          Swal.showValidationMessage("Could not send. Check your connection.");
          return false;
        }
      },
    });
    if (v.isConfirmed) Swal.fire({ icon: "success", title: "Sent", text: "Check the inbox.", timer: 1800, showConfirmButton: false });
  };
})();
