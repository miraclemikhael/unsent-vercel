/* Unsent · js/call.js · 1-to-1 calls: voice, video, screen share (WebRTC + PHP polling). Loaded in order by includes/footer.php (core.js first). */
/* global CSRF, Swal */
(() => {
  if (!document.getElementById("call")) return;
  const W = document.getElementById("msgs")?.dataset.with;
  const NAME = document.querySelector(".me b")?.firstChild?.textContent?.trim() || "Someone";
  let ICE = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
  let pc, peer, cid, polite, making = false, ignore = false, local, cam, sender, ring, after = "";
  let t0 = 0, tmr = 0, wake = null, sharing = false, dc = null, hideT = 0, hintT = 0;
  const el = (id) => document.getElementById(id);
  const root = el("call");
  /* move call screen + ring card out of <main>, so no parent can trap them under the top bar and tab bar */
  document.body.append(root, el("ring"));
  const api = (f, a, body, qs = "") =>
    fetch(`index.php?api=${f}&a=${a}${qs}`, { method: body ? "POST" : "GET", body, headers: { "X-CSRF": CSRF() }, credentials: "same-origin" }).then((r) => r.json());
  const fd = (o) => {
    const f = new FormData();
    for (const k in o) f.append(k, o[k]);
    return f;
  };
  const tell = (m) => (window.Swal ? Swal.fire({ icon: "info", title: m, confirmButtonText: "OK" }) : alert(m));
  /* ----- watching someone's shared screen (usually a desktop 16:9 screen on a portrait phone) -----
     The sharer tells us over a tiny WebRTC data channel ("meta"). While they share we show the WHOLE screen (object-fit: contain),
     hide the controls after a few seconds, and allow pinch / double-tap zoom, full screen and landscape. */
  const Z = { s: 1, x: 0, y: 0 };
  const rv = () => el("rv");
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  const meta = (o) => { try { if (dc && dc.readyState === "open") dc.send(JSON.stringify(o)); } catch (e) { /* channel closed */ } };
  const clampZ = () => {
    const v = rv(), cw = root.clientWidth, ch = root.clientHeight, vw = v.videoWidth || cw, vh = v.videoHeight || ch;
    const fit = Math.min(cw / vw, ch / vh), mx = Math.max(0, (vw * fit * Z.s - cw) / 2), my = Math.max(0, (vh * fit * Z.s - ch) / 2);
    Z.s = Math.min(5, Math.max(1, Z.s));
    Z.x = Math.min(mx, Math.max(-mx, Z.x));
    Z.y = Math.min(my, Math.max(-my, Z.y));
    v.style.transform = Z.s === 1 ? "" : `translate(${Z.x}px,${Z.y}px) scale(${Z.s})`;
  };
  const zoomAt = (ns, fx, fy) => { /* fx, fy: focus point, relative to the screen centre */
    ns = Math.min(5, Math.max(1, ns));
    const k = ns / Z.s;
    Z.x = fx - (fx - Z.x) * k;
    Z.y = fy - (fy - Z.y) * k;
    Z.s = ns;
    clampZ();
  };
  const zoomReset = () => { Z.s = 1; Z.x = Z.y = 0; clampZ(); };
  const wakeUI = () => {
    root.classList.remove("ui-off");
    clearTimeout(hideT);
    if (root.classList.contains("is-share")) hideT = setTimeout(() => root.classList.add("ui-off"), 4000);
  };
  const remoteShare = (on) => {
    on = !!on;
    if (root.classList.contains("is-share") === on) return;
    root.classList.toggle("is-share", on);
    el("kF").hidden = !on;
    zoomReset();
    clearTimeout(hintT);
    const portrait = matchMedia("(orientation: portrait)").matches && innerWidth < 900;
    el("chint").hidden = !(on && portrait);
    if (on && portrait) hintT = setTimeout(() => { el("chint").hidden = true; }, 7000);
    if (on) wakeUI(); else { clearTimeout(hideT); root.classList.remove("ui-off"); }
  };
  addEventListener("orientationchange", () => { el("chint").hidden = true; setTimeout(clampZ, 300); });
  addEventListener("resize", () => { if (!root.classList.contains("is-share")) return; clampZ(); if (innerWidth > innerHeight) el("chint").hidden = true; });
  rv().addEventListener("resize", clampZ);
  /* touch: one finger pans (when zoomed), two fingers pinch, double tap zooms, single tap shows / hides the buttons */
  (() => {
    const P = new Map();
    let d0 = 0, s0 = 1, moved = 0, lastTap = 0, downAt = 0;
    const rel = (e) => { const b = root.getBoundingClientRect(); return [e.clientX - b.left - b.width / 2, e.clientY - b.top - b.height / 2]; };
    const mine = (e) => root.classList.contains("is-share") && !e.target.closest("button, .ctl, .call-top, #lv, .call-hint");
    root.addEventListener("pointerdown", (e) => {
      if (!mine(e)) return;
      P.set(e.pointerId, [e.clientX, e.clientY]);
      root.setPointerCapture?.(e.pointerId);
      moved = 0;
      downAt = Date.now();
      if (P.size === 2) { const [a, b] = [...P.values()]; d0 = Math.hypot(a[0] - b[0], a[1] - b[1]); s0 = Z.s; }
    });
    root.addEventListener("pointermove", (e) => {
      if (!P.has(e.pointerId)) return;
      const old = P.get(e.pointerId);
      P.set(e.pointerId, [e.clientX, e.clientY]);
      moved += Math.abs(e.clientX - old[0]) + Math.abs(e.clientY - old[1]);
      if (P.size === 2) {
        const [a, b] = [...P.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        const r = root.getBoundingClientRect();
        if (d0) zoomAt(s0 * (d / d0), (a[0] + b[0]) / 2 - r.left - r.width / 2, (a[1] + b[1]) / 2 - r.top - r.height / 2);
      } else if (Z.s > 1) { Z.x += e.clientX - old[0]; Z.y += e.clientY - old[1]; clampZ(); }
    });
    const up = (e) => {
      if (!P.has(e.pointerId)) return;
      P.delete(e.pointerId);
      if (P.size || moved > 10 || Date.now() - downAt > 350) return;
      const now = Date.now();
      if (now - lastTap < 300) { const [fx, fy] = rel(e); Z.s > 1 ? zoomReset() : zoomAt(2.5, fx, fy); lastTap = 0; }
      else { lastTap = now; root.classList.contains("ui-off") ? wakeUI() : (clearTimeout(hideT), root.classList.add("ui-off")); }
    };
    root.addEventListener("pointerup", up);
    root.addEventListener("pointercancel", (e) => P.delete(e.pointerId));
    root.addEventListener("wheel", (e) => { if (!mine(e)) return; e.preventDefault(); const [fx, fy] = rel(e); zoomAt(Z.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15), fx, fy); }, { passive: false });
    root.addEventListener("mousemove", () => root.classList.contains("is-share") && root.classList.contains("ui-off") && wakeUI());
  })();
  el("kF").onclick = async () => {
    try {
      if (fsEl()) { await (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      const req = root.requestFullscreen || root.webkitRequestFullscreen;
      if (req) { await req.call(root); try { await screen.orientation?.lock?.("landscape"); } catch (e) { /* needs Android + full screen */ } }
      else if (rv().webkitEnterFullscreen) rv().webkitEnterFullscreen(); /* iPhone: native full screen player */
    } catch (e) { /* refused */ }
  };
  const fsChange = () => {
    const on = !!fsEl();
    el("kF").classList.toggle("off", on);
    el("kF").setAttribute("aria-pressed", String(on));
    el("kF").setAttribute("aria-label", on ? "Exit full screen" : "Full screen");
    el("kF").lastElementChild.textContent = on ? "Exit" : "Full";
    if (!on) try { screen.orientation?.unlock?.(); } catch (e) { /* ignore */ }
    setTimeout(clampZ, 200);
  };
  document.addEventListener("fullscreenchange", fsChange);
  document.addEventListener("webkitfullscreenchange", fsChange);

  /* ----- screen helpers: who, state, timer, wake lock ----- */
  const initial = (n) => ((n || "?").trim()[0] || "?").toUpperCase();
  const safePath = (u) => (typeof u === "string" && /^(?!\/\/)[\w\-./]+$/.test(u) ? u : "");
  const myAvatar = () => safePath((document.querySelector(".me .av.has")?.style.backgroundImage || "").replace(/^url\(["']?|["']?\)$/g, ""));
  const faceOf = (node, name, path) => {
    node.textContent = initial(name);
    node.style.backgroundImage = "";
    node.classList.remove("has");
    if (path) { node.style.backgroundImage = `url("${path}")`; node.classList.add("has"); node.textContent = ""; }
  };
  const setPeer = (name, path) => {
    el("cnm").textContent = el("cnm2").textContent = name || "Someone";
    faceOf(el("cav"), name, path);
  };
  const setState = (s) => {
    root.dataset.state = s;
    el("cmsg").textContent = s === "live" ? clock() : s === "connecting" ? "Connecting…" : "Calling…";
  };
  const clock = () => {
    const s = Math.floor((Date.now() - t0) / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = String(s % 60).padStart(2, "0");
    return h ? `${h}:${String(m).padStart(2, "0")}:${x}` : `${m}:${x}`;
  };
  const live = () => {
    if (tmr) return;
    t0 = Date.now();
    setState("live");
    tmr = setInterval(() => { el("cmsg").textContent = el("ctm").textContent = clock(); }, 1000);
    el("ctm").textContent = clock();
  };
  const show = async (on) => {
    root.hidden = !on;
    document.documentElement.classList.toggle("in-call", on);
    if (on) window.mount3d?.(root.querySelector("[data-3d]"));
    try { if (on) wake = (await navigator.wakeLock?.request("screen")) || null; else { await wake?.release(); wake = null; } } catch (e) { /* not supported */ }
  };
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !root.hidden && !wake) navigator.wakeLock?.request("screen").then((w) => (wake = w)).catch(() => {}); });
  if (!navigator.mediaDevices?.getDisplayMedia) el("kS").hidden = true; /* phones: no screen sharing */
  api("call", "ice").then((r) => r.ice && (ICE = r.ice)).catch(() => {});
  const sig = (type, payload = null, to = peer, c = cid) => api("call", "send", fd({ to, cid: c, type, payload: JSON.stringify(payload) })).catch(() => {});

  async function media(video) {
    if (!navigator.mediaDevices) throw new Error("no media");
    local = await navigator.mediaDevices.getUserMedia({ audio: true, video: video ? { facingMode: "user" } : false });
    cam = local.getVideoTracks()[0] || null;
    el("lv").srcObject = local;
    el("lv").hidden = !video;
    el("lv").classList.add("mirror");
    el("kC").classList.toggle("off", !video);
    el("kC").setAttribute("aria-pressed", String(!!video));
  }
  function build() {
    pc = new RTCPeerConnection(ICE);
    ignore = false;
    local.getTracks().forEach((t) => { const s = pc.addTrack(t, local); if (t.kind === "video") sender = s; });
    pc.ontrack = (e) => {
      el("rv").srcObject = e.streams[0];
      if (e.track.kind !== "video") return;
      const t = e.track, upd = () => root.classList.toggle("has-video", !t.muted && t.readyState === "live");
      t.onmute = t.onunmute = t.onended = upd;
      upd();
    };
    dc = pc.createDataChannel("meta", { negotiated: true, id: 1 }); /* tells the other side "I am sharing my screen" */
    dc.onopen = () => meta({ share: sharing });
    dc.onmessage = (e) => { try { const m = JSON.parse(e.data); if ("share" in m) remoteShare(m.share); } catch (x) { /* ignore */ } };
    pc.onicecandidate = (e) => e.candidate && sig("ice", e.candidate);
    pc.onnegotiationneeded = async () => {
      try { making = true; await pc.setLocalDescription(); sig("desc", pc.localDescription); } finally { making = false; }
    };
    pc.onconnectionstatechange = () => {
      if (!pc) return;
      if (pc.connectionState === "connected") live();
      else if (["failed", "closed"].includes(pc.connectionState)) stop(false);
    };
    setState("connecting");
    show(true);
  }
  function stop(notify = true) {
    if (notify && cid) sig("end");
    if (pc) pc.close();
    if (local) local.getTracks().forEach((t) => t.stop());
    pc = local = cam = sender = cid = peer = dc = null;
    remoteShare(false);
    el("kF").hidden = true;
    if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    clearInterval(tmr);
    tmr = 0;
    sharing = false;
    ring = null;
    el("ring").hidden = true;
    el("rv").srcObject = null;
    el("lv").srcObject = null;
    el("lv").hidden = true;
    root.classList.remove("has-video");
    ["kM", "kS"].forEach((k) => el(k).classList.remove("off", "on"));
    el("kM").setAttribute("aria-pressed", "false");
    el("kM").lastElementChild.textContent = "Mute";
    el("ctm").textContent = "0:00";
    setState("calling");
    show(false);
  }
  async function start(video) {
    if (pc || cid || !W) return;
    try { await media(video); } catch (e) { return tell("Allow the microphone" + (video ? " and camera" : "") + " to call. Calls need HTTPS (localhost is fine)."); }
    peer = W;
    cid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    polite = false;
    const them = document.querySelector(".ch b")?.textContent?.trim() || "Someone";
    const themAv = safePath((document.querySelector(".ch .av.has")?.style.backgroundImage || "").replace(/^url\(["']?|["']?\)$/g, ""));
    setPeer(them, themAv);
    setState("calling");
    show(true);
    sig("ring", { name: NAME, video, av: myAvatar() });
    setTimeout(() => { if (cid && !pc) { tell("No answer."); stop(true); } }, 45000);
  }
  async function onSig(s) {
    const p = JSON.parse(s.payload || "null");
    if (s.type === "ring") {
      if (pc || cid || ring) return sig("decline", null, s.from_id, s.call_id);
      ring = { ...s, p };
      el("rn").textContent = p.name;
      faceOf(el("rav"), p.name, safePath(p.av));
      el("rk").textContent = p.video ? "Unsent video call" : "Unsent voice call";
      el("ring").hidden = false;
      return;
    }
    if (s.call_id !== cid) {
      if (ring && s.call_id === ring.call_id && ["end", "decline"].includes(s.type)) { ring = null; el("ring").hidden = true; }
      return;
    }
    if (s.type === "accept") build();
    else if (s.type === "decline" || s.type === "end") stop(false);
    else if (s.type === "desc" && pc) {
      const collide = p.type === "offer" && (making || pc.signalingState !== "stable");
      ignore = !polite && collide;
      if (ignore) return;
      await pc.setRemoteDescription(p);
      if (p.type === "offer") { await pc.setLocalDescription(); sig("desc", pc.localDescription); }
    } else if (s.type === "ice" && pc) {
      try { await pc.addIceCandidate(p); } catch (e) { if (!ignore) console.warn(e); }
    }
  }
  async function tick() {
    try {
      const r = await api("call", "poll", null, `&after=${after}`);
      if (r.ok) { after = r.last; for (const s of r.sigs) await onSig(s); }
    } catch (e) { /* offline */ }
  }
  api("call", "poll", null, "&after=").then((r) => { after = r.last; setInterval(tick, 1000); }).catch(() => {});

  el("ryes").onclick = async () => {
    const r = ring;
    ring = null;
    el("ring").hidden = true;
    try { await media(r.p.video); } catch (e) { return sig("decline", null, r.from_id, r.call_id); }
    peer = r.from_id;
    cid = r.call_id;
    polite = true;
    setPeer(r.p.name, safePath(r.p.av));
    build();
    sig("accept");
  };
  el("rno").onclick = () => { sig("decline", null, ring.from_id, ring.call_id); ring = null; el("ring").hidden = true; };
  if (el("cA")) { el("cA").onclick = () => start(false); el("cV").onclick = () => start(true); }
  el("kE").onclick = () => stop(true);
  el("kM").onclick = (e) => {
    const t = local && local.getAudioTracks()[0];
    if (t) {
      t.enabled = !t.enabled;
      e.currentTarget.classList.toggle("off", !t.enabled);
      e.currentTarget.setAttribute("aria-pressed", String(!t.enabled));
      e.currentTarget.lastElementChild.textContent = t.enabled ? "Mute" : "Unmute";
    }
  };
  el("kC").onclick = async (e) => {
    const b = e.currentTarget;
    if (cam) { cam.enabled = !cam.enabled; b.classList.toggle("off", !cam.enabled); b.setAttribute("aria-pressed", String(cam.enabled)); return; }
    if (!pc || !local) return;
    try { /* voice call: turn the camera on now */
      const v = (await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })).getVideoTracks()[0];
      cam = v;
      local.addTrack(v);
      sender = pc.addTrack(v, local);
      el("lv").srcObject = local;
      el("lv").hidden = false;
      b.classList.remove("off");
      b.setAttribute("aria-pressed", "true");
    } catch (x) { tell("Allow the camera to turn it on."); }
  };
  el("kS").onclick = async (e) => {
    if (!pc) return;
    if (e.currentTarget.classList.contains("on")) return endShare();
    try {
      const scr = (await navigator.mediaDevices.getDisplayMedia({ video: true })).getVideoTracks()[0];
      if (sender) await sender.replaceTrack(scr);
      else sender = pc.addTrack(scr, local);
      el("lv").srcObject = new MediaStream([scr]);
      el("lv").hidden = false;
      el("lv").classList.remove("mirror");
      sharing = true;
      meta({ share: true });
      e.currentTarget.classList.add("on");
      scr.onended = endShare;
    } catch (x) { /* cancelled */ }
  };
  async function endShare() {
    if (sender) await sender.replaceTrack(cam).catch(() => {});
    el("lv").srcObject = local;
    el("lv").hidden = !cam;
    el("lv").classList.add("mirror");
    sharing = false;
    meta({ share: false });
    el("kS").classList.remove("on");
  }
})();
