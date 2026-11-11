/* Unsent · js/chat.js · Friends page: add friends, text, pictures, voice notes. Loaded in order by includes/footer.php (core.js first). */
/* global CSRF, Swal */
(() => {
  const root = document.querySelector(".fgrid");
  if (!root) return;
  document.documentElement.dataset.dm = "1";
  const api = (f, a, body, qs = "") =>
    fetch(`index.php?api=${f}&a=${a}${qs}`, { method: body ? "POST" : "GET", body, headers: { "X-CSRF": CSRF() }, credentials: "same-origin" }).then(async (r) => {
      const t = await r.text();
      try { return JSON.parse(t); } catch (x) { throw new Error("Server said (" + r.status + "): " + (t.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200) || "empty reply")); }
    });
  const fail = (e) => (window.Swal ? Swal.fire({ icon: "error", title: "That did not work", text: String((e && e.message) || e), confirmButtonText: "OK" }) : alert(String((e && e.message) || e)));
  const fd = (o) => {
    const f = new FormData();
    for (const k in o) f.append(k, o[k]);
    return f;
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const tell = (m, icon) => (window.Swal ? Swal.fire({ toast: true, position: "top-end", icon: icon || "success", title: m, showConfirmButton: false, timer: 2800, timerProgressBar: true }) : alert(m));

  document.querySelectorAll("[data-add]").forEach(
    (f) =>
      (f.onsubmit = async (e) => {
        e.preventDefault();
        const r = await api("chat", "add", fd({ who: f.who.value })).catch(() => ({}));
        tell(r.msg || r.err || "Could not send the request.", r.ok ? "success" : "error");
        f.reset();
        if (r.ok) setTimeout(() => location.reload(), 1500);
      }),
  );
  document.querySelectorAll("[data-accept]").forEach((b) => (b.onclick = async () => { await api("chat", "accept", fd({ id: b.dataset.accept })); location.reload(); }));
  document.querySelectorAll("[data-decline]").forEach((b) => (b.onclick = async () => { await api("chat", "decline", fd({ id: b.dataset.decline })); location.reload(); }));

  const M = document.getElementById("msgs");
  if (!M) return;
  const W = M.dataset.with;
  let last = 0, day = "", busy = false, since = 0, replyTo = 0, editing = 0, lpFired = false;
  const msgs = {}; /* id -> {m, got}: lets a reply quote its message and the 15-minute window be checked on every tap */
  const other = (document.querySelector(".ch .who b") || {}).textContent || "them";
  const PLAY = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>';
  const PAUSE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4.5" height="14" rx="1.4"/><rect x="13.5" y="5" width="4.5" height="14" rx="1.4"/></svg>';
  const fmtT = (x) => { x = Math.max(0, Math.round(+x || 0)); return Math.floor(x / 60) + ":" + String(x % 60).padStart(2, "0"); };
  const NB = 30; /* bars in the voice note picture */
  const bars = (id) => { let q = (+id || 7) * 7919 + 13, h = ""; for (let i = 0; i < NB; i++) { q = (q * 9301 + 49297) % 233280; h += "<i style=\"height:" + (26 + Math.round((q / 233280) * 74)) + "%\"></i>"; } return h; };
  const inner = (m) =>
    m.deleted
      ? `<p class=gone>This message was deleted</p>`
      : m.kind === "image"
        ? `<a class=pic href="${esc(m.url)}" aria-label="Open picture"><img src="${esc(m.url)}" alt="Picture from chat" loading=lazy></a>${m.body ? `<p class=cap>${esc(m.body).replace(/\n/g, "<br>")}</p>` : ""}`
        : m.kind === "voice"
          ? `<div class=vn data-src="${esc(m.url)}" data-dur="${+m.dur || 0}"><button type=button class=vp aria-label="Play voice note">${PLAY}</button><span class=vw role=presentation>${bars(m.id)}</span><small class=vt>${fmtT(m.dur)}</small></div>`
          : `<p>${esc(m.body).replace(/\n/g, "<br>")}</p>`;
  const quote = (m) => (m.reply && !m.deleted ? `<div class=q data-go="${m.reply.id}"><b>${m.reply.mine ? "You" : esc(other)}</b><span>${esc(m.reply.text)}</span></div>` : "");
  const left = (id) => { const r = msgs[id]; return r && r.m.mine ? r.m.left - (Date.now() - r.got) / 1000 : 0; };
  const BM = `<button type=button class=bm aria-label="Message options" title="Reply, copy, edit, delete"><svg width=14 height=14 viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=2.6 stroke-linecap=round stroke-linejoin=round><path d="m6 9 6 6 6-6"/></svg></button>`;
  const html = (m) => `${quote(m)}${inner(m)}<time>${m.edited && !m.deleted ? "edited · " : ""}${esc(m.hm)}</time>${BM}`;
  const cls = (m) => `bub ${m.mine ? "mine" : "them"}${m.kind === "text" || m.deleted || m.reply || (m.kind === "image" && m.body) ? "" : " media"}${m.deleted ? " del" : ""}`;
  const bubble = (m) => {
    if (m.hidden) return;
    if (m.day !== day) {
      day = m.day;
      M.insertAdjacentHTML("beforeend", `<div class=day>${esc(day)}</div>`);
    }
    msgs[m.id] = { m, got: Date.now() };
    M.insertAdjacentHTML("beforeend", `<div class="${cls(m)}" data-id=${m.id}>${html(m)}</div>`);
  };
  const refresh = (m) => {
    const el = M.querySelector(`.bub[data-id="${m.id}"]`);
    if (m.hidden) { if (el) el.remove(); delete msgs[m.id]; return; }
    msgs[m.id] = { m, got: Date.now() };
    if (el) { el.className = cls(m); el.innerHTML = html(m); }
  };
  const hush = () => {
    if (!M.querySelector(".bub") && !M.querySelector(".hush")) M.insertAdjacentHTML("beforeend", "<div class=hush><b class=hand>Nothing here yet.</b><p class=mut>A small hello is enough.</p></div>");
  };
  const poll = async () => {
    if (busy || document.hidden) return;
    busy = true;
    try {
      const r = await api("chat", "poll", null, `&with=${W}&after=${last}&since=${since}`);
      if (r.ok) since = r.now || since;
      if (r.ok && !r.msgs.length && !last) hush();
      if (r.ok && (r.changed || []).length) r.changed.forEach(refresh);
      if (r.ok && r.msgs.length) {
        M.querySelector(".hush")?.remove();
        const bottom = M.scrollHeight - M.scrollTop - M.clientHeight < 120 || !last;
        r.msgs.forEach((m) => { bubble(m); last = m.id; });
        if (bottom) M.scrollTop = M.scrollHeight;
        const nb = document.getElementById("navnb");
        if (nb) nb.remove();
      }
    } catch (e) { /* offline: try again next tick */ }
    busy = false;
  };
  poll();
  setInterval(poll, 2000);
  document.addEventListener("visibilitychange", poll);

  const ct = document.getElementById("ct");
  /* ---- message menu (tap, long-press, or right-click a message): Reply, Copy, Edit, Delete ---- */
  const snip = (m) => (m.kind === "image" ? (m.body ? "Photo · " + String(m.body).slice(0, 80) : "Photo") : m.kind === "voice" ? "Voice note" : String(m.body || "").slice(0, 100));
  const ic = (d) => `<svg width=18 height=18 viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round aria-hidden=true>${d}</svg>`;
  const IC = {
    reply: ic('<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 6 6v3"/>'),
    copy: ic('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>'),
    edit: ic('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
    del: ic('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>'),
  };
  const closeMenu = () => { document.querySelector(".bmenu")?.remove(); M.querySelectorAll(".bub.sel").forEach((x) => x.classList.remove("sel")); };
  const stopReply = () => { replyTo = 0; document.querySelector(".replybar")?.remove(); };
  const stopEdit = () => { if (!editing) return; editing = 0; document.querySelector(".editbar:not(.replybar)")?.remove(); ct.value = ""; ct.style.height = ""; };
  const startReply = (id) => {
    const r = msgs[id];
    if (!r || r.m.deleted) return;
    closeMenu();
    stopReply();
    stopEdit();
    replyTo = id;
    const bar = document.createElement("div");
    bar.className = "editbar replybar";
    bar.innerHTML = `<span><b>Replying to ${r.m.mine ? "yourself" : esc(other)}</b><small>${esc(snip(r.m))}</small></span><button type=button aria-label="Cancel reply">✕</button>`;
    bar.querySelector("button").onclick = stopReply;
    document.getElementById("cf").before(bar);
    ct.focus();
  };
  const startEdit = (id) => {
    const r = msgs[id];
    if (!r) return;
    closeMenu();
    stopReply();
    document.querySelector(".editbar")?.remove();
    editing = id;
    const bar = document.createElement("div");
    bar.className = "editbar";
    bar.innerHTML = `<span><b>Editing message</b><small>${esc(r.m.body).slice(0, 80)}</small></span><button type=button aria-label="Cancel editing">✕</button>`;
    bar.querySelector("button").onclick = stopEdit;
    document.getElementById("cf").before(bar);
    ct.value = r.m.body;
    ct.oninput();
    ct.focus();
  };
  const copyText = async (id) => {
    closeMenu();
    const t = String((msgs[id] && msgs[id].m.body) || "");
    try { await navigator.clipboard.writeText(t); }
    catch (e) { const x = document.createElement("textarea"); x.value = t; x.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(x); x.select(); try { document.execCommand("copy"); } catch (z) {} x.remove(); }
    tell("Copied", "success");
  };
  const del = async (id) => {
    closeMenu();
    const r0 = msgs[id];
    if (!r0) return;
    const all = r0.m.mine && !r0.m.deleted && left(id) > 0;
    let mode = "";
    if (window.Swal) {
      const r = await Swal.fire({ title: "Delete message?", text: all ? "You can remove it for everyone, or just for you." : "It will be removed from your chat only.", icon: "warning", showCancelButton: true, showDenyButton: all, confirmButtonText: all ? "Delete for everyone" : "Delete for me", denyButtonText: "Delete for me", cancelButtonText: "Cancel", reverseButtons: true });
      mode = r.isConfirmed ? (all ? "all" : "me") : r.isDenied ? "me" : "";
    } else if (confirm(all ? "Delete this message for everyone?" : "Delete this message for you?")) mode = all ? "all" : "me";
    if (!mode) return;
    const r = await api("chat", "delete", fd({ with: W, id, mode })).catch((e) => ({ err: e.message }));
    if (!r.ok) fail(new Error(r.err || "Could not delete."));
    busy = false;
    poll();
  };
  const openMenu = (id) => {
    closeMenu();
    const r = msgs[id], b = M.querySelector(`.bub[data-id="${id}"]`);
    if (!r || !b) return;
    const m = r.m, secs = left(id), can = m.mine && !m.deleted && secs > 0;
    let h = "";
    if (!m.deleted) h += `<button type=button data-a=reply>${IC.reply}Reply</button>`;
    if (!m.deleted && m.kind === "text") h += `<button type=button data-a=copy>${IC.copy}Copy</button>`;
    if (can && m.kind === "text") h += `<button type=button data-a=edit>${IC.edit}Edit</button>`;
    h += `<button type=button data-a=del class=danger>${IC.del}Delete</button>`;
    if (can) h += `<small>${Math.max(1, Math.ceil(secs / 60))} min left to edit or delete for everyone</small>`;
    const menu = document.createElement("div");
    menu.className = "bmenu";
    menu.innerHTML = h;
    document.body.appendChild(menu);
    b.classList.add("sel");
    const q = b.getBoundingClientRect(), w = menu.offsetWidth, hh = menu.offsetHeight;
    const top = q.top - hh - 8 < 8 ? q.bottom + 8 : q.top - hh - 8;
    menu.style.top = Math.max(8, Math.min(innerHeight - hh - 8, top)) + "px";
    menu.style.left = Math.max(8, Math.min(innerWidth - w - 8, m.mine ? q.right - w : q.left)) + "px";
    menu.onclick = (ev) => {
      const a = ev.target.closest("[data-a]");
      if (!a) return;
      ev.stopPropagation();
      const k = a.dataset.a;
      if (k === "reply") startReply(id); else if (k === "copy") copyText(id); else if (k === "edit") startEdit(id); else if (k === "del") del(id);
    };
  };
  M.addEventListener("click", (e) => {
    if (lpFired) { lpFired = false; return; }
    const q = e.target.closest(".q");
    if (q) {
      const o = M.querySelector(`.bub[data-id="${q.dataset.go}"]`);
      if (o) { o.scrollIntoView({ block: "center", behavior: "smooth" }); o.classList.add("flash"); setTimeout(() => o.classList.remove("flash"), 1300); }
      return;
    }
    const b = e.target.closest(".bub");
    closeMenu();
    if (!b || e.target.closest("a,.vp,.vw")) return;
    openMenu(+b.dataset.id);
    e.stopPropagation();
  });
  M.addEventListener("contextmenu", (e) => { const b = e.target.closest(".bub"); if (!b) return; e.preventDefault(); openMenu(+b.dataset.id); });
  document.addEventListener("click", (e) => { if (!e.target.closest(".bmenu")) closeMenu(); });
  M.addEventListener("scroll", closeMenu, { passive: true });

  /* swipe a message to the right to reply (any message, yours too); hold it to open the menu. Pointer events: touch, pen and mouse. */
  let sx = 0, sy = 0, sb = null, dx = 0, raw = 0, sw = false, lp = 0, spid = -1;
  const ARM = 64;
  M.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button) return;
    const b = e.target.closest(".bub");
    if (!b || b.classList.contains("del") || e.target.closest(".vw,audio,.bm,.vp")) { sb = null; return; }
    sx = e.clientX; sy = e.clientY; sb = b; dx = raw = 0; sw = false; spid = e.pointerId;
    clearTimeout(lp);
    if (e.pointerType !== "mouse") lp = setTimeout(() => { if (!sb || sw) return; lpFired = true; if (navigator.vibrate) navigator.vibrate(12); const id = +sb.dataset.id; sb = null; openMenu(id); }, 450);
  });
  M.addEventListener("pointermove", (e) => {
    if (!sb || e.pointerId !== spid) return;
    const x = e.clientX - sx, y = e.clientY - sy;
    if (Math.abs(x) > 8 || Math.abs(y) > 8) clearTimeout(lp);
    if (!sw && Math.abs(y) > Math.abs(x) && Math.abs(y) > 8) { sb = null; return; }
    if (x > 8 && !sw) { sw = true; try { M.setPointerCapture(e.pointerId); } catch (z) {} }
    if (!sw) return;
    raw = Math.max(0, x);
    dx = 76 * (1 - Math.exp(-raw / 62)); /* the message gets heavier the further you pull, like a rubber band */
    sb.style.transition = "none";
    sb.style.transform = "translateX(" + dx.toFixed(1) + "px)";
    sb.style.setProperty("--p", Math.min(1, raw / ARM).toFixed(3));
    sb.classList.add("swp");
    const armed = raw >= ARM;
    if (armed && !sb.classList.contains("armed") && navigator.vibrate) navigator.vibrate(10);
    sb.classList.toggle("armed", armed);
  });
  const swEnd = (e) => {
    if (e && e.pointerId !== undefined && e.pointerId !== spid) return;
    clearTimeout(lp);
    if (sw) { lpFired = true; setTimeout(() => { lpFired = false; }, 400); } else if (lpFired) setTimeout(() => { lpFired = false; }, 600);
    if (!sb) return;
    const b = sb, go = raw >= ARM;
    sb = null;
    b.style.transition = "transform .38s cubic-bezier(.3, 1.6, .5, 1)";
    b.style.transform = "";
    setTimeout(() => { b.style.transition = ""; b.style.removeProperty("--p"); }, 400);
    b.classList.remove("armed", "swp");
    if (go) startReply(+b.dataset.id);
  };
  M.addEventListener("pointerup", swEnd);
  M.addEventListener("pointercancel", swEnd);

  /* ---- pictures open inside the page, not in another tab ---- */
  const lightbox = (id) => {
    const links = [...M.querySelectorAll(".bub:not(.del) a.pic")];
    let i = Math.max(0, links.findIndex((a) => a.closest(".bub").dataset.id == id));
    const prev = document.activeElement;
    const box = document.createElement("div");
    box.className = "lb";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Picture");
    box.innerHTML = '<button type=button class="lb-x" aria-label="Close picture">\u2715</button><button type=button class="lb-n lb-p" aria-label="Previous picture">\u2039</button><figure><img alt="Picture from chat"><figcaption></figcaption></figure><button type=button class="lb-n lb-nx" aria-label="Next picture">\u203a</button><small class=lb-c></small>';
    const img = box.querySelector("img"), cap = box.querySelector("figcaption"), cnt = box.querySelector(".lb-c");
    const show = (n, dir) => {
      i = n;
      const a = links[i], mid = +a.closest(".bub").dataset.id, m = msgs[mid] && msgs[mid].m;
      img.style.animation = "none"; void img.offsetWidth; img.style.animation = dir ? (dir > 0 ? "lb-in-r" : "lb-in-l") + " .25s ease" : "";
      img.src = a.href;
      cap.textContent = (m && m.body) || ""; cap.hidden = !cap.textContent;
      cnt.textContent = links.length > 1 ? (i + 1) + " / " + links.length : "";
      box.querySelector(".lb-p").hidden = i === 0; box.querySelector(".lb-nx").hidden = i === links.length - 1;
    };
    const close = () => { box.classList.remove("in"); document.removeEventListener("keydown", key, true); document.documentElement.classList.remove("lb-open"); setTimeout(() => box.remove(), 180); if (prev && prev.focus) try { prev.focus(); } catch (z) {} };
    const key = (e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } else if (e.key === "ArrowLeft" && i > 0) show(i - 1, -1); else if (e.key === "ArrowRight" && i < links.length - 1) show(i + 1, 1); };
    box.querySelector(".lb-x").onclick = close;
    box.querySelector(".lb-p").onclick = (e) => { e.stopPropagation(); show(i - 1, -1); };
    box.querySelector(".lb-nx").onclick = (e) => { e.stopPropagation(); show(i + 1, 1); };
    box.addEventListener("click", (e) => { if (e.target === box || e.target.tagName === "FIGURE") close(); });
    let x0 = null;
    box.addEventListener("pointerdown", (e) => { x0 = e.clientX; });
    box.addEventListener("pointerup", (e) => { if (x0 === null) return; const d = e.clientX - x0; x0 = null; if (Math.abs(d) > 60) { if (d < 0 && i < links.length - 1) show(i + 1, 1); else if (d > 0 && i > 0) show(i - 1, -1); } });
    document.addEventListener("keydown", key, true);
    document.documentElement.classList.add("lb-open");
    document.body.appendChild(box);
    show(i, 0);
    requestAnimationFrame(() => box.classList.add("in"));
    box.querySelector(".lb-x").focus();
  };
  M.addEventListener("click", (e) => {
    const a = e.target.closest("a.pic");
    if (!a) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    closeMenu();
    lightbox(+a.closest(".bub").dataset.id);
  }, true);

  const send = async () => {
    const t = ct.value.trim();
    if (!t) return;
    if (editing) {
      const id = editing;
      stopEdit();
      const r = await api("chat", "edit", fd({ with: W, id, text: t })).catch((e) => ({ err: e.message }));
      if (!r.ok) fail(new Error(r.err || "Could not edit."));
      busy = false;
      poll();
      return;
    }
    ct.value = "";
    ct.style.height = "";
    try {
      const rt = replyTo;
      stopReply();
      const r = await api("chat", "send", fd({ with: W, text: t, reply_to: rt }));
      if (!r || !r.ok) throw new Error((r && r.err) || "Message not sent.");
    } catch (e) { ct.value = t; fail(e); return; }
    poll();
  };
  document.getElementById("cf").onsubmit = (e) => { e.preventDefault(); send(); };
  ct.onkeydown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !matchMedia("(pointer:coarse)").matches) { e.preventDefault(); send(); }
    if (e.key === "Escape") { if (editing) stopEdit(); else if (replyTo) stopReply(); else closeMenu(); }
  };
  ct.oninput = () => { ct.style.height = "auto"; ct.style.height = Math.min(ct.scrollHeight, 120) + "px"; };

  const upload = async (file, kind, dur = 0, text = "") => {
    const r = await api("chat", "upload", fd({ with: W, kind, dur, file, text, reply_to: replyTo })).catch((e) => ({ err: (e && e.message) || "Upload failed." }));
    if (!r.ok) tell(r.err || "Upload failed.", "error");
    else stopReply();
    poll();
    return !!r.ok;
  };
  const SENDI = (document.querySelector("#cf .send") || {}).innerHTML || "Send";
  const TRASH = ic('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>');
  /* ---- the preview panel: see the picture or the voice note before it goes out ---- */
  let stage = null;
  const closeStage = () => { if (!stage) return; try { stage.dispose && stage.dispose(); } catch (z) {} stage.el.remove(); stage = null; };
  const mkStage = (cls, html) => { closeStage(); const el = document.createElement("div"); el.className = "stage " + cls; el.innerHTML = html; document.getElementById("cf").before(el); stage = { el }; requestAnimationFrame(() => el.classList.add("in")); return el; };
  const busyBtns = (el, on) => el.querySelectorAll("button,textarea").forEach((x) => { x.disabled = on; });
  const openImageStage = (file) => {
    if (!file) return;
    if (file.size > 8 * 1048576) return tell("That picture is over 8 MB.", "error");
    const url = URL.createObjectURL(file);
    const el = mkStage("st-img", `<button type=button class="st-x" aria-label="Discard picture">${TRASH}</button><div class=st-pic><img src="${url}" alt="The picture you are about to send"></div><div class=st-row><textarea class=st-cap rows=1 maxlength=1000 placeholder="Add a caption\u2026" aria-label="Caption"></textarea><button type=button class="btn sm send st-send" aria-label="Send picture">${SENDI}</button></div>`);
    stage.dispose = () => URL.revokeObjectURL(url);
    const cap = el.querySelector(".st-cap");
    const grow = () => { cap.style.height = "auto"; cap.style.height = Math.min(cap.scrollHeight, 96) + "px"; };
    cap.oninput = grow;
    const go = async () => { busyBtns(el, true); const ok = await upload(file, "image", 0, cap.value.trim()); if (ok) closeStage(); else busyBtns(el, false); };
    el.querySelector(".st-x").onclick = closeStage;
    el.querySelector(".st-send").onclick = go;
    cap.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey && !matchMedia("(pointer:coarse)").matches) { e.preventDefault(); go(); } if (e.key === "Escape") closeStage(); };
    cap.focus();
  };
  const pf = document.getElementById("pf");
  document.getElementById("pb").onclick = () => pf.click();
  pf.onchange = (e) => { openImageStage(e.target.files[0]); e.target.value = ""; };

  /* ---- voice note player: tap to play or pause, tap the bars to jump ---- */
  let vAud = null, vEl = null;
  const paintBars = (el, ratio) => { const k = Math.round(ratio * NB); el.querySelectorAll(".vw i").forEach((b, n) => b.classList.toggle("d", n < k)); };
  const vReset = (el) => { if (!el) return; el.classList.remove("on"); el.querySelector(".vp").innerHTML = PLAY; paintBars(el, 0); el.querySelector(".vt").textContent = fmtT(el.dataset.dur); };
  const vStart = (el) => {
    if (vAud) vAud.pause();
    vReset(vEl);
    vAud = new Audio(el.dataset.src);
    vAud.preload = "auto";
    vEl = el;
    const total = () => (vAud.duration && isFinite(vAud.duration) ? vAud.duration : +el.dataset.dur || 1);
    vAud.ontimeupdate = () => { if (el.classList.contains("scrub")) return; paintBars(el, Math.min(1, vAud.currentTime / total())); el.querySelector(".vt").textContent = fmtT(vAud.currentTime); };
    vAud.onended = () => { vReset(el); vEl = null; };
    vAud.onerror = () => { vReset(el); vEl = null; fail(new Error("This device cannot play that voice note.")); };
  };
  const seekTo = (el, ratio) => {
    const known = vEl === el && vAud && vAud.duration && isFinite(vAud.duration) ? vAud.duration : +el.dataset.dur || 0;
    if (!known) return;
    if (vEl !== el || !vAud) vStart(el);
    const go = () => { try { vAud.currentTime = ratio * known; } catch (z) {} };
    if (vAud.readyState >= 1) go(); else vAud.addEventListener("loadedmetadata", go, { once: true });
    paintBars(el, ratio);
    el.querySelector(".vt").textContent = fmtT(ratio * known);
  };
  let vd = null;
  M.addEventListener("pointerdown", (e) => {
    const w = e.target.closest && e.target.closest(".vw");
    if (!w || (e.pointerType === "mouse" && e.button)) return;
    const el = w.closest(".vn");
    vd = { el, w, id: e.pointerId };
    try { w.setPointerCapture(e.pointerId); } catch (z) {}
    el.classList.add("scrub");
    const r = w.getBoundingClientRect();
    seekTo(el, Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
  });
  M.addEventListener("pointermove", (e) => {
    if (!vd || e.pointerId !== vd.id) return;
    const r = vd.w.getBoundingClientRect();
    seekTo(vd.el, Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
  });
  const vdEnd = (e) => { if (!vd || e.pointerId !== vd.id) return; vd.el.classList.remove("scrub"); vd = null; };
  M.addEventListener("pointerup", vdEnd);
  M.addEventListener("pointercancel", vdEnd);
  M.addEventListener("click", (e) => {
    const w = e.target.closest && e.target.closest(".vw");
    const b = e.target.closest && e.target.closest(".vp");
    if (!b && !w) return;
    e.stopImmediatePropagation();
    if (w && !b) return; /* the pointer handlers above already jumped to the spot */
    const el = b.closest(".vn");
    if (vEl === el && vAud && !vAud.paused) { vAud.pause(); el.classList.remove("on"); b.innerHTML = PLAY; return; }
    if (vEl !== el) vStart(el);
    el.classList.add("on");
    b.innerHTML = PAUSE;
    vAud.play().catch(() => { vReset(el); vEl = null; fail(new Error("Could not play the voice note.")); });
  }, true);

  /* ---- record a voice note: tap the mic, talk, stop, listen, then send (or bin it) ---- */
  let rec, chunks, t0, tick, rt, lvl, actx, cancelled = false;
  const mic = document.getElementById("mic");
  const pickType = () => {
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return "";
    return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported(t)) || "";
  };
  const STOPI = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2.5"/></svg>';
  const peaksOf = (levels, n) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = Math.floor((i * levels.length) / n), b = Math.max(a + 1, Math.floor(((i + 1) * levels.length) / n));
      let m = 0;
      for (let k = a; k < b && k < levels.length; k++) m = Math.max(m, levels[k]);
      out.push(levels.length ? m : 0.3 + Math.random() * 0.5);
    }
    const top = Math.max(0.08, ...out);
    return out.map((v) => Math.max(0.14, Math.min(1, v / top)));
  };
  const barsHtml = (arr) => arr.map((v) => '<i style="height:' + Math.round(14 + v * 86) + '%"></i>').join("");
  const openPreview = (blob, file, secs, levels) => {
    const url = URL.createObjectURL(blob), peaks = peaksOf(levels, NB);
    const el = mkStage("st-voice", `<button type=button class="st-x" aria-label="Delete voice note">${TRASH}</button><button type=button class="vp st-play" aria-label="Play your recording">${PLAY}</button><span class="vw st-w" role=presentation>${barsHtml(peaks)}</span><small class=vt>${fmtT(secs)}</small><button type=button class="btn sm send st-send" aria-label="Send voice note">${SENDI}</button>`);
    const aud = new Audio(url), w = el.querySelector(".vw"), bt = el.querySelector(".st-play"), vt = el.querySelector(".vt");
    aud.preload = "auto";
    const total = () => (aud.duration && isFinite(aud.duration) ? aud.duration : secs);
    const paint = (r) => { const k = Math.round(r * NB); w.querySelectorAll("i").forEach((b, n) => b.classList.toggle("d", n < k)); };
    let drag = false;
    aud.ontimeupdate = () => { if (drag) return; paint(Math.min(1, aud.currentTime / total())); vt.textContent = fmtT(aud.currentTime); };
    aud.onended = () => { bt.innerHTML = PLAY; paint(0); vt.textContent = fmtT(secs); };
    bt.onclick = () => { if (aud.paused) { aud.play().then(() => { bt.innerHTML = PAUSE; }).catch(() => fail(new Error("Could not play the recording."))); } else { aud.pause(); bt.innerHTML = PLAY; } };
    const at = (e) => { const r = w.getBoundingClientRect(), k = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); paint(k); vt.textContent = fmtT(k * total()); try { aud.currentTime = k * total(); } catch (z) {} };
    w.addEventListener("pointerdown", (e) => { drag = true; try { w.setPointerCapture(e.pointerId); } catch (z) {} at(e); });
    w.addEventListener("pointermove", (e) => { if (drag) at(e); });
    w.addEventListener("pointerup", () => { drag = false; });
    w.addEventListener("pointercancel", () => { drag = false; });
    stage.dispose = () => { aud.pause(); URL.revokeObjectURL(url); };
    el.querySelector(".st-x").onclick = closeStage;
    el.querySelector(".st-send").onclick = async () => { aud.pause(); busyBtns(el, true); const ok = await upload(file, "voice", secs); if (ok) closeStage(); else busyBtns(el, false); };
  };
  const stopLive = () => { clearTimeout(tick); clearInterval(rt); clearInterval(lvl); if (actx) { try { actx.close(); } catch (z) {} actx = null; } };
  mic.onclick = async () => {
    if (rec && rec.state === "recording") return rec.stop();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return fail(new Error("Voice notes need a secure (https) page and a browser that can use the microphone."));
    if (!window.MediaRecorder) return fail(new Error("This browser cannot record voice notes. Update it, or try Chrome or Safari."));
    let s;
    try { s = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch (e) { return fail(new Error(e && e.name === "NotFoundError" ? "No microphone found on this device." : "Allow the microphone to send voice notes.")); }
    try {
      const type = pickType();
      rec = type ? new MediaRecorder(s, { mimeType: type }) : new MediaRecorder(s);
      chunks = [];
      cancelled = false;
      const levels = [];
      t0 = Date.now();
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      const el = mkStage("st-voice st-rec", `<button type=button class="st-x" aria-label="Cancel recording">${TRASH}</button><span class=st-dot aria-hidden=true></span><b class=st-time>0:00</b><span class="st-live" role=presentation>${barsHtml(new Array(34).fill(0.1))}</span><button type=button class="btn sm send st-stop" aria-label="Stop recording">${STOPI}</button>`);
      stage.dispose = () => { if (rec && rec.state === "recording") { cancelled = true; rec.stop(); } };
      el.querySelector(".st-x").onclick = closeStage;
      el.querySelector(".st-stop").onclick = () => rec && rec.state === "recording" && rec.stop();
      const live = el.querySelector(".st-live"), tm = el.querySelector(".st-time"), AC = window.AudioContext || window.webkitAudioContext;
      let an = null, buf = null;
      try { if (AC) { actx = new AC(); an = actx.createAnalyser(); an.fftSize = 256; actx.createMediaStreamSource(s).connect(an); buf = new Uint8Array(an.fftSize); } } catch (z) { an = null; }
      lvl = setInterval(() => {
        let v = 0.15 + Math.random() * 0.2;
        if (an) { an.getByteTimeDomainData(buf); let m = 0; for (let i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i] - 128)); v = Math.min(1, (m / 128) * 2.2); }
        levels.push(v);
        const shown = levels.slice(-34); while (shown.length < 34) shown.unshift(0.08);
        live.innerHTML = barsHtml(shown);
      }, 90);
      rt = setInterval(() => { tm.textContent = fmtT((Date.now() - t0) / 1000); }, 300);
      rec.onstop = () => {
        s.getTracks().forEach((t) => t.stop());
        stopLive();
        mic.classList.remove("rec");
        mic.setAttribute("aria-label", "Record a voice note");
        if (cancelled) return;
        const secs = Math.round((Date.now() - t0) / 1000);
        const base = (rec.mimeType || type || "audio/webm").split(";")[0];
        const blob = new Blob(chunks, { type: base });
        closeStage();
        if (!blob.size) return fail(new Error("Nothing was recorded. Try again."));
        if (secs < 1) return tell("Too short. Talk a little longer.", "info");
        openPreview(blob, new File([blob], "voice." + (base.indexOf("mp4") > -1 ? "m4a" : base.indexOf("ogg") > -1 ? "ogg" : "webm"), { type: base }), secs, levels);
      };
      rec.start();
      mic.classList.add("rec");
      mic.setAttribute("aria-label", "Stop recording");
      tick = setTimeout(() => rec && rec.state === "recording" && rec.stop(), 600000);
    } catch (e) {
      s.getTracks().forEach((t) => t.stop());
      stopLive();
      closeStage();
      fail(new Error("Could not start recording (" + ((e && e.name) || "error") + ")."));
    }
  };
})();
