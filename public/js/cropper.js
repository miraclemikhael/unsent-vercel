/* Unsent · js/cropper.js · move + resize a picture inside a frame (banner 3:1, profile photo round).
   Drag to move. Pinch, wheel or slider to resize. Arrow buttons nudge. Saves a cropped JPEG.
   window.openCrop({src, ratio, round, out, title, pick}) -> Promise<{blob, file}|null>
   window.pictureFlow({kind, current, orig, ratio, round, out, title}) -> picks/crops/uploads, resolves {src, orig}|null */
/* global post, Swal */
(() => {
  const el = (h) => { const t = document.createElement("template"); t.innerHTML = h.trim(); return t.content.firstChild; };
  const loadImg = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  const say = (m, t) => window.Swal ? Swal.fire({ toast: true, position: "top", timer: 2000, showConfirmButton: false, icon: t || "info", title: m }) : alert(m);

  window.openCrop = (o) => new Promise((resolve) => {
    const ratio = o.ratio || 1, outW = o.out || (ratio > 1 ? 1200 : 512), outH = Math.round(outW / ratio);
    const ov = el(`<div class="crp" role="dialog" aria-modal="true" aria-label="${o.title || "Adjust picture"}">
      <div class="crp-p">
        <div class="crp-h"><b>${o.title || "Adjust picture"}</b><small>Drag to move. Pinch or slide to resize.</small></div>
        <div class="crp-st"><div class="crp-f${o.round ? " round" : ""}"><img alt="" draggable="false"></div></div>
        <div class="crp-c">
          <button type="button" class="crp-n" data-d="-1,0" aria-label="Move picture left">◀</button>
          <button type="button" class="crp-n" data-d="1,0" aria-label="Move picture right">▶</button>
          <button type="button" class="crp-n" data-d="0,-1" aria-label="Move picture up">▲</button>
          <button type="button" class="crp-n" data-d="0,1" aria-label="Move picture down">▼</button>
          <span class="crp-z"><button type="button" class="crp-n" data-z="-1" aria-label="Smaller">−</button><input type="range" min="100" max="400" value="100" aria-label="Size"><button type="button" class="crp-n" data-z="1" aria-label="Bigger">+</button></span>
        </div>
        <div class="crp-a">
          ${o.pick ? '<button type="button" class="crp-b ghost" data-a="pick">Choose another</button>' : ""}
          <button type="button" class="crp-b ghost" data-a="reset">Reset</button>
          <span class="crp-sp"></span>
          <button type="button" class="crp-b ghost" data-a="x">Cancel</button>
          <button type="button" class="crp-b main" data-a="ok">Save</button>
        </div>
      </div></div>`);
    document.body.appendChild(ov);
    document.documentElement.classList.add("crp-open");
    const fr = ov.querySelector(".crp-f"), im = fr.querySelector("img"), rg = ov.querySelector("input");
    const prevFocus = document.activeElement;
    let img = null, fw = 0, fh = 0, s0 = 1, z = 1, L = 0, T = 0, file = null, objUrl = null;
    const clamp = () => {
      const w = img.naturalWidth * s0 * z, h = img.naturalHeight * s0 * z;
      L = Math.min(0, Math.max(fw - w, L)); T = Math.min(0, Math.max(fh - h, T));
    };
    const draw = () => {
      clamp();
      im.style.width = img.naturalWidth * s0 * z + "px";
      im.style.height = img.naturalHeight * s0 * z + "px";
      im.style.transform = `translate(${L}px,${T}px)`;
      rg.value = Math.round(z * 100);
    };
    const zoomAt = (nz, px, py) => {          /* keep the point under (px,py) still while resizing */
      nz = Math.max(1, Math.min(4, nz));
      const k = nz / z; L = px - (px - L) * k; T = py - (py - T) * k; z = nz; draw();
    };
    const reset = () => {
      fw = fr.clientWidth; fh = fr.clientHeight;
      s0 = Math.max(fw / img.naturalWidth, fh / img.naturalHeight); z = 1;
      L = (fw - img.naturalWidth * s0) / 2; T = (fh - img.naturalHeight * s0) / 2; draw();
    };
    const setSrc = async (src) => { img = await loadImg(src); im.src = src; reset(); };
    const close = (v) => {
      document.removeEventListener("keydown", key, true);
      ov.remove(); document.documentElement.classList.remove("crp-open");
      if (objUrl) URL.revokeObjectURL(objUrl);
      try { prevFocus && prevFocus.focus(); } catch (e) {}
      resolve(v);
    };
    const key = (e) => { if (e.key === "Escape") { e.preventDefault(); close(null); } };
    document.addEventListener("keydown", key, true);

    /* drag + pinch */
    const ptr = new Map(); let last = null;
    fr.addEventListener("pointerdown", (e) => { fr.setPointerCapture(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]); last = null; });
    fr.addEventListener("pointermove", (e) => {
      if (!ptr.has(e.pointerId) || !img) return;
      const prev = ptr.get(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]);
      if (ptr.size === 1) { L += e.clientX - prev[0]; T += e.clientY - prev[1]; draw(); }
      else if (ptr.size === 2) {
        const [a, b] = [...ptr.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), r = fr.getBoundingClientRect();
        if (last) zoomAt(z * (d / last), (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top);
        last = d;
      }
    });
    const up = (e) => { ptr.delete(e.pointerId); last = null; };
    fr.addEventListener("pointerup", up); fr.addEventListener("pointercancel", up);
    fr.addEventListener("wheel", (e) => { e.preventDefault(); const r = fr.getBoundingClientRect(); zoomAt(z * (e.deltaY < 0 ? 1.08 : 1 / 1.08), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    rg.oninput = () => zoomAt(rg.value / 100, fw / 2, fh / 2);
    ov.querySelectorAll(".crp-n").forEach((b) => (b.onclick = () => {
      if (b.dataset.z) return zoomAt(z + b.dataset.z * 0.15, fw / 2, fh / 2);
      const [dx, dy] = b.dataset.d.split(",").map(Number); L -= dx * 12; T -= dy * 12; draw();
    }));
    ov.addEventListener("click", (e) => { if (e.target === ov) close(null); });
    ov.querySelector('[data-a=x]').onclick = () => close(null);
    ov.querySelector('[data-a=reset]').onclick = () => img && reset();
    const pk = ov.querySelector('[data-a=pick]');
    if (pk) pk.onclick = () => {
      const f = document.createElement("input"); f.type = "file"; f.accept = "image/png,image/jpeg,image/webp";
      f.onchange = async () => { const n = f.files[0]; if (!n) return; if (objUrl) URL.revokeObjectURL(objUrl); objUrl = URL.createObjectURL(n); file = n; try { await setSrc(objUrl); } catch (e) { say("Could not open that picture", "error"); } };
      f.click();
    };
    ov.querySelector('[data-a=ok]').onclick = () => {
      if (!img) return;
      const c = document.createElement("canvas"); c.width = outW; c.height = outH;
      const x = c.getContext("2d"), k = outW / fw;
      x.imageSmoothingQuality = "high"; x.fillStyle = "#fff"; x.fillRect(0, 0, outW, outH);
      x.drawImage(img, L * k, T * k, img.naturalWidth * s0 * z * k, img.naturalHeight * s0 * z * k);
      c.toBlob((b) => close(b ? { blob: b, file } : null), "image/jpeg", 0.9);
    };
    setSrc(o.src).then(() => ov.querySelector('[data-a=ok]').focus()).catch(() => { close(null); say("Could not open that picture", "error"); });
    addEventListener("resize", () => img && reset(), { once: true });
  });

  /* shrink a big original before sending it (keeps uploads small) */
  const shrink = async (file, max) => {
    try {
      const bm = await createImageBitmap(file), k = Math.min(1, max / Math.max(bm.width, bm.height));
      if (k >= 1 && file.size < 1.5 * 1048576) return file;
      const c = document.createElement("canvas"); c.width = Math.round(bm.width * k); c.height = Math.round(bm.height * k);
      c.getContext("2d").drawImage(bm, 0, 0, c.width, c.height);
      const b = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.9));
      return b || file;
    } catch (e) { return file; }
  };

  /* whole flow: choose (or reuse) a picture, adjust it, upload it */
  window.pictureFlow = async (o) => {
    let file = null, src = o.orig || o.current || "";
    if (!src) {
      file = await new Promise((res) => { const f = document.createElement("input"); f.type = "file"; f.accept = "image/png,image/jpeg,image/webp"; f.onchange = () => res(f.files[0] || null); f.oncancel = () => res(null); f.click(); });
      if (!file) return null;
      src = URL.createObjectURL(file);
    }
    const r = await openCrop({ src, ratio: o.ratio, round: o.round, out: o.out, title: o.title, pick: true });
    if (file) URL.revokeObjectURL(src);
    if (!r) return null;
    const fd = new FormData();
    fd.set("a", o.kind === "avatar" ? "avup" : "bnup");
    fd.set("pic", r.blob, "pic.jpg");
    const newFile = file || r.file;
    if (newFile) fd.set("orig", await shrink(newFile, 2000), "orig.jpg");
    try {
      const j = await (await post(fd)).json();
      if (!j.ok) { say(j.err || "Could not upload", "error"); return null; }
      return j;
    } catch (e) { say("Upload failed, try again", "error"); return null; }
  };
})();
