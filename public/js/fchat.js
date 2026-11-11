/* Unsent · js/chat.js · Friends page: add friends, text, pictures, voice notes. Loaded in order by includes/footer.php (core.js first). */
/* global CSRF, Swal */
(() => {
  const root = document.querySelector(".fgrid");
  if (!root) return;
  const api = (f, a, body, qs = "") =>
    fetch(`index.php?api=${f}&a=${a}${qs}`, { method: body ? "POST" : "GET", body, headers: { "X-CSRF": CSRF() }, credentials: "same-origin" }).then(async (r) => {
      const t = await r.text();
      try { return JSON.parse(t); } catch (x) { throw new Error("Server said (" + r.status + "): " + (t.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300) || "empty reply")); }
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
  /* Accept / decline: one listener on the whole page (capture), so nothing on top can swallow the tap */
  document.addEventListener("click", async (ev) => {
    const b = ev.target && ev.target.closest ? ev.target.closest("[data-accept],[data-decline]") : null;
    if (!b || b.disabled) return;
    ev.preventDefault(); ev.stopPropagation();
    const ok = b.hasAttribute("data-accept"), id = ok ? b.dataset.accept : b.dataset.decline, old = b.innerHTML;
    b.disabled = true; if (ok) b.textContent = "Saving...";
    try {
      const r = await api("chat", ok ? "accept" : "decline", fd({ id }));
      if (r && r.ok === 0) throw new Error(r.err || "Could not do that.");
      location.reload();
    } catch (e) { b.disabled = false; b.innerHTML = old; fail(e); }
  }, true);

  const M = document.getElementById("msgs");
  if (!M) return;
  const W = M.dataset.with;
  let last = 0, day = "", busy = false, since = 0, editing = 0, fails = 0;
  const msgs = {}; /* id -> {m, got} so the 15-minute window can be checked on every tap */
  const left = (id) => { const r = msgs[id]; return r ? r.m.left - (Date.now() - r.got) / 1000 : 0; };
  const inner = (m) =>
    m.deleted
      ? `<p class=gone>This message was deleted</p>`
      : m.kind === "image"
        ? `<a href="${esc(m.url)}" target=_blank rel=noopener><img src="${esc(m.url)}" alt="Picture from chat" loading=lazy></a>`
        : m.kind === "voice"
          ? `<audio controls preload=metadata src="${esc(m.url)}" aria-label="Voice note"></audio>`
          : `<p>${esc(m.body).replace(/\n/g, "<br>")}</p>`;
  const OPT = `<button type=button class=bm aria-label="Message options" title="Edit or delete"><svg width=14 height=14 viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=2.5 stroke-linecap=round stroke-linejoin=round><path d="m6 9 6 6 6-6"/></svg></button>`;
  const html = (m) => `${inner(m)}<time>${m.edited && !m.deleted ? "edited · " : ""}${esc(m.hm)}</time>${m.mine && !m.deleted && m.left > 0 ? OPT : ""}`;
  const cls = (m) => `bub ${m.mine ? "mine" : "them"}${m.kind === "text" || m.deleted ? "" : " media"}${m.deleted ? " del" : ""}`;
  const bubble = (m) => {
    if (m.day !== day) {
      day = m.day;
      M.insertAdjacentHTML("beforeend", `<div class=day>${esc(day)}</div>`);
    }
    msgs[m.id] = { m, got: Date.now() };
    M.insertAdjacentHTML("beforeend", `<div class="${cls(m)}" data-id=${m.id}>${html(m)}</div>`);
  };
  const refresh = (m) => {
    const el = M.querySelector(`.bub[data-id="${m.id}"]`);
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
      fails = 0;
    } catch (e) { if (++fails === 3) tell("Cannot reach the server. Check your connection.", "error"); }
    busy = false;
  };
  poll();
  setInterval(poll, 2000);
  document.addEventListener("visibilitychange", poll);

  /* ---- edit / delete your own message in the first 15 minutes (tap it) ---- */
  const closeMenu = () => document.querySelector(".bmenu")?.remove();
  const stopEdit = () => { editing = 0; document.querySelector(".editbar")?.remove(); ct.value = ""; ct.style.height = ""; };
  const startEdit = (id) => {
    closeMenu();
    editing = id;
    document.querySelector(".editbar")?.remove();
    const bar = document.createElement("div");
    bar.className = "editbar";
    bar.innerHTML = `<span><b>Editing message</b><small>${esc(msgs[id].m.body).slice(0, 80)}</small></span><button type=button class=ib aria-label="Cancel editing">✕</button>`;
    bar.querySelector("button").onclick = stopEdit;
    document.getElementById("cf").before(bar);
    ct.value = msgs[id].m.body;
    ct.oninput();
    ct.focus();
  };
  const del = async (id) => {
    closeMenu();
    const ok = window.Swal ? (await Swal.fire({ title: "Delete for everyone?", text: "This message will be removed for both of you.", icon: "warning", showCancelButton: true, confirmButtonText: "Delete", cancelButtonText: "Keep" })).isConfirmed : confirm("Delete this message for everyone?");
    if (!ok) return;
    const r = await api("chat", "delete", fd({ with: W, id })).catch(() => ({}));
    if (!r.ok) tell(r.err || "Could not delete.", "error");
    busy = false;
    poll();
  };
  let hinted = 0;
  M.addEventListener("click", (e) => {
    const bm = e.target.closest(".bm");
    const b = e.target.closest(".bub.mine");
    closeMenu();
    if (!b || b.classList.contains("del")) return;
    if (!bm && (e.target.closest("a,audio") || b.classList.contains("media"))) return;
    const id = +b.dataset.id, secs = left(id);
    if (secs <= 0) {
      b.querySelector(".bm")?.remove();
      if (Date.now() - hinted > 4000) { hinted = Date.now(); tell("Messages can only be edited or deleted in the first 15 minutes.", "info"); }
      return;
    }
    const m = msgs[id].m, mn = Math.max(1, Math.ceil(secs / 60));
    const menu = document.createElement("div");
    menu.className = "bmenu";
    menu.innerHTML = `${m.kind === "text" ? "<button type=button data-a=edit>Edit</button>" : ""}<button type=button data-a=del class=danger>Delete</button><small>${mn} min left to change</small>`;
    document.body.appendChild(menu);
    const r = b.getBoundingClientRect(), w = menu.offsetWidth;
    menu.style.top = Math.max(8, Math.min(innerHeight - menu.offsetHeight - 8, r.top - menu.offsetHeight - 6 < 8 ? r.bottom + 6 : r.top - menu.offsetHeight - 6)) + "px";
    menu.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + "px";
    menu.onclick = (ev) => { const a = ev.target.dataset.a; if (a === "edit") startEdit(id); else if (a === "del") del(id); };
    e.stopPropagation();
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".bmenu, .bub.mine")) closeMenu(); });
  /* the little arrow disappears when the 15 minutes are over */
  setInterval(() => M.querySelectorAll(".bub.mine .bm").forEach((x) => left(+x.parentNode.dataset.id) <= 0 && x.remove()), 15000);
  M.addEventListener("scroll", closeMenu, { passive: true });

  const ct = document.getElementById("ct");
  const send = async () => {
    const t = ct.value.trim();
    if (!t) return;
    if (editing) {
      const id = editing;
      stopEdit();
      const r = await api("chat", "edit", fd({ with: W, id, text: t })).catch(() => ({}));
      if (!r.ok) tell(r.err || "Could not edit.", "error");
      poll();
      return;
    }
    ct.value = "";
    ct.style.height = "";
    try {
      const r = await api("chat", "send", fd({ with: W, text: t }));
      if (!r || !r.ok) throw new Error((r && r.err) || "Message not sent.");
    } catch (e) { ct.value = t; fail(e); return; }
    busy = false;
    poll();
  };
  document.getElementById("cf").onsubmit = (e) => { e.preventDefault(); send(); };
  ct.onkeydown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !matchMedia("(pointer:coarse)").matches) { e.preventDefault(); send(); }
    if (e.key === "Escape" && editing) stopEdit();
  };
  ct.oninput = () => { ct.style.height = "auto"; ct.style.height = Math.min(ct.scrollHeight, 120) + "px"; };

  const upload = async (file, kind, dur = 0) => {
    const r = await api("chat", "upload", fd({ with: W, kind, dur, file })).catch(() => ({ err: "Upload failed." }));
    if (!r.ok) tell(r.err || "Upload failed.", "error");
    poll();
  };
  const pf = document.getElementById("pf");
  document.getElementById("pb").onclick = () => pf.click();
  pf.onchange = (e) => { if (e.target.files[0]) upload(e.target.files[0], "image"); e.target.value = ""; };

  let rec, chunks, t0, tick;
  const mic = document.getElementById("mic");
  mic.onclick = async () => {
    if (rec && rec.state === "recording") return rec.stop();
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      rec = new MediaRecorder(s);
      chunks = [];
      t0 = Date.now();
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        s.getTracks().forEach((t) => t.stop());
        clearInterval(tick);
        mic.classList.remove("rec");
        mic.setAttribute("aria-label", "Record a voice note");
        upload(new Blob(chunks, { type: rec.mimeType }), "voice", Math.round((Date.now() - t0) / 1000));
      };
      rec.start();
      mic.classList.add("rec");
      mic.setAttribute("aria-label", "Stop and send voice note");
      tick = setTimeout(() => rec && rec.state === "recording" && rec.stop(), 600000);
    } catch (e) {
      tell("Allow the microphone to send voice notes.", "error");
    }
  };
})();
