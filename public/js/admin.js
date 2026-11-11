/* Unsent · js/admin.js · admin workspace. Loaded in order by includes/footer.php (core.js first). */
/* global $, CSRF, post, Swal */
/* admin workspace: chart, user table, summary panel, theme toggle, confirms */
(() => {
  const S = window.Swal,
    g = (id) => document.getElementById(id);
  $("form[data-confirm]").forEach((f) =>
    f.addEventListener("submit", (e) => {
      if (f.dataset.ok) return;
      e.preventDefault();
      (S
        ? S.fire({
            icon: "warning",
            title: f.dataset.title || "Are you sure?",
            text: f.dataset.confirm,
            showCancelButton: true,
            confirmButtonText: f.dataset.yes || "Yes, delete",
            cancelButtonText: f.dataset.no || "Cancel",
            reverseButtons: true,
            focusCancel: true,
            customClass: { confirmButton: "swal-danger" },
          }).then((r) => r.isConfirmed)
        : Promise.resolve(confirm(f.dataset.confirm))
      ).then((ok) => {
        if (ok) {
          f.dataset.ok = 1;
          f.submit();
        }
      });
    }),
  );
  /* month picker */
  $(".dr input").forEach((i) => {
    i.onclick = () => i.showPicker && i.showPicker();
    i.onchange = () => i.form.submit();
  });
  /* light / dark switch, saved to the account */
  const sg = g("aseg");
  if (sg) {
    const h = document.documentElement,
      mark = () =>
        [...sg.children].forEach((b) =>
          b.classList.toggle("on", b.dataset.t == h.dataset.eff),
        );
    mark();
    sg.onclick = (e) => {
      const b = e.target.closest("button");
      if (!b || b.dataset.t == h.dataset.eff) return;
      swapTheme(() => {
        h.dataset.theme = h.dataset.eff = b.dataset.t;
        mark();
      });
      try {
        localStorage.setItem("unsent-theme", b.dataset.t);
      } catch (x) {}
      const f = new FormData();
      f.set("a", "theme");
      f.set("v", b.dataset.t);
      post(f).catch(() => {});
    };
  }
  /* daily active users chart */
  if (window.AD && window.ch) {
    const { d: D, v: V } = AD,
      ch = g("ch");
    const draw = () => {
      if (!ch.clientWidth) return;
      const W = ch.clientWidth,
        H = 200,
        L = 34,
        R = 8,
        T = 10,
        B = 26,
        step = Math.ceil(Math.max(3, ...V) / 3),
        top = step * 3,
        n = V.length,
        x = (i) => L + ((W - L - R) * (n > 1 ? i / (n - 1) : 0.5)),
        y = (k) => T + (H - T - B) * (1 - k / top),
        fmt = (k) =>
          new Date(k + "T00:00").toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
      let s =
        '<svg viewBox="0 0 ' +
        W +
        " " +
        H +
        '" role="img" aria-label="Daily active users"><defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9c84a" stop-opacity=".35"/><stop offset="1" stop-color="#e9c84a" stop-opacity="0"/></linearGradient></defs>';
      for (let k = 0; k <= 3; k++)
        s +=
          '<line class="gl" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(k * step) + '" y2="' + y(k * step) + '"/><text class="ax" x="' + (L - 8) + '" y="' + (y(k * step) + 4) + '" text-anchor="end">' + k * step + "</text>";
      const pts = V.map((k, i) => x(i) + "," + y(k)).join(" ");
      s +=
        '<polygon class="ar" fill="url(#ag)" points="' + x(0) + "," + y(0) + " " + pts + " " + x(n - 1) + "," + y(0) + '"/><polyline class="ln" points="' + pts + '"/>';
      D.forEach((k, i) => {
        if (i % 5 == 0 || i == n - 1)
          s += '<text class="ax" x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + fmt(k) + "</text>";
      });
      s +=
        '<line class="hv" y1="' + T + '" y2="' + (H - B) + '" style="display:none"/><circle class="dt" r="4" style="display:none"/></svg><div class="tip" style="display:none"></div>';
      ch.innerHTML = s;
      const svg = ch.firstChild,
        hv = svg.querySelector(".hv"),
        dt = svg.querySelector(".dt"),
        tip = ch.querySelector(".tip"),
        show = (on) => [hv, dt, tip].forEach((el) => (el.style.display = on ? "" : "none"));
      svg.onmouseleave = () => show(false);
      svg.onmousemove = (e) => {
        const r = svg.getBoundingClientRect(),
          px = ((e.clientX - r.left) / r.width) * W;
        const i = Math.max(0, Math.min(n - 1, Math.round(((px - L) / (W - L - R)) * (n - 1))));
        hv.setAttribute("x1", x(i));
        hv.setAttribute("x2", x(i));
        dt.setAttribute("cx", x(i));
        dt.setAttribute("cy", y(V[i]));
        tip.innerHTML = "<small>" + fmt(D[i]) + "</small><b>" + V[i] + " active user" + (V[i] == 1 ? "" : "s") + "</b>";
        tip.style.left = Math.min(x(i) + 12, W - 140) + "px";
        show(true);
      };
    };
    draw();
    addEventListener("resize", draw);
  }
  /* user table: search, filters, paging, account summary */
  const ut = g("ut");
  if (ut && g("uq")) {
    const R = $("#ut tbody tr"),
      ps = +ut.dataset.ps || 6;
    let pg = 1;
    const cut = (k) => {
      const t = new Date();
      t.setDate(t.getDate() - k);
      return t.toISOString().slice(0, 10);
    };
    const ok = (r) => {
      const s = g("ufs").value,
        j = g("ufj").value;
      return (
        r.dataset.s.includes(g("uq").value.toLowerCase()) &&
        (s == "all" || (s == "admin" ? r.dataset.ad == "1" : r.dataset.st == s)) &&
        (j == "all" || (r.dataset.j && r.dataset.j >= cut(+j)))
      );
    };
    const pick = (r) => {
      R.forEach((x) => x.classList.toggle("on", x === r));
      const D = r.dataset,
        a = r.querySelector(".av").cloneNode(true);
      a.classList.add("big");
      a.id = "sav";
      g("sav").replaceWith(a);
      g("sn").textContent = D.name;
      g("ss").textContent = D.stl;
      g("ss").className = "st " + (D.st == "suspended" ? "no" : "ok");
      g("se2").textContent = D.email;
      g("si").textContent = D.id;
      g("sj").textContent = D.jd;
      g("sl").textContent = D.la;
      g("sli").textContent = D.li;
      g("slo").textContent = D.lo;
      g("spw").textContent = D.pw;
      g("sr").textContent = D.role;
      g("sact").hidden = D.self == "1";
      $("#sact [name=u]").forEach((i) => (i.value = D.email));
      g("frb").textContent = D.ad == "1" ? "Remove admin" : "Make admin";
      g("fsb").textContent = D.st == "suspended" ? "Reactivate" : "Suspend";
      g("fd").dataset.confirm = "Delete " + D.name + " and every letter they wrote? This can’t be undone.";
      g("sbody").hidden = false;
      g("sempty").hidden = true;
    };
    const render = () => {
      const L = R.filter(ok),
        pages = Math.max(1, Math.ceil(L.length / ps));
      pg = Math.min(pg, pages);
      R.forEach((r) => (r.hidden = true));
      L.slice((pg - 1) * ps, pg * ps).forEach((r) => (r.hidden = false));
      g("uinfo").textContent = L.length
        ? "Showing " + ((pg - 1) * ps + 1) + "–" + Math.min(pg * ps, L.length) + " of " + L.length + " users"
        : "No users match";
      g("upg").textContent = "Page " + pg + " of " + pages;
      g("uprev").disabled = pg < 2;
      g("unext").disabled = pg >= pages;
    };
    ["uq", "ufs", "ufj"].forEach((id) => (g(id).oninput = () => ((pg = 1), render())));
    g("uprev").onclick = () => (pg--, render());
    g("unext").onclick = () => (pg++, render());
    R.forEach((r) => {
      r.onclick = () => pick(r);
      r.onkeydown = (e) => {
        if (e.target === r && (e.key == "Enter" || e.key == " ")) {
          e.preventDefault();
          pick(r);
        }
      };
    });
    g("sx").onclick = () => {
      g("sbody").hidden = true;
      g("sempty").hidden = false;
      R.forEach((x) => x.classList.remove("on"));
    };
    render();
    const first = R.find((r) => !r.hidden);
    if (first) pick(first);
  }
})();

