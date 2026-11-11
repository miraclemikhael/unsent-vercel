/* Unsent · js/password.js · password eye, tips, validation, delete account. Loaded in order by includes/footer.php (core.js first). */
/* global $, CSRF, post, Swal */
/* passwords: eye toggle, SweetAlert tips + validation, delete-account confirm */
(() => {
  const S = window.Swal;
  const say = (o) =>
    S
      ? S.fire(o)
      : (alert([o.title, o.text].filter(Boolean).join("\n")),
        Promise.resolve({ isConfirmed: true }));
  const ok = (p) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);
  const ico = (d) =>
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    d +
    "</svg>";
  const EYE = ico(
    '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  );
  const OFF = ico(
    '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',
  );
  $("input[type=password]").forEach((i) => {
    const w = document.createElement("span");
    w.className = "pwf";
    i.parentNode.insertBefore(w, i);
    w.appendChild(i);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "eye";
    b.innerHTML = EYE;
    b.setAttribute("aria-label", "Show password");
    b.onclick = () => {
      const show = i.type == "password";
      i.type = show ? "text" : "password";
      b.innerHTML = show ? OFF : EYE;
      b.setAttribute("aria-label", show ? "Hide password" : "Show password");
    };
    w.appendChild(b);
  });
  $("form")
    .filter((f) => {
      const a = f.querySelector("input[name=a]");
      return a && /^(register|recover)$/.test(a.value);
    })
    .forEach((f) => {
      const pw = f.querySelector("input[name=pw]"),
        p2 = f.querySelector("input[name=pw2]");
      const meter = document.createElement("div");
      meter.className = "pwm";
      meter.innerHTML = '<i></i><small aria-live="polite">Use 8+ characters, with a letter and a number</small>';
      (pw.closest(".pwf") || pw).after(meter);
      const LV = [["Too short", "#d9776d"], ["Weak", "#d9776d"], ["Okay", "#e0a23a"], ["Good", "#9bb94a"], ["Strong", "#4f9d69"]];
      const score = (v) => {
        if (!v) return 0;
        let n = 0;
        if (v.length >= 8) n++;
        if (/[A-Za-z]/.test(v) && /\d/.test(v)) n++;
        if (v.length >= 12) n++;
        if (/[^A-Za-z0-9]/.test(v) && /[A-Z]/.test(v)) n++;
        return n;
      };
      pw.addEventListener("input", () => {
        const n = score(pw.value), l = LV[n];
        meter.style.setProperty("--s", n);
        meter.style.setProperty("--c", l[1]);
        meter.querySelector("small").textContent = pw.value ? l[0] : "Use 8+ characters, with a letter and a number";
      });
      f.addEventListener("submit", (e) => {
        const v = pw.value;
        let m = null,
          t = pw;
        if (!ok(v))
          m = [
            "That password is too weak",
            "Use at least 8 characters, with a letter and a number.",
          ];
        else if (p2 && p2.value !== v) {
          m = [
            "Passwords don’t match",
            "Type the same password in both boxes.",
          ];
          t = p2;
        }
        if (m) {
          e.preventDefault();
          say({
            icon: "error",
            title: m[0],
            text: m[1],
            confirmButtonText: "Okay",
          }).then(() => t.focus());
        }
      });
    });
  const da = document.getElementById("da");
  if (da)
    da.addEventListener("submit", (e) => {
      if (da.dataset.ok) return;
      e.preventDefault();
      if (!S) {
        if (
          confirm("Are you sure? This deletes your account and every letter.")
        ) {
          da.dataset.ok = 1;
          da.submit();
        }
        return;
      }
      S.fire({
        icon: "warning",
        title: "Are you sure?",
        text: "This permanently deletes your account and every unsent letter. You can’t undo this.",
        showCancelButton: true,
        confirmButtonText: "Yes, delete everything",
        cancelButtonText: "Keep my account",
        reverseButtons: true,
        focusCancel: true,
        customClass: { confirmButton: "swal-danger" },
      }).then((r) => {
        if (r.isConfirmed) {
          da.dataset.ok = 1;
          da.submit();
        }
      });
    });
})();

