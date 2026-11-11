/* Unsent · js/sidebar.js · sidebar menu, profile photo, saved toast. Loaded in order by includes/footer.php (core.js first). */
/* global $, CSRF, post, Swal */
/* sidebar user menu, profile photo, saved toast */
(() => {
  const S = window.Swal,
    toast = (t, i) =>
      S &&
      S.fire({
        toast: true,
        position: "top-end",
        icon: i || "success",
        title: t,
        showConfirmButton: false,
        timer: 2400,
        timerProgressBar: true,
      });
  if (window.FLASH) toast(window.FLASH, window.FLASH_T);
  /* the phone tab bar now stays put while you type (it used to hide on focus and could stay hidden after the keyboard closed).
     Clear any leftover flag, also when the browser restores the page from its back/forward cache. */
  const unkb = () => document.documentElement.classList.remove("kb");
  unkb();
  addEventListener("pageshow", unkb);
  /* notifications bell (top right on phones) */
  const nb = document.getElementById("nbt"), np = document.getElementById("npn");
  if (nb && np) {
    const nshut = () => { np.hidden = true; nb.setAttribute("aria-expanded", "false"); };
    nb.onclick = (e) => {
      e.stopPropagation();
      const open = np.hidden;
      np.hidden = !open;
      nb.setAttribute("aria-expanded", String(open));
      if (open) {
        /* remember when you looked, so likes + comments are "new" only once */
        try { document.cookie = "unsent_nseen=" + Math.floor(Date.now() / 1000) + ";path=/;max-age=31536000;samesite=lax"; } catch (x) {}
        const d = document.getElementById("nbd");
        if (d) d.remove();
      }
    };
    document.addEventListener("click", (e) => { if (!np.hidden && !np.contains(e.target) && e.target !== nb) nshut(); });
    addEventListener("keydown", (e) => { if (e.key == "Escape" && !np.hidden) { nshut(); nb.focus(); } });
    np.querySelectorAll("a").forEach((a) => a.addEventListener("click", nshut));
  }
  const b = document.getElementById("meb"),
    m = document.getElementById("mem");
  if (b && m) {
    const shut = () => {
      m.hidden = true;
      b.setAttribute("aria-expanded", "false");
    };
    b.onclick = (e) => {
      e.stopPropagation();
      const open = m.hidden;
      m.hidden = !open;
      b.setAttribute("aria-expanded", String(open));
      if (open && e.detail === 0) m.querySelector("a").focus(); /* keyboard users land on the first item; a tap does not draw a focus ring */
    };
    document.addEventListener("click", (e) => {
      if (!m.contains(e.target)) shut();
    });
    addEventListener("keydown", (e) => {
      if (e.key == "Escape" && !m.hidden) {
        shut();
        b.focus();
      }
    });
    m.querySelectorAll("a").forEach((a) => a.addEventListener("click", shut));
  }
  const ab = document.getElementById("avb");
  if (!ab) return;
  const f = document.getElementById("avf"),
    x = document.getElementById("avx"),
    msg = document.getElementById("avm"),
    nm = document.querySelector("input[name=name]");
  const show = (src) => {
    $(".av").forEach((a) => {
      if (src) {
        a.style.backgroundImage = "url('" + src + "?" + Date.now() + "')";
        a.classList.add("has");
        a.textContent = "";
      } else {
        a.style.backgroundImage = "";
        a.classList.remove("has");
        a.textContent = (nm.value.trim().charAt(0) || "?").toUpperCase();
      }
    });
    x.hidden = !src;
  };
  const was = msg.textContent;
  /* Change / adjust photo: pick a picture (or reopen the saved one), move + resize it in a round frame, save */
  ab.onclick = async () => {
    const r = await window.pictureFlow({ kind: "avatar", current: ab.dataset.src, orig: ab.dataset.orig, ratio: 1, round: true, out: 512, title: "Profile photo" });
    if (!r) return;
    ab.dataset.src = r.src; ab.dataset.orig = r.orig || r.src;
    show(r.src);
    msg.textContent = was;
    toast("Photo updated");
  };
  x.onclick = async () => {
    const fd = new FormData();
    fd.append("a", "avrm");
    try {
      const r = await (await post(fd)).json();
      if (r.ok) {
        show("");
        ab.dataset.src = ""; ab.dataset.orig = "";
        toast("Photo removed");
      }
    } catch (e) {
      msg.textContent = "Could not remove it, try again.";
    }
  };
})();

