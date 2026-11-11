<?php
defined('ROOT') || exit;
/**
 * @var mixed $me
 */
$uid = (int)($me['_id'] ?? 0);
$with = (int)($_GET['with'] ?? 0);
if ($with) {
    header('Location: index.php?p=chat&with=' . $with);
    exit;
}
$fr = $req = $out = [];
$dbErr = '';
try {
    ensure_chat_tables();
    $fr = q("SELECT u.id,u.name,u.username,u.avatar,
        (SELECT IF(m.kind='text',m.body,CONCAT('[',m.kind,']')) FROM messages m WHERE (m.from_id=u.id AND m.to_id=:me1) OR (m.from_id=:me2 AND m.to_id=u.id) ORDER BY m.id DESC LIMIT 1) last,
        (SELECT COUNT(*) FROM messages m WHERE m.from_id=u.id AND m.to_id=:me3 AND m.read_at IS NULL) unread
        FROM friends f JOIN users u ON u.id=IF(f.user_id=:me4,f.friend_id,f.user_id)
        WHERE f.status='accepted' AND (f.user_id=:me5 OR f.friend_id=:me6) ORDER BY u.name", array_combine(array_map(fn($i) => "me$i", range(1, 6)), array_fill(0, 6, $uid)))->fetchAll();
    $req = q("SELECT f.id fid,u.name,u.username,u.avatar FROM friends f JOIN users u ON u.id=f.user_id WHERE f.friend_id=? AND f.status='pending'", [$uid])->fetchAll();
    $out = q("SELECT u.name,u.username,u.avatar FROM friends f JOIN users u ON u.id=f.friend_id WHERE f.user_id=? AND f.status='pending' ORDER BY f.id DESC", [$uid])->fetchAll();
} catch (Throwable $e) {
    $dbErr = 'Friends could not start. Run config/upgrade_chat.sql in HeidiSQL, then reload.';
}
$cur = null;
foreach ($fr as $f) if ((int)$f['id'] === $with) $cur = $f;
/* the big "Friends / Keep a few people close" heading is gone; the h1 stays for screen readers */
page_head('Friends');
page_start('friends', $cur ? '?p=friends' : null);
echo '<h1 class="vh">Friends</h1>';
if ($dbErr) echo '<p class=err>' . esc($dbErr) . '</p>'; ?>
<?php if (!$cur) { ?><section class="card fhero"><div class=plane3d data-3d=plane><span class=fallback><?= icon('users', 34) ?></span></div>
    <div><h2 class=hand><?= $fr ? 'Your people' : 'Your quiet corner' ?></h2><p class=mut><?= $fr ? count($fr) . ' close · message, voice note or call.' : 'Write first. When you want company, one username is all it takes.' ?></p>
        <button type=button class="btn sm wh" id=fcopy data-u="@<?= esc($me['username']) ?>"><?= icon('upload', 15) ?> Share @<?= esc($me['username']) ?></button></div></section><?php } ?>
<div class="fgrid<?= $cur ? ' in-chat' : '' ?>">
    <section class="card flist" aria-label="Friends">
        <form class=fadd data-add>
            <label>Add a friend
                <span class=frow><input name=who placeholder="Their username or email" autocapitalize=off autocomplete=off spellcheck=false required><button class="btn sm"><?= icon('userplus', 16) ?>Add</button></span>
            </label>
        </form>
        <small class=mut>Your username is <b>@<?= esc($me['username']) ?></b></small>
        <?php if ($out) { ?><h3 class=hand>Waiting for a reply</h3>
            <?php foreach ($out as $o) { ?>
                <div class=fq><?= avatar_html($o) ?><span><b><?= esc($o['name']) ?></b><small>@<?= esc($o['username']) ?> · request sent</small></span></div>
            <?php } ?>
        <?php } ?>
        <?php if ($req) { ?><h3 class=hand>Requests</h3>
            <?php foreach ($req as $r) { ?>
                <div class=fq><?= avatar_html($r) ?><span><b><?= esc($r['name']) ?></b><small>@<?= esc($r['username']) ?></small></span>
                    <button type=button class="btn sm" data-accept="<?= (int)$r['fid'] ?>">Accept</button><button type=button class="btn sm wh" data-decline="<?= (int)$r['fid'] ?>" aria-label="Decline request from <?= esc($r['name']) ?>"><?= icon('close', 15) ?></button></div>
        <?php }
        } ?>
        <?php if ($fr) echo '<h3 class=hand>Your friends</h3>'; ?>
        <?php foreach ($fr as $f) { ?>
            <a class="fr<?= $cur && (int)$cur['id'] === (int)$f['id'] ? ' on' : '' ?>" href="?p=chat&with=<?= (int)$f['id'] ?>"><?= avatar_html($f) ?><span><b><?= esc($f['name']) ?></b><small><?= esc(mb_substr((string)($f['last'] ?? '@' . $f['username']), 0, 34)) ?></small></span><?= $f['unread'] ? '<em class=nb>' . (int)$f['unread'] . '</em>' : '' ?></a>
        <?php }
        if (!$fr) echo '<div class=hush>' . icon('heart', 22) . '<b class=hand>No friends here yet, and that’s okay.</b><p class=mut>Starting with just you is a gentle place to begin. When someone feels right, add them above, and keep the rest of your words for yourself.</p></div>'; ?>
    </section>
    <section class="card chat">
        <?php if ($cur) { ?>
            <header class=ch>
                <a class="ib back-ch" href="?p=friends" aria-label="Back to friends"><?= icon('arrowl', 18) ?></a><a class=who href="?p=space&amp;u=<?= urlencode($cur['username']) ?>" aria-label="View <?= esc($cur['name']) ?>'s space"><?= avatar_html($cur) ?><span><b><?= esc($cur['name']) ?></b><small>@<?= esc($cur['username']) ?></small></span></a>
                <span class=acts><button type=button class=ib id=cA aria-label="Voice call"><?= icon('phone', 18) ?></button><button type=button class=ib id=cV aria-label="Video call"><?= icon('video', 18) ?></button></span>
            </header>
            <div class=msgs id=msgs role=log aria-live=polite data-with="<?= (int)$cur['id'] ?>"></div>
            <form class=compose id=cf autocomplete=off>
                <input type=file id=pf accept="image/png,image/jpeg,image/webp,image/gif" hidden>
                <button type=button class=ib id=pb aria-label="Send a picture"><?= icon('image', 18) ?></button>
                <textarea id=ct rows=1 maxlength=1000 placeholder="Write a message" aria-label="Message" enterkeyhint=send></textarea>
                <button type=button class=ib id=mic aria-label="Record a voice note"><?= icon('mic', 18) ?></button>
                <button class="btn sm send" aria-label="Send"><?= icon('send', 17) ?></button>
            </form>
        <?php } else { ?>
            <div class=nochat>
                <div class=plane3d data-3d=plane><span class=fallback><?= icon('users', 34) ?></span></div>
                <?php if ($fr) { ?><h2 class=hand>Who feels like talking?</h2>
                    <p class=mut>Pick someone, or just sit with your thoughts a while. Both are fine.</p>
                <?php } else { ?><h2 class=hand>Your quiet corner</h2>
                    <p class=mut>A quiet room is nothing to fix. Write first. When you want company, one username is all it takes.</p>
                <?php } ?>
            </div>
        <?php } ?>
    </section>
</div>
<?php require ROOT . '/includes/callui.php'; ?>
<script>
/* Built-in copy of the chat code. It only starts if js/dm.js did not (stale cache, blocked file, old footer.php). */
addEventListener("load", function () {
  var CSRF = function () { return (document.querySelector("meta[name=csrf]") || {}).content || ""; };
  var de = document.documentElement;
  if (!de.dataset.dm && document.querySelector(".fgrid")) {
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
  let last = 0, day = "", busy = false, since = 0, editing = 0;
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
    } catch (e) { /* offline: try again next tick */ }
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

  }
});
</script>
