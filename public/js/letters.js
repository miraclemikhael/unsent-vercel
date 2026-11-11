/* Unsent · js/letters.js · My letters: search, filter, open. Loaded in order by includes/footer.php (core.js first). */
/* global $, CSRF, post, Swal */
if (window.q) {
  const R = $(".row");
  let f = "all";
  const none = document.createElement("p");
  none.className = "mut nores";
  none.textContent = "No letters match that search.";
  none.hidden = true;
  if (R.length) R[R.length - 1].after(none);
  const flt = () => {
    let shown = 0;
    R.forEach((r) => {
      const hit =
        (f == "all" || r.dataset.k == f) &&
        (r.dataset.t + " " + r.dataset.b).toLowerCase().includes(q.value.trim().toLowerCase());
      r.style.display = hit ? "" : "none";
      if (hit) shown++;
    });
    none.hidden = shown > 0;
  };
  q.oninput = flt;
  $("[data-f]").forEach(
    (c) =>
      (c.onclick = () => {
        $("[data-f]").forEach((x) => x.classList.remove("on"));
        c.classList.add("on");
        f = c.dataset.f;
        flt();
      }),
  );
  /* ---- email a letter straight from the list ---- */
  const mailIt = async (id, title) => {
    { const r = document.querySelector('.row[data-id="' + id + '"]'); return window.letterOut(title, r ? r.dataset.b : ""); }
    const v = await Swal.fire({
      title: "Email this letter",
      html: '<input id="mt" class="swal2-input" type="email" placeholder="name@gmail.com" aria-label="Send to" autocapitalize="off"><input id="ms" class="swal2-input" maxlength="150" placeholder="Subject" aria-label="Subject"><textarea id="mn" class="swal2-textarea" maxlength="600" placeholder="A note to go with it (optional)" aria-label="Note"></textarea>',
      didOpen: () => { document.getElementById("ms").value = title || "A letter for you"; document.getElementById("mt").focus(); },
      showCancelButton: true,
      confirmButtonText: "Send",
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        const to = document.getElementById("mt").value.trim();
        if (!/^\S+@\S+\.\S+$/.test(to)) { Swal.showValidationMessage("Enter a valid email address."); return false; }
        const f = new FormData();
        f.set("a", "email");
        f.set("id", id);
        f.set("to", to);
        f.set("subject", document.getElementById("ms").value);
        f.set("note", document.getElementById("mn").value);
        try {
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
  $("[data-mail]").forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      const r = b.closest(".row");
      mailIt(b.dataset.mail, r ? r.dataset.t : "");
    };
  });
  const sm = document.getElementById("sm");
  if (sm) sm.onclick = () => mailIt(sid.value, st.textContent);

  R.forEach(
    (r) =>
      (r.onclick = () => {
        R.forEach((x) => x.classList.remove("on"));
        r.classList.add("on");
        st.textContent = r.dataset.t;
        sd.textContent = r.dataset.d;
        sb.textContent = r.dataset.b;
        stag.textContent = r.dataset.tag;
        stag.className = "tag " + r.dataset.k;
        se.href = "?p=editor&id=" + r.dataset.id;
        sid.value = r.dataset.id;
        spic.src = r.dataset.pc || "img/bottle.png";
        spic.classList.toggle("pcpic", !!r.dataset.pc);
        const ps = document.getElementById("spics");
        if (ps) {
          ps.textContent = "";
          let pics = [];
          try { pics = JSON.parse(r.dataset.st || "[]"); } catch (e) { /* none */ }
          pics.forEach((u) => {
            const im = document.createElement("img");
            im.src = u;
            im.alt = "Picture on this letter";
            im.loading = "lazy";
            ps.appendChild(im);
          });
          ps.hidden = !pics.length;
        }
        const sp = document.querySelector(".side");
        if (sp) {
          sp.classList.remove("swap");
          void sp.offsetWidth;
          sp.classList.add("swap");
        }
      }),
  );
  R.forEach(
    (r) =>
      (r.onkeydown = (e) => {
        if (e.target !== r) return;
        if (e.key == "Enter" || e.key == " ") {
          e.preventDefault();
          r.click();
        }
      }),
  );
  const want = new URLSearchParams(location.search).get("open");
  const pick = R.find((r) => r.dataset.id == want) || R[0];
  if (pick) {
    pick.click();
    want && pick.scrollIntoView({ block: "center" });
  }
}

