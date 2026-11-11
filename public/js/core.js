/* Unsent · js/core.js · shared helpers: $, CSRF, post. Loaded in order by includes/footer.php (core.js first). */
/* global Swal */
const $ = (s) => [...document.querySelectorAll(s)];
const CSRF = () => (document.querySelector("meta[name=csrf]") || {}).content || "";
const post = (fd, opt) => {
  fd.set("t", CSRF());
  return fetch("index.php", Object.assign({ method: "POST", body: fd }, opt || {}));
};
