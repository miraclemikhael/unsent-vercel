/* Unsent · js/google.js · "Continue with Google" button on sign in / create account. */
/* global $, CSRF, post, Swal */
(() => {
  const box = document.getElementById("gbtn");
  if (!box) return;
  const tell = (msg, icon) => (window.Swal ? Swal.fire({ icon: icon || "info", title: msg, confirmButtonText: "OK" }) : alert(msg));
  const fall = document.getElementById("gfall");
  if (!window.GID) {
    fall.onclick = () => tell("Google sign-in isn’t set up yet. Add GOOGLE_CLIENT_ID in config/secrets.php.");
    return;
  }
  const done = async (res) => {
    const f = new FormData();
    f.set("a", "google");
    f.set("credential", res.credential);
    try {
      const r = await (await post(f)).json();
      if (r.ok) location.href = r.url;
      else tell(r.err || "Google sign-in failed.", "error");
    } catch (e) {
      tell("Google sign-in failed. Check your connection.", "error");
    }
  };
  const init = () => {
    if (!(window.google && google.accounts && google.accounts.id)) return false;
    google.accounts.id.initialize({ client_id: window.GID, callback: done });
    box.innerHTML = "";
    google.accounts.id.renderButton(box, { theme: "outline", size: "large", shape: "rectangular", text: "continue_with", logo_alignment: "center", width: Math.min(400, Math.max(200, box.clientWidth || 320)) });
    return true;
  };
  /* the Google script loads async: try now, then when it says it is ready, then keep trying a little */
  if (!init()) {
    window.onGoogleLibraryLoad = init;
    let n = 0;
    const t = setInterval(() => (init() || ++n > 40) && clearInterval(t), 250);
  }
})();
