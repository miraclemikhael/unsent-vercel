/* Unsent · js/format.js · letter editor: heading and left / center / right alignment. Needs write.js first (it sets window.EdApi). */
/* global $, EdApi */
(() => {
  const ed = document.getElementById("ed"),
    hbtn = document.getElementById("hbtn");
  if (!ed || !hbtn || !window.EdApi) return;
  const ALIGN = ["ta-l", "ta-c", "ta-r"];
  const als = $(".tb [data-al]");
  let saved = null;
  /* the buttons take focus away from the text: remember where the caret was */
  document.addEventListener("selectionchange", () => {
    const s = getSelection();
    if (s.rangeCount && ed.contains(s.anchorNode)) {
      saved = s.getRangeAt(0).cloneRange();
      pressed();
    }
  });
  const restore = () => {
    ed.focus();
    const s = getSelection();
    if (saved && ed.contains(saved.commonAncestorContainer)) {
      s.removeAllRanges();
      s.addRange(saved);
    }
  };
  /* the top-level paragraphs the selection touches */
  const blocks = () => {
    const s = getSelection();
    if (!s.rangeCount || !ed.contains(s.anchorNode)) return [];
    const r = s.getRangeAt(0);
    return [...ed.children].filter((b) => r.intersectsNode(b) || b.contains(r.startContainer));
  };
  const pressed = () => {
    const b = blocks()[0];
    hbtn.setAttribute("aria-pressed", String(!!b && b.classList.contains("hd")));
    als.forEach((x) => x.setAttribute("aria-pressed", String(!!b && (ALIGN.find((c) => b.classList.contains(c)) || "ta-l") == "ta-" + x.dataset.al)));
  };
  [hbtn, ...als].forEach((b) => (b.onmousedown = (e) => e.preventDefault()));
  hbtn.onclick = () => {
    restore();
    const bs = blocks();
    const on = bs.some((b) => !b.classList.contains("hd"));
    bs.forEach((b) => {
      b.classList.toggle("hd", on);
      if (!b.className) b.removeAttribute("class");
    });
    pressed();
    EdApi.draw();
    EdApi.queue();
  };
  als.forEach((a) => {
    a.onclick = () => {
      restore();
      blocks().forEach((b) => {
        b.classList.remove(...ALIGN);
        if (a.dataset.al != "l") b.classList.add("ta-" + a.dataset.al);
        if (!b.className) b.removeAttribute("class");
      });
      pressed();
      EdApi.draw();
      EdApi.queue();
    };
  });
  pressed();
})();
