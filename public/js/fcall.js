/* Unsent · js/call.js · 1-to-1 calls: voice, video, screen share (WebRTC + PHP polling). Loaded in order by includes/footer.php (core.js first). */
/* global CSRF, Swal */
(() => {
  if (!document.getElementById("call")) return;
  const W = document.getElementById("msgs")?.dataset.with;
  const NAME = document.querySelector(".me b")?.firstChild?.textContent?.trim() || "Someone";
  let ICE = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
  let pc, peer, cid, polite, making = false, ignore = false, local, cam, sender, ring, ringT, after = "";
  let t0 = 0, tmr = 0, wake = null, sharing = false, polling = false, connT = 0, dropT = 0, restarted = false;
  const seen = new Set(); /* signal ids already handled (the server may send the last few seconds again) */
  const early = []; /* offer / candidates that arrived before the call screen was built */
  let pendIce = []; /* candidates that arrived before the other side's offer / answer was applied */
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
    el("rv").play?.().catch(() => {});
  };
  const show = async (on) => {
    root.hidden = !on;
    document.documentElement.classList.toggle("in-call", on);
    if (on) window.mount3d?.(root.querySelector("[data-3d]"));
    try { if (on) wake = (await navigator.wakeLock?.request("screen")) || null; else { await wake?.release(); wake = null; } } catch (e) { /* not supported */ }
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    tick(); /* coming back from the notification: look for the call right now */
    if (!root.hidden && !wake) navigator.wakeLock?.request("screen").then((w) => (wake = w)).catch(() => {});
  });
  if (!navigator.mediaDevices?.getDisplayMedia) el("kS").hidden = true; /* phones: no screen sharing */
  api("call", "ice").then((r) => r.ice && (ICE = r.ice)).catch(() => {});
  const sig = (type, payload = null, to = peer, c = cid) => (to && c ? api("call", "send", fd({ to, cid: c, type, payload: JSON.stringify(payload) })).catch(() => {}) : Promise.resolve());

  async function media(video) {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("no media");
    local = await navigator.mediaDevices.getUserMedia({ audio: true, video: video ? { facingMode: "user" } : false });
    cam = local.getVideoTracks()[0] || null;
    el("lv").srcObject = local;
    el("lv").hidden = !video;
    el("lv").classList.add("mirror");
    el("kC").classList.toggle("off", !video);
    el("kC").setAttribute("aria-pressed", String(!!video));
  }
  const failMsg = "The call could not connect. One of you may be on a network that blocks calls. Try Wi-Fi on both phones, then call again.";
  const giveUp = () => { if (!pc) return; tell(failMsg); stop(true); };
  function onState() {
    if (!pc) return;
    const c = pc.connectionState, i = pc.iceConnectionState;
    if (c === "connected" || i === "connected" || i === "completed") { clearTimeout(connT); clearTimeout(dropT); live(); return; }
    if (c === "closed" || i === "closed") return stop(false);
    if (c === "failed" || i === "failed") {
      if (!polite && !restarted && pc.restartIce) { restarted = true; setState("connecting"); pc.restartIce(); return; } /* one more try with fresh candidates */
      if (restarted || polite) { clearTimeout(connT); connT = setTimeout(giveUp, polite ? 12000 : 0); }
      return;
    }
    if (c === "disconnected" || i === "disconnected") {
      clearTimeout(dropT);
      dropT = setTimeout(() => { if (pc && !["connected", "completed"].includes(pc.iceConnectionState) && !polite && pc.restartIce) pc.restartIce(); }, 4000);
    }
  }
  function build() {
    pc = new RTCPeerConnection({ ...ICE, iceCandidatePoolSize: 2 });
    ignore = false;
    restarted = false;
    pendIce = [];
    local.getTracks().forEach((t) => { const s = pc.addTrack(t, local); if (t.kind === "video") sender = s; });
    pc.ontrack = (e) => {
      const rv = el("rv");
      rv.srcObject = e.streams[0] || new MediaStream([e.track]);
      rv.play?.().catch(() => {});
      if (e.track.kind !== "video") return;
      const t = e.track, upd = () => root.classList.toggle("has-video", !t.muted && t.readyState === "live");
      t.onmute = t.onunmute = t.onended = upd;
      upd();
    };
    pc.onicecandidate = (e) => e.candidate && sig("ice", e.candidate);
    pc.onnegotiationneeded = async () => {
      if (!pc || (polite && !pc.remoteDescription)) return; /* the person who answers waits for the caller's offer */
      try { making = true; await pc.setLocalDescription(); sig("desc", pc.localDescription); } catch (e) { console.warn(e); } finally { making = false; }
    };
    pc.onconnectionstatechange = pc.oniceconnectionstatechange = onState;
    clearTimeout(connT);
    connT = setTimeout(giveUp, 30000); /* never sit on "Connecting…" for ever */
    setState("connecting");
    show(true);
  }
  function stop(notify = true) {
    if (notify && cid) sig("end");
    clearTimeout(connT);
    clearTimeout(dropT);
    clearTimeout(ringT);
    if (pc) { pc.onconnectionstatechange = pc.oniceconnectionstatechange = pc.onnegotiationneeded = pc.onicecandidate = null; pc.close(); }
    if (local) local.getTracks().forEach((t) => t.stop());
    pc = local = cam = sender = cid = peer = null;
    early.length = 0;
    pendIce = [];
    making = false;
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
    if (!window.isSecureContext) return tell("Calls only work on https:// (or localhost). Open the site with https.");
    try { await media(video); } catch (e) { return tell("Allow the microphone" + (video ? " and camera" : "") + " to call. Calls need HTTPS (localhost is fine)."); }
    peer = W;
    const mine = (cid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
    polite = false;
    const them = document.querySelector(".ch > span:not(.acts) b")?.textContent?.trim() || "Someone";
    const themAv = safePath((document.querySelector(".ch .av.has")?.style.backgroundImage || "").replace(/^url\(["']?|["']?\)$/g, ""));
    setPeer(them, themAv);
    setState("calling");
    show(true);
    sig("ring", { name: NAME, video, av: myAvatar() });
    setTimeout(() => { if (cid === mine && !pc) { tell("No answer."); stop(true); } }, 45000);
  }
  const flushIce = async () => {
    const q = pendIce;
    pendIce = [];
    for (const c of q) { try { await pc.addIceCandidate(c); } catch (e) { if (!ignore) console.warn(e); } }
  };
  async function handle(s) {
    const p = JSON.parse(s.payload || "null");
    if (s.type === "accept") { if (!pc) { build(); for (const e of early.splice(0)) await handle(e); } return; }
    if (s.type === "decline" || s.type === "end") return stop(false);
    if (!pc) { early.push(s); return; }
    if (s.type === "desc") {
      const collide = p.type === "offer" && (making || pc.signalingState !== "stable");
      ignore = !polite && collide;
      if (ignore) return;
      await pc.setRemoteDescription(p);
      await flushIce();
      if (p.type === "offer") { await pc.setLocalDescription(); sig("desc", pc.localDescription); }
    } else if (s.type === "ice") {
      if (!pc.remoteDescription) pendIce.push(p);
      else { try { await pc.addIceCandidate(p); } catch (e) { if (!ignore) console.warn(e); } }
    }
  }
  async function onSig(s) {
    const key = String(s.id);
    if (seen.has(key)) return;
    seen.add(key);
    if (seen.size > 600) seen.delete(seen.values().next().value);
    try {
      if (s.type === "ring") {
        const p = JSON.parse(s.payload || "null") || {};
        if (ring && ring.call_id === s.call_id) return;
        if (pc || cid || ring) return sig("decline", null, s.from_id, s.call_id);
        ring = { ...s, p };
        el("rn").textContent = p.name || "Someone";
        faceOf(el("rav"), p.name, safePath(p.av));
        el("rk").textContent = p.video ? "Unsent video call" : "Unsent voice call";
        el("ring").hidden = false;
        clearTimeout(ringT);
        ringT = setTimeout(() => { if (ring && ring.call_id === s.call_id) { ring = null; el("ring").hidden = true; } }, 50000); /* the caller gives up after 45 s */
        return;
      }
      if (s.call_id !== cid) {
        if (ring && s.call_id === ring.call_id && ["end", "decline"].includes(s.type)) { ring = null; el("ring").hidden = true; }
        return;
      }
      await handle(s);
    } catch (e) { console.warn("call signal", s.type, e); }
  }
  async function tick() {
    if (polling) return; /* never run two polls at once, or the same signal is handled twice */
    polling = true;
    try {
      const r = await api("call", "poll", null, `&after=${after}`);
      if (r.ok) { after = Math.max(Number(after) || 0, Number(r.last) || 0); for (const s of r.sigs) await onSig(s); }
    } catch (e) { /* offline */ } finally { polling = false; }
  }
  /* first look: also picks up a call that is still ringing (you opened the app from the notification) */
  api("call", "poll", null, "&after=").then(async (r) => {
    after = Number(r.last) || 0;
    for (const s of r.sigs || []) await onSig(s);
    setInterval(tick, 1000);
  }).catch(() => { setInterval(tick, 1000); });

  el("ryes").onclick = async () => {
    const r = ring;
    if (!r) return;
    ring = null;
    clearTimeout(ringT);
    el("ring").hidden = true;
    peer = r.from_id;
    cid = r.call_id;
    polite = true;
    try { await media(r.p.video); } catch (e) {
      peer = cid = null;
      sig("decline", null, r.from_id, r.call_id);
      return tell("Allow the microphone" + (r.p.video ? " and camera" : "") + " to pick up. Calls need HTTPS (localhost is fine).");
    }
    if (cid !== r.call_id) { local.getTracks().forEach((t) => t.stop()); local = null; return; } /* they hung up while the permission box was open */
    setPeer(r.p.name, safePath(r.p.av));
    build();
    sig("accept");
  };
  el("rno").onclick = () => { if (!ring) return; sig("decline", null, ring.from_id, ring.call_id); ring = null; clearTimeout(ringT); el("ring").hidden = true; };
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
    el("kS").classList.remove("on");
  }
})();
