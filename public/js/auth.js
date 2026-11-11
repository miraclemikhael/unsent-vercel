/* Unsent · js/auth.js · recovery code boxes (OTP). Loaded in order by includes/footer.php (core.js first). */
/* global $, CSRF, post, Swal */
const o = $(".otp input");
const codeBox = document.getElementById("code");
const syncCode = () => codeBox && (codeBox.value = o.map((x) => x.value).join(""));
o.forEach((b, i) => {
  b.inputMode = "numeric";
  b.setAttribute("aria-label", "Digit " + (i + 1) + " of " + o.length);
  b.oninput = () => {
    b.value = b.value.replace(/\D/g, "").slice(-1);
    if (b.value && o[i + 1]) o[i + 1].focus();
    syncCode();
  };
  b.onkeydown = (e) => {
    if (e.key == "Backspace" && !b.value && o[i - 1]) o[i - 1].focus();
  };
  b.onpaste = (e) => {
    const t = ((e.clipboardData || window.clipboardData).getData("text") || "").replace(/\D/g, "").slice(0, o.length);
    if (!t) return;
    e.preventDefault();
    o.forEach((x, k) => (x.value = t[k] || ""));
    syncCode();
    o[Math.min(t.length, o.length - 1)].focus();
  };
});
