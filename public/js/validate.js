/* Unsent · js/validate.js · replaces the browser's grey "Please fill in this field" bubble with a SweetAlert, on every form. */
/* global Swal */
(() => {
  let open = false;
  const say = (f) => {
    const v = f.validity,
      name = (f.getAttribute("aria-label") || f.placeholder || f.name || "this field").replace(/\s+/g, " ").trim();
    if (v.valueMissing) return f.type === "checkbox" ? "Please tick the box to go on." : `Please fill in “${name}”.`;
    if (v.typeMismatch && f.type === "email") return "That email doesn’t look quite right.";
    if (v.tooShort) return `“${name}” needs at least ${f.minLength} characters.`;
    if (v.patternMismatch) return `Please check “${name}”.`;
    return "Please check this field.";
  };
  document.addEventListener(
    "invalid",
    (e) => {
      if (!window.Swal) return; /* no SweetAlert: keep the browser's own message */
      e.preventDefault();
      if (open) return;
      open = true;
      const f = e.target;
      Swal.fire({ icon: "info", title: say(f), confirmButtonText: "OK", didClose: () => { open = false; try { f.focus(); } catch (x) { /* gone */ } } });
    },
    true,
  );
})();
