/* Unsent · js/react.js · like + comment on public letters (Me page / someone's space).
   Talks to api/react.php. All text from other people is put in with textContent, never innerHTML. */
/* global $, CSRF, Swal */
(() => {
  const rows = document.querySelectorAll(".sp-l");
  if (!rows.length) return;
  const api = (a, body, qs) =>
    fetch("index.php?api=react&a=" + a + (qs || ""), { method: body ? "POST" : "GET", body, headers: { "X-CSRF": CSRF() } }).then((r) => r.json());
  const say = (m, t) => window.Swal ? Swal.fire({ toast: true, position: "top", timer: 2200, showConfirmButton: false, icon: t || "info", title: m }) : alert(m);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const ICON = {
    heart: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
    close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    send: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>',
    trash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  };
  const svg = (k) => { const s = el("span", "rs-ic"); s.innerHTML = ICON[k]; return s; };
  const avatar = (u) => {
    const a = el("i", "av sm" + (u.av ? " has" : ""));
    if (u.av) a.style.backgroundImage = "url('" + u.av.replace(/'/g, "%27") + "')"; else a.textContent = (u.name || u.by || "?").trim().charAt(0).toUpperCase();
    return a;
  };
  /* keep the small counters on the list row in step with the sheet */
  const sync = (id, s) => {
    const row = document.querySelector('.sp-l[data-id="' + CSS.escape(id) + '"]');
    if (!row) return;
    const set = (k, n) => { const i = row.querySelector('[data-n="' + k + '"]'); if (i) i.textContent = n; };
    set("likes", s.likes); set("comments", s.comments);
    const b = row.querySelector("[data-like]");
    if (b) { b.classList.toggle("on", !!s.liked); b.setAttribute("aria-pressed", s.liked ? "true" : "false"); }
  };
  const toggleLike = (id, btn) => {
    if (btn.disabled) return Promise.resolve();
    btn.disabled = true;
    const fd = new FormData(); fd.set("id", id);
    return api("like", fd).then((r) => { if (!r.ok) say(r.err || "Could not like this", "error"); else sync(id, r); return r; })
      .catch(() => say("No connection. Try again.", "error")).finally(() => { btn.disabled = false; });
  };

  /* ---------- the sheet: letter + likes + comments ---------- */
  let sheet = null, lastFocus = null;
  const shut = () => {
    if (!sheet) return;
    sheet.classList.remove("in");
    const s = sheet; sheet = null;
    if (s.fitOff) s.fitOff();
    document.documentElement.classList.remove("rs-open");
    setTimeout(() => s.remove(), 220);
    document.removeEventListener("keydown", onKey);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };
  const onKey = (e) => { if (e.key === "Escape") shut(); };
  const open = (id, from) => {
    if (sheet) return;
    lastFocus = from || document.activeElement;
    const back = el("div", "rs-back"), pane = el("section", "rs");
    pane.setAttribute("role", "dialog"); pane.setAttribute("aria-modal", "true"); pane.setAttribute("aria-label", "Letter and comments");
    const head = el("header", "rs-head"), who = el("span", "rs-who"), x = el("button", "rs-x"); x.type = "button"; x.setAttribute("aria-label", "Close"); x.append(svg("close"));
    head.append(who, x);
    const scroll = el("div", "rs-scroll"), letter = el("article", "rs-letter"), bar = el("div", "rs-bar"), list = el("ul", "rs-list");
    list.setAttribute("aria-live", "polite");
    const form = el("form", "rs-form"), ta = el("textarea"), go = el("button", "rs-send"); go.type = "submit"; go.setAttribute("aria-label", "Post comment"); go.append(svg("send"));
    ta.rows = 1; ta.maxLength = 500; ta.placeholder = "Write something kind…"; ta.setAttribute("aria-label", "Comment"); ta.enterKeyHint = "send";
    form.append(ta, go);
    scroll.append(letter, bar, list);
    pane.append(head, scroll, form);
    back.append(pane);
    document.body.append(back);
    document.documentElement.classList.add("rs-open");
    sheet = back;
    requestAnimationFrame(() => back.classList.add("in"));
    document.addEventListener("keydown", onKey);
    const vv = window.visualViewport;
    const fit = () => { if (!vv) return; back.style.top = vv.offsetTop + "px"; back.style.height = vv.height + "px"; back.style.bottom = "auto"; };
    if (vv) { vv.addEventListener("resize", fit); vv.addEventListener("scroll", fit); fit(); back.fitOff = () => { vv.removeEventListener("resize", fit); vv.removeEventListener("scroll", fit); }; }
    back.addEventListener("click", (e) => { if (e.target === back) shut(); });
    x.onclick = shut;
    letter.append(el("p", "rs-load", "Opening letter…"));

    let state = { likes: 0, comments: 0, liked: false }, mine = false;
    const drawBar = () => {
      bar.textContent = "";
      const like = el(mine ? "span" : "button", "rx-b big" + (state.liked ? " on" : "") + (mine ? " ro" : ""));
      if (!mine) { like.type = "button"; like.setAttribute("aria-pressed", state.liked ? "true" : "false"); like.setAttribute("aria-label", state.liked ? "Unlike" : "Like"); }
      like.append(svg("heart"), el("i", null, String(state.likes)), el("span", "rx-t", state.likes == 1 ? "like" : "likes"));
      if (!mine) like.onclick = () => toggleLike(id, like).then((r) => { if (r && r.ok) { state = Object.assign(state, r); drawBar(); } });
      bar.append(like, el("span", "rs-cnt", state.comments + (state.comments == 1 ? " comment" : " comments")));
    };
    const empty = () => { if (!list.children.length) list.append(el("li", "rs-empty", "No comments yet. Be the first to say something kind.")); };
    const addComment = (c) => {
      const li = el("li", "rs-c"), body = el("div", "rs-cb"), top = el("div", "rs-ct");
      top.append(el("b", null, c.name), el("small", null, "@" + c.username + " · " + c.ago));
      body.append(top, el("p", null, c.body));
      li.append(avatar(c), body);
      if (c.del) {
        const d = el("button", "rs-del"); d.type = "button"; d.setAttribute("aria-label", "Delete comment"); d.append(svg("trash"));
        d.onclick = () => {
          d.disabled = true;
          const fd = new FormData(); fd.set("cid", c.id);
          api("del", fd).then((r) => {
            if (!r.ok) { d.disabled = false; return say(r.err || "Could not delete", "error"); }
            li.remove(); state = Object.assign(state, r); drawBar(); sync(id, r); empty();
          }).catch(() => { d.disabled = false; say("No connection. Try again.", "error"); });
        };
        li.append(d);
      }
      list.append(li);
    };
    api("open", null, "&id=" + encodeURIComponent(id)).then((r) => {
      if (!r.ok) { shut(); return say(r.err || "Could not open this letter", "info"); }
      mine = r.letter.mine; state = { likes: r.likes, comments: r.comments, liked: r.liked };
      who.append(avatar({ av: r.letter.av, by: r.letter.by }), (() => { const s = el("span"); s.append(el("b", null, r.letter.by), el("small", null, "@" + r.letter.username)); return s; })());
      letter.textContent = "";
      letter.append(el("h2", "hand", r.letter.title), el("small", "mut", "To " + r.letter.to + " · " + r.letter.date), el("p", "rs-body", r.letter.body));
      drawBar(); list.textContent = "";
      r.comments.forEach(addComment); empty();
      sync(id, state);
    }).catch(() => { shut(); say("No connection. Try again.", "error"); });

    const grow = () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 120) + "px"; };
    ta.addEventListener("input", grow);
    ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } });
    form.onsubmit = (e) => {
      e.preventDefault();
      const t = ta.value.trim();
      if (!t || go.disabled) return;
      go.disabled = true;
      const fd = new FormData(); fd.set("id", id); fd.set("text", t);
      api("comment", fd).then((r) => {
        if (!r.ok) return say(r.err || "Could not post", "error");
        const first = list.querySelector(".rs-empty"); if (first) first.remove();
        addComment(r.comment); state = Object.assign(state, { likes: r.likes, comments: r.comments, liked: r.liked }); drawBar(); sync(id, r);
        ta.value = ""; grow();
        scroll.scrollTo({ top: scroll.scrollHeight, behavior: "smooth" });
      }).catch(() => say("No connection. Try again.", "error")).finally(() => { go.disabled = false; });
    };
  };

  /* ---------- clicks on the Me / space page ---------- */
  document.addEventListener("click", (e) => {
    const row = e.target.closest(".sp-l");
    if (!row || e.target.closest(".sw, .sp-st")) return;
    const like = e.target.closest("[data-like]");
    if (like) return void toggleLike(row.dataset.id, like);
    const op = e.target.closest("[data-open]");
    if (op) open(row.dataset.id, op);
  });
  document.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".sp-lt[data-open]")) { e.preventDefault(); open(e.target.closest(".sp-l").dataset.id, e.target); }
  });
})();
