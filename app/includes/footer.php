<?php
defined('ROOT') || exit;
/**
 * @var mixed $p
 */
if ($p != 'signin' && $p != 'recover') echo '</main></div>';
if (!empty($_SESSION['flash'])) {
    echo '<script>window.FLASH=' . json_encode($_SESSION['flash']) . ';window.FLASH_T=' . json_encode($_SESSION['flash_t'] ?? 'success') . '</script>';
    unset($_SESSION['flash'], $_SESSION['flash_t']);
}
$JS = ['core', 'cropper', 'auth', 'write', 'letters', 'profile', 'password', 'sidebar', 'home', 'admin', 'theme', 'mood', 'templates', 'effects', 'validate', 'google', 'onboarding', 'stickers', 'format', 'dm', 'rtc', 'scene3d', 'space', 'react', 'phone', 'pwa'];
foreach ($JS as $j) echo '<script src="js/' . $j . '.js?v=' . @filemtime(PUB . "/js/$j.js") . '"></script>';
echo <<<'JSNOTE'
<script>
/* Live notifications: bell refreshes every 15 s, small pop-up for new things, optional phone alerts. */
(function () {
  var nb = document.getElementById("nbt");
  if (!nb) return;
  var seen = null, busy = false;
  var csrf = function () { return (document.querySelector("meta[name=csrf]") || {}).content || ""; };
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  var standalone = (window.matchMedia && matchMedia("(display-mode:standalone)").matches) || navigator.standalone;
  function badge(n) {
    var b = document.getElementById("nbd");
    if (!n) { if (b) b.remove(); nb.setAttribute("aria-label", "Notifications"); return; }
    if (!b) { b = document.createElement("em"); b.className = "nbd"; b.id = "nbd"; nb.appendChild(b); }
    b.textContent = n > 9 ? "9+" : n;
    nb.setAttribute("aria-label", "Notifications, " + n + " new");
  }
  function toast(it) {
    var a = document.createElement("a");
    a.className = "ntoast"; a.href = it.href;
    var b = document.createElement("b"); b.textContent = it.name;
    var s = document.createElement("span"); s.textContent = it.text;
    a.appendChild(b); a.appendChild(s); document.body.appendChild(a);
    setTimeout(function () { a.classList.add("in"); }, 30);
    setTimeout(function () { a.classList.remove("in"); setTimeout(function () { a.remove(); }, 400); }, 6000);
  }
  function system(it) {
    try {
      if (!document.hidden || !("Notification" in window) || Notification.permission !== "granted") return;
      var n = new Notification(it.name + " " + it.text, { tag: it.key, icon: "img/icons/icon-192.png" });
      n.onclick = function () { window.focus(); location.href = it.href; n.close(); };
    } catch (e) {}
  }
  function u8(b) { b = b.replace(/-/g, "+").replace(/_/g, "/"); while (b.length % 4) b += "="; return Uint8Array.from(atob(b), function (c) { return c.charCodeAt(0); }); }
  function enable(btn) {
    var can = "serviceWorker" in navigator && "PushManager" in window;
    Notification.requestPermission().then(function (p) {
      if (p !== "granted") return;
      if (!can) return;
      return fetch("index.php?api=push&a=key", { credentials: "same-origin" }).then(function (r) { return r.json(); }).then(function (k) {
        return navigator.serviceWorker.ready.then(function (reg) {
          return reg.pushManager.getSubscription().then(function (s) { return s || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(k.key) }); });
        });
      }).then(function (s) {
        var f = new FormData(); f.set("endpoint", s.endpoint);
        return fetch("index.php?api=push&a=sub", { method: "POST", body: f, headers: { "X-CSRF": csrf() }, credentials: "same-origin" });
      });
    }).catch(function () {}).then(function () { if (btn.parentNode) btn.remove(); });
  }
  function ask() {
    var p = document.getElementById("npn");
    if (!p || p.querySelector(".npb,.nph2") || !("Notification" in window) || Notification.permission !== "default") return;
    var anchor = p.querySelector(".npf");
    if (ios && !standalone) {
      var t = document.createElement("p");
      t.className = "nph2";
      t.textContent = "Want alerts on iPhone? Tap Share, then Add to Home Screen, and open Unsent from the new icon.";
      p.insertBefore(t, anchor);
      return;
    }
    var b = document.createElement("button");
    b.type = "button"; b.className = "npb"; b.textContent = "Turn on alerts for messages";
    b.onclick = function (e) { e.stopPropagation(); enable(b); };
    p.insertBefore(b, anchor);
  }
  function here(it) { var q = (it.href.split("?")[1] || "~"); return /[?&]p=chat/.test(it.href) && location.search.indexOf(q) > -1; }
  function tick() {
    if (busy) return;
    busy = true;
    fetch("index.php?api=chat&a=notes", { credentials: "same-origin" })
      .then(function (r) { return r.text(); })
      .then(function (t) {
        var j = JSON.parse(t);
        if (!j || !j.ok) return;
        badge(j.n);
        var l = document.querySelector("#npn .npl");
        if (l) l.innerHTML = j.html;
        ask();
        var fresh = [];
        (j.items || []).forEach(function (it) { if (seen && !seen[it.key] && !here(it)) fresh.push(it); });
        seen = {};
        (j.items || []).forEach(function (it) { seen[it.key] = 1; });
        fresh.slice(0, 2).forEach(function (it) { toast(it); system(it); });
      })
      .catch(function () {})
      .then(function () { busy = false; });
  }
  ask();
  tick();
  setInterval(function () { if (!document.hidden) tick(); }, 15000);
  setInterval(function () { if (document.hidden) tick(); }, 60000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) tick(); });
  addEventListener("focus", tick);
})();
</script>
JSNOTE;
echo '<script type="module" src="js/motion.js?v=' . @filemtime(PUB . '/js/motion.js') . '"></script></body></html>';
