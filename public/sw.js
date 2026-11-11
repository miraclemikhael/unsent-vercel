/* Unsent service worker. Static files: cache fast. Pages: network first, offline page if no signal.
   Never caches POST, api/, uploads/ or pages (letters stay private on the network only). */
const V = "unsent-v7", STATIC = ["offline.html", "manifest.webmanifest", "img/logo.png", "img/icons/icon-192.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(STATIC)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== V).map((x) => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin || /\/(api|uploads)\//.test(u.pathname)) return;
  if (r.mode === "navigate") { e.respondWith(fetch(r).catch(() => caches.match("offline.html"))); return; }
  if (/\.(css|js|png|jpg|svg|webp|woff2?)$/.test(u.pathname)) {
    e.respondWith(caches.open(V).then((c) => c.match(r).then((hit) => {
      const net = fetch(r).then((res) => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});

/* Push: the push service only wakes us. Ask the server what to show (nothing private travels through it). */
self.addEventListener("push", (e) => e.waitUntil((async () => {
  let items = [];
  try { const j = await (await fetch("index.php?api=push&a=pull", { credentials: "same-origin" })).json(); items = j.items || []; } catch (x) {}
  if (!items.length) items = [{ title: "Unsent", body: "You have something new.", url: "index.php?p=friends" }];
  for (const it of items) {
    const call = /^call/.test(it.tag || "");
    await self.registration.showNotification(it.title, {
      body: it.body, icon: "img/icons/icon-192.png", badge: "img/icons/icon-192.png", tag: it.tag || "unsent", renotify: true,
      requireInteraction: call, vibrate: call ? [400, 200, 400, 200, 400] : [120], data: { url: it.url || "index.php?p=friends" },
    });
  }
})()));
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data || {}).url || "index.php?p=friends", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    for (const c of cs) if ("focus" in c) { c.navigate && c.navigate(url); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
