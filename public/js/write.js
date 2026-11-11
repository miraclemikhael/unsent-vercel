/* Unsent · js/write.js · write page: kind chips + letter editor. Loaded in order by includes/footer.php (core.js first). */
/* global $, CSRF, post, Swal */
$(".moods .chip:not([data-p]):not([data-f])").forEach(
  (c) =>
    (c.onclick = () => {
      c.parentNode
        .querySelectorAll(".chip")
        .forEach((x) => x.classList.remove("on"));
      c.classList.add("on");
    }),
);
$(".choice").forEach(
  (c) =>
    (c.onclick = () => {
      $(".choice").forEach((x) => x.classList.remove("on"));
      c.classList.add("on");
      kind.value = c.dataset.k;
    }),
);
if (window.ed) {
  const G = (id) => document.getElementById(id);
  let key = PK,
    back = true,
    hand = false,
    t;
  const clean = () => {
    const c = ed.cloneNode(true);
    c.querySelectorAll(".active").forEach((p) => {
      p.classList.remove("active");
      if (!p.className) p.removeAttribute("class");
    });
    return c.innerHTML.replace(/\u200b/g, "");
  };
  const fit = (box, txt) => {
    if (!box || !txt) return;
    const over = () => box.scrollHeight > box.clientHeight + 1;
    let lo = 1,
      hi = 4.6 * ({ caveat: 1.3, dancing: 1.2, kalam: 1.1 }[pfont.value] || 1);
    txt.style.fontSize = hi + "cqw";
    if (over()) {
      while (hi - lo > 0.05) {
        const m = (lo + hi) / 2;
        txt.style.fontSize = m + "cqw";
        if (over()) hi = m;
        else lo = m;
      }
      txt.style.fontSize = lo + "cqw";
    }
    const x = box.closest(".pc");
    x && x.classList.toggle("cut", over());
  };
  const fitAds = (el) =>
    el &&
    el.querySelectorAll(".pc-ad,.pc-cap").forEach((a) => {
      let z = a.classList.contains("pc-cap") ? 5.4 : 5;
      a.style.fontSize = z + "cqw";
      while (z > 1.8 && a.scrollWidth > a.clientWidth + 1) {
        z -= 0.2;
        a.style.fontSize = z + "cqw";
      }
    });
  const FN = {
    caveat: "Caveat,cursive",
    kalam: "Kalam,cursive",
    dancing: "'Dancing Script',cursive",
    lora: "Lora,Georgia,serif",
    elite: "'Special Elite','Courier New',monospace",
    manrope: "Manrope,sans-serif",
  };
  let pi = 0;
  const paras = (el) => {
    const all = [...el.children].filter((x) => x.textContent.trim());
    const b = all.filter((x) => !x.classList.contains("script"));
    return b.length ? b : all;
  };
  const esc = (t) =>
    String(t).replace(
      /[&<>]/g,
      (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m],
    );
  const para = () => {
    const c = document.createElement("div");
    c.innerHTML = clean();
    c.querySelectorAll("span").forEach((s) => s.removeAttribute("class"));
    const L = paras(c);
    if (L.length) return L[Math.min(pi, L.length - 1)].outerHTML;
    const t = ed.innerText.trim().split(/\n+/)[0] || "";
    return t ? "<p>" + esc(t) + "</p>" : "";
  };
  const draw = () => {
    const c = PC[key];
    pn.textContent = c.name;
    pt.textContent = ttl.value.trim() || "Untitled letter";
    pb.innerHTML =
      '<p class="pc-to">To ' + esc(to.value.trim() || "you") + ",</p>" + para();
    pto.textContent = to.value;
    prel.textContent = REL;
    pmd.textContent = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    pc.style.setProperty("--ar", c.ar);
    pc.style.setProperty("--ink", c.ink);
    ["x", "y", "w", "h"].forEach((n, i) =>
      pc.style.setProperty("--msg-" + n, c.msg[i] + "%"),
    );
    ["x", "w", "y1", "y2"].forEach((n, i) =>
      pc.style.setProperty("--a-" + n, c.addr[i] + "%"),
    );
    const fs = front.value || c.src + "-front.jpg";
    if (!pcf.src.endsWith(fs)) pcf.src = fs;
    framePic();
    if (!pcb.src.endsWith(c.src + "-back.jpg")) pcb.src = c.src + "-back.jpg";
    upx.hidden = !front.value;
    upb.lastChild.textContent = front.value
      ? " Change your front image"
      : " Use your own front image";
    [...chips.children].forEach((x) =>
      x.classList.toggle("on", x.dataset.k == key),
    );
    paper.value = key;
    if (FN[pfont.value]) {
      pc.dataset.tf = 1;
      pc.style.setProperty("--tf", FN[pfont.value]);
    } else {
      delete pc.dataset.tf;
      pc.style.removeProperty("--tf");
    }
    if (/^#[0-9a-f]{6}$/i.test(pcolor.value)) {
      pc.dataset.tc = 1;
      pc.style.setProperty("--tc", pcolor.value);
      cpk.value = pcolor.value;
    } else {
      delete pc.dataset.tc;
      pc.style.removeProperty("--tc");
    }
    fnt.value = pfont.value;
    [...swa.querySelectorAll(".cs")].forEach((b) =>
      b.classList.toggle(
        "on",
        b.dataset.c.toLowerCase() == pcolor.value.toLowerCase(),
      ),
    );
    requestAnimationFrame(() => {
      fit(document.querySelector(".pc-msg"), pb);
      fitAds(pc);
      wc.textContent =
        ed.innerText.trim().split(/\s+/).filter(Boolean).length +
        " words" +
        (pc.classList.contains("cut") ? " · too long for the card" : "");
    });
  };
  const faces = (el) => {
    const fl = el.classList.contains("flipped");
    const i = el.querySelector(".pc-inner");
    i.style.transformStyle = "flat";
    el.querySelector(".pc-front").style.cssText =
      "display:" +
      (fl ? "block" : "none") +
      ";transform:none;backface-visibility:visible";
    el.querySelector(".pc-back").style.cssText =
      "display:" +
      (fl ? "none" : "block") +
      ";transform:none;backface-visibility:visible";
  };
  let busy = 0;
  const turn = (el) => {
    if (busy) return;
    busy = 1;
    el.classList.remove("fx-turning");
    void el.offsetWidth;
    el.classList.add("fx-turning");
    el.classList.toggle("flipped");
    requestAnimationFrame(() => {
      fit(el.querySelector(".pc-msg"), el.querySelector(".pc-text"));
      fitAds(el);
    });
    setTimeout(() => {
      el.classList.remove("fx-turning");
      busy = 0;
    }, 1000);
  };
  const side = (b) => {
    if (back !== b) {
      back = b;
      turn(pc);
    }
  };
  /* one save at a time: a second save while the first is in flight would create a duplicate letter */
  let saving = false, again = false;
  const save = async (keepalive) => {
    if (saving) { again = true; return; }
    saving = true;
    body.value = clean();
    const f = new FormData(ef);
    f.set("ajax", "1");
    try {
      const res = await post(f, keepalive ? { keepalive: true } : null);
      const r = await res.json();
      if (r.ok) {
        lid.value = r.id;
        history.replaceState(null, "", "?p=editor&id=" + r.id);
        sv.textContent = "Saved just now";
      } else sv.textContent = r.err || "Not saved";
    } catch (e) {
      sv.textContent = "Not saved";
    }
    saving = false;
    if (again) { again = false; save(); }
  };
  const queue = () => {
    sv.textContent = "Saving…";
    clearTimeout(t);
    t = setTimeout(save, 1500);
  };
  /* leaving the tab or page: save right now instead of losing the last second of typing */
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState == "hidden" && sv.textContent == "Saving…") { clearTimeout(t); save(true); }
  });
  addEventListener("beforeunload", (e) => {
    if (sv.textContent == "Saving…") { e.preventDefault(); e.returnValue = ""; }
  });
  ef.onsubmit = async (e) => {
    body.value = clean();
    const keep = e.submitter && e.submitter.name == "keep";
    if (!keep || !window.Swal) return;
    e.preventDefault();
    clearTimeout(t);
    sv.textContent = "Saving…";
    const f = new FormData(ef);
    f.set("ajax", "1");
    f.set("keep", "1");
    try {
      const r = await (await post(f)).json();
      if (!r.ok) throw 0;
      lid.value = r.id;
      sv.textContent = "Saved just now";
      await Swal.fire({
        icon: "success",
        title: "Your letter is finished",
        text: "It’s tucked away in Unsent, just for you.",
        confirmButtonText: "See my letters",
      });
      location.href = "?p=unsent";
    } catch (x) {
      /* ajax failed: fall back to a normal submit so nothing is lost */
      const k = document.createElement("input");
      k.type = "hidden";
      k.name = "keep";
      k.value = "1";
      ef.appendChild(k);
      ef.submit();
    }
  };
  [ed, ttl, to].forEach((x) =>
    x.addEventListener("input", () => {
      to.size = Math.max(7, to.value.length);
      draw();
      queue();
    }),
  );
  kind.onchange = () => {
    kind.className = "tag " + kind.value;
    queue();
  };
  $(".tb [data-c], .ib-row [data-c]").forEach((b) => {
    b.onmousedown = (e) => e.preventDefault();
    b.onclick = () => {
      ed.focus();
      document.execCommand(b.dataset.c);
      /* the browser may put a list inside a <p>: lift it out so the letter stays valid */
      if (/List$/.test(b.dataset.c)) {
        ed.querySelectorAll("p > ul, p > ol").forEach((l) => {
          const p = l.parentNode;
          if (p.parentNode === ed && p.childNodes.length == 1) {
            p.replaceWith(l);
            const li = l.querySelector("li");
            if (li) {
              const r = document.createRange();
              r.selectNodeContents(li);
              r.collapse(false);
              getSelection().removeAllRanges();
              getSelection().addRange(r);
            }
          }
        });
      }
      draw();
      queue();
    };
  });
  /* per-selection font + size: wrap the selection in <span class="f-lora s-24"> */
  let lastR = null;
  const ZW = "\u200b";
  function normalize() {
    ed.querySelectorAll("font").forEach((f) => {
      while (f.firstChild) f.parentNode.insertBefore(f.firstChild, f);
      f.remove();
    });
    ed.querySelectorAll("span[style]").forEach((s) => s.removeAttribute("style"));
  }
  function sync() {
    const s = getSelection();
    if (!s.anchorNode || !ed.contains(s.anchorNode)) return;
    const el = s.anchorNode.nodeType == 3 ? s.anchorNode.parentNode : s.anchorNode;
    let face = "",
      size = "";
    for (let n = el; n && n !== ed; n = n.parentNode)
      if (n.classList)
        n.classList.forEach((c) => {
          if (!face && c.startsWith("f-")) face = c.slice(2);
          if (!size && /^s-\d+$/.test(c)) size = c.slice(2);
        });
    efnt.value = face;
    if (!size) {
      const px = String(Math.round(parseFloat(getComputedStyle(el).fontSize)));
      size = [...esz.options].some((o) => o.value == px) ? px : "";
    }
    esz.value = size;
  }
  document.addEventListener("selectionchange", () => {
    const s = getSelection();
    if (s.rangeCount && ed.contains(s.anchorNode)) {
      lastR = s.getRangeAt(0).cloneRange();
      sync();
    }
  });
  const setCls = (span, kind, val) => {
    [...span.classList].forEach((c) => {
      if (c.startsWith(kind + "-")) span.classList.remove(c);
    });
    span.classList.add(kind + "-" + val);
  };
  const ours = (n) =>
    n && n.nodeName == "SPAN" && [...n.classList].some((c) => /^(f|s)-/.test(c));
  const textNodes = (r) => {
    const root =
      r.commonAncestorContainer.nodeType == 3
        ? r.commonAncestorContainer.parentNode
        : r.commonAncestorContainer;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT),
      out = [];
    let n;
    while ((n = w.nextNode()))
      if (n.data.length && r.intersectsNode(n)) out.push(n);
    return out;
  };
  /* kind: "f" (font) or "s" (size) */
  const applyFmt = (kind, val) => {
    ed.focus();
    const sel = getSelection();
    let r = lastR && ed.contains(lastR.commonAncestorContainer) ? lastR : null;
    if (!r) {
      r = document.createRange();
      r.selectNodeContents(ed);
      r.collapse(false);
    }
    if (r.collapsed) {
      const n = r.startContainer,
        par = n.nodeType == 3 ? n.parentNode : null;
      let span;
      if (par && ours(par) && par.childNodes.length == 1 && n.data == ZW) {
        span = par;
      } else {
        span = document.createElement("span");
        span.textContent = ZW;
        r.insertNode(span);
      }
      setCls(span, kind, val);
      const nr = document.createRange();
      nr.setStart(span.firstChild, 1);
      nr.collapse(true);
      sel.removeAllRanges();
      sel.addRange(nr);
      lastR = nr.cloneRange();
    } else {
      const spans = [];
      textNodes(r).forEach((n) => {
        let s = n === r.startContainer ? r.startOffset : 0,
          e = n === r.endContainer ? r.endOffset : n.length;
        if (e <= s) return;
        let mid = n;
        if (s > 0) mid = n.splitText(s);
        if (e - s < mid.length) mid.splitText(e - s);
        let span = mid.parentNode;
        if (!(ours(span) && span.childNodes.length == 1)) {
          span = document.createElement("span");
          mid.replaceWith(span);
          span.appendChild(mid);
        }
        setCls(span, kind, val);
        spans.push(span);
      });
      if (spans.length) {
        const nr = document.createRange();
        nr.setStart(spans[0].firstChild, 0);
        const last = spans[spans.length - 1].lastChild;
        nr.setEnd(last, last.length);
        sel.removeAllRanges();
        sel.addRange(nr);
        lastR = nr.cloneRange();
      }
    }
    sync();
    draw();
    queue();
  };
  efnt.onchange = () => {
    const v = efnt.value;
    if (!v) return;
    const go = () => applyFmt("f", v);
    if (document.fonts)
      document.fonts.load("20px " + FN[v].split(",")[0]).then(go, go);
    else go();
  };
  esz.onchange = () => {
    if (esz.value) applyFmt("s", esz.value);
  };
  ed.addEventListener("input", normalize);
  try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch (e) {}
  ed.addEventListener("paste", (e) => {
    const txt = (e.clipboardData || window.clipboardData).getData("text/plain");
    if (txt == null) return;
    e.preventDefault();
    document.execCommand("insertText", false, txt);
  });
  ed.addEventListener("input", () => {
    if (ed.firstChild && ed.firstChild.nodeType == 3) document.execCommand("formatBlock", false, "p");
  });
  const mark = () => {
    ed.querySelectorAll("p.active").forEach((p) =>
      p.classList.remove("active"),
    );
    const s = getSelection();
    if (!s.anchorNode) return;
    const n =
      s.anchorNode.nodeType == 3 ? s.anchorNode.parentNode : s.anchorNode;
    const p = n.closest && n.closest("#ed > p");
    if (p && !p.classList.contains("script")) p.classList.add("active");
  };
  ed.addEventListener("keyup", mark);
  ed.addEventListener("click", mark);
  chips.onclick = (e) => {
    const c = e.target.closest(".pt");
    if (!c) return;
    key = c.dataset.k;
    draw();
    queue();
  };
  fnt.onchange = () => {
    pfont.value = fnt.value;
    if (FN[fnt.value] && document.fonts)
      document.fonts
        .load("700 20px " + FN[fnt.value].split(",")[0])
        .then(draw, draw);
    draw();
    queue();
  };
  swa.onclick = (e) => {
    const b = e.target.closest(".cs");
    if (!b) return;
    pcolor.value = b.dataset.c;
    draw();
    queue();
  };
  cpk.oninput = () => {
    pcolor.value = cpk.value;
    draw();
    queue();
  };
  const pick = () => {
    const s = getSelection();
    if (!s.anchorNode || !ed.contains(s.anchorNode)) return;
    const n =
      s.anchorNode.nodeType == 3 ? s.anchorNode.parentNode : s.anchorNode;
    const p = n.closest("#ed > *");
    if (!p) return;
    const i = paras(ed).indexOf(p);
    if (i >= 0 && i !== pi) {
      pi = i;
      draw();
    }
  };
  ed.addEventListener("keyup", pick);
  ed.addEventListener("click", pick);
  faces(pc);
  pc.onclick = () => side(!back);
  addEventListener("resize", () => fit(document.querySelector(".pc-msg"), pb));
  expand.onclick = () => {
    mp.innerHTML = stage.innerHTML;
    mp.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
    modal.hidden = false;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Letter preview");
    cm.focus();
    const m = mp.querySelector(".pc");
    m.classList.remove("flipped");
    faces(m);
    m.onclick = () => turn(m);
    fit(mp.querySelector(".pc-msg"), mp.querySelector(".pc-text"));
    fitAds(m);
  };
  const shut = () => {
    if (modal.hidden) return;
    modal.hidden = true;
    mp.innerHTML = "";
    expand.focus();
  };
  cm.onclick = shut;
  modal.onclick = (e) => {
    if (e.target == modal) shut();
  };
  addEventListener("keydown", (e) => {
    if (e.key == "Escape") shut();
  });
  clr.onclick = async () => {
    const ok = window.Swal
      ? (
          await Swal.fire({
            icon: "warning",
            title: "Clear this letter?",
            text: "The text and title will be wiped so you can start fresh.",
            showCancelButton: true,
            confirmButtonText: "Yes, clear it",
            cancelButtonText: "Keep writing",
            reverseButtons: true,
            focusCancel: true,
            customClass: { confirmButton: "swal-danger" },
          })
        ).isConfirmed
      : confirm("Clear this letter and start fresh?");
    if (!ok) return;
    ed.innerHTML = '<p class="script">Dear you,</p><p><br></p><p class="script sm">With love,</p>';
    ttl.value = "";
    draw();
    queue();
  };
  upb.onclick = () => upf.click();
  upf.onchange = async () => {
    const f = upf.files[0];
    if (!f) return;
    upm.textContent = "Uploading…";
    const fd = new FormData();
    fd.append("a", "pcup");
    fd.append("pic", f);
    try {
      const r = await (await post(fd)).json();
      if (r.ok) {
        front.value = r.src;
        upm.textContent = "Your image is on the front";
        draw();
        queue();
      } else upm.textContent = r.err;
    } catch (e) {
      upm.textContent = "Upload failed, try again";
    }
    upf.value = "";
  };
  upx.onclick = () => {
    front.value = "";
    upm.textContent = "Back to the original front";
    draw();
    queue();
  };
  /* picture size and position on the card front: fit, zoom, left-right, up-down */
  const framePic = () => {
    const num = (el, lo, hi, d) => (isNaN(parseFloat(el.value)) ? d : Math.min(hi, Math.max(lo, parseFloat(el.value))));
    const z = num(fz, 100, 300, 100),
      x = num(fx, 0, 100, 50),
      y = num(fy, 0, 100, 50);
    pcf.style.objectFit = ffit.value == "contain" ? "contain" : "cover";
    pcf.style.objectPosition = x + "% " + y + "%";
    pcf.style.transformOrigin = x + "% " + y + "%";
    pcf.style.transform = z > 100 ? "scale(" + z / 100 + ")" : "";
    fzr.value = z;
    fxr.value = x;
    fyr.value = y;
    fzo.textContent = z + "%";
    fxo.textContent = x + "%";
    fyo.textContent = y + "%";
    $(".pfx .seg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v == ffit.value)));
    pfre.disabled = z == 100 && x == 50 && y == 50 && ffit.value != "contain";
  };
  [[fzr, fz], [fxr, fx], [fyr, fy]].forEach(([r, h]) => {
    r.oninput = () => {
      h.value = r.value;
      framePic();
      queue();
    };
  });
  $(".pfx .seg button").forEach((b) => {
    b.onclick = () => {
      ffit.value = b.dataset.v;
      framePic();
      queue();
    };
  });
  pfre.onclick = () => {
    ffit.value = "cover";
    fz.value = 100;
    fx.value = 50;
    fy.value = 50;
    framePic();
    queue();
  };
  window.EdApi = { draw, queue };
  draw();
}
