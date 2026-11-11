/* Unsent · js/templates.js · writing templates. Loaded in order by includes/footer.php (core.js first). */
/* global $, CSRF, post, Swal */
/* ---------- writing templates ---------- */
(() => {
  const tpl = document.getElementById("tpl"), ed = document.getElementById("ed");
  if (!tpl || !ed) return;
  const T = {
    blank: ["Dear {to},", "", "With love,"],
    unsaid: ["Dear {to},", "There are things I never said out loud, so I'm saying them here.", "", "I wish I had told you…", "", "What I really want you to know is…", "", "With all the things I never said,"],
    thanks: ["Dear {to},", "I want to say thank you.", "", "You helped me when…", "", "I still think about…", "", "Thank you, quietly,"],
    sorry: ["Dear {to},", "I'm sorry.", "", "What I did, and what I should have done instead…", "", "I understand if you need time…", "", "Sincerely,"],
    miss: ["Dear {to},", "I miss you.", "", "The small things I miss most…", "", "If I could tell you one thing now…", "", "Always,"],
    past: ["Dear me,", "I wish I could sit next to you back then.", "", "What you were going through…", "", "What I want you to hear now…", "", "Proud of you,"],
    goodbye: ["Dear {to},", "This is my goodbye.", "", "What you meant to me…", "", "What I'm letting go of…", "", "Take care of yourself,"],
  };
  const esc = (t) => t.replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m]);
  tpl.addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-t]");
    if (!b) return;
    const to = (document.getElementById("to")?.value || "").trim() || "you";
    const lines = T[b.dataset.t].map((l) => l.replace("{to}", to));
    const dirty = ed.innerText.replace(/Dear[^\n]*|With love,?/g, "").trim().length > 0;
    if (dirty) {
      const ok = window.Swal
        ? (await Swal.fire({ icon: "question", title: "Replace what you've written?", text: "This template will replace the text in the editor.", showCancelButton: true, confirmButtonText: "Use template", cancelButtonText: "Keep mine", reverseButtons: true })).isConfirmed
        : confirm("Replace your current text with this template?");
      if (!ok) return;
    }
    const last = lines.length - 1;
    ed.innerHTML = lines
      .map((l, i) =>
        i === 0 ? `<p class="script">${esc(l)}</p>`
        : i === last ? `<p class="script sm">${esc(l)}</p>`
        : l === "" ? "<p><br></p>" : `<p>${esc(l)}</p>`)
      .join("");
    ed.dispatchEvent(new Event("input", { bubbles: true })); // refresh preview + autosave
    ed.focus();
    const first = [...ed.querySelectorAll("p:not(.script)")].find((p) => p.querySelector("br:only-child")) || ed.lastElementChild;
    const r = document.createRange();
    r.selectNodeContents(first); r.collapse(true);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  });
})();

;

