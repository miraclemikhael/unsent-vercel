/* Unsent · js/scene3d.js · small 3D touches (three.js loads only when one of them is on the page):
   - Friends, empty panel: a paper plane drifting
   - Mood: the 14-day chart as 3D bars, the balance chart as a 3D ring (the flat HTML versions stay as fallback)
   - Write page (phones): a slim desk strip with a pen
   - Home, "What would you say" card: a sealed envelope that turns toward your pointer
   - Calling screen: two rings of little dots circling the avatar (starts only when a call opens, see call.js)
   No WebGL, "calm" mode or reduced motion: they sit still (or the little icon stays). */
(() => {
  /* hosts marked data-lazy wait until window.mount3d(host) is called (the call screen does this on its first call) */
  const hosts = [...document.querySelectorAll("[data-3d]:not([data-lazy])")];
  const calm = document.documentElement.hasAttribute("data-calm") || matchMedia("(prefers-reduced-motion: reduce)").matches;
  let lib;
  const load = () => (lib ||= import("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"));
  const mount = (host) =>
    !host || host.dataset.on
      ? Promise.resolve()
      : load()
    .then((THREE) => {
      host.dataset.on = "1";
      const makers = {
        plane() {
          const N = [0, 0, 1.4], L = [-1.15, 0.22, -0.9], R = [1.15, 0.22, -0.9], T = [0, 0.06, -0.6], K = [0, -0.4, -0.75];
          const g = new THREE.BufferGeometry();
          g.setAttribute("position", new THREE.Float32BufferAttribute([...N, ...L, ...T, ...N, ...T, ...R, ...N, ...T, ...K, ...T, ...L, ...K, ...T, ...K, ...R], 3));
          g.computeVertexNormals();
          const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xffec85, roughness: 0.75, flatShading: true, side: THREE.DoubleSide }));
          return { obj: m, pose: (t, px) => { m.position.y = Math.sin(t * 1.1) * 0.18; m.rotation.set(0.12 + Math.sin(t * 0.9) * 0.05, -0.7 + Math.sin(t * 0.45) * 0.5 + px * 0.4, Math.sin(t * 0.8) * 0.1); } };
        },
        envelope() {
          const grp = new THREE.Group();
          const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.15, 0.1), new THREE.MeshStandardMaterial({ color: 0xfbf9f5, roughness: 0.85 }));
          const sh = new THREE.Shape();
          sh.moveTo(-0.9, 0.575); sh.lineTo(0.9, 0.575); sh.lineTo(0, -0.12); sh.closePath();
          const flap = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }));
          flap.position.z = 0.05;
          const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.0875, 0.0875, 0.03, 28), new THREE.MeshStandardMaterial({ color: 0xd9776d, roughness: 0.5 }));
          seal.rotation.x = Math.PI / 2;
          seal.position.set(0, -0.1, 0.095);
          grp.add(body, flap, seal);
          grp.scale.setScalar(1.6);
          return { obj: grp, pose: (t, px, py) => { grp.position.y = Math.sin(t * 1.2) * 0.07; grp.rotation.set(-0.15 + py * 0.35, -0.35 + Math.sin(t * 0.6) * 0.25 + px * 0.5, 0.08 + Math.sin(t * 0.9) * 0.03); } };
        },
        mail() {
          const grp = new THREE.Group(), stdm = (c, r = 0.8) => new THREE.MeshStandardMaterial({ color: c, roughness: r, side: THREE.DoubleSide });
          const poly = (pts, c, z, d = 0.02) => { const sh = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y))); const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false }), stdm(c)); m.position.z = z; return m; };
          const back = poly([[-0.9, -0.575], [0.9, -0.575], [0.9, 0.575], [-0.9, 0.575]], 0xe8e2d8, -0.08);
          const flap = poly([[-0.9, 0.575], [0.9, 0.575], [0, 1.3]], 0xd9d2c6, -0.1);
          const front = poly([[-0.9, -0.575], [0.9, -0.575], [0.9, 0.575], [0, -0.02], [-0.9, 0.575]], 0xfbf9f5, 0.05, 0.03);
          const paper = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.05, 0.02), stdm(0xffffff, 0.9));
          const line = (y, w) => { const l = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, 0.005), stdm(0xf5c400, 0.6)); l.position.set(-0.75 + w / 2 + 0.15, y, 0.012); paper.add(l); };
          line(0.3, 0.9); line(0.14, 1.1); line(-0.02, 0.7);
          const hs = new THREE.Shape(); hs.moveTo(0, -0.12); hs.bezierCurveTo(-0.22, 0.05, -0.12, 0.2, 0, 0.1); hs.bezierCurveTo(0.12, 0.2, 0.22, 0.05, 0, -0.12);
          const heart = new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { depth: 0.02, bevelEnabled: false }), stdm(0xd9776d, 0.5));
          heart.position.set(0.45, -0.28, 0.012); paper.add(heart);
          grp.add(back, flap, paper, front);
          const cols = [0xf59ea0, 0xe9bdff, 0xffec85, 0x83c1ff, 0xa6f89b, 0xf59ea0];
          const bits = cols.map((c, i) => { const b = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.35, roughness: 0.5 })); grp.add(b); return b; });
          grp.scale.setScalar(1.05); grp.position.y = -0.25;
          return { obj: grp, pose: (t, px, py) => {
            const up = 0.5 + 0.5 * Math.sin(t * 1.3);
            paper.position.set(0, -0.05 + up * 0.62, 0);
            paper.rotation.z = Math.sin(t * 0.9) * 0.04;
            bits.forEach((b, i) => { const k = (t * 0.22 + i / bits.length) % 1; b.position.set(Math.sin(i * 2.4 + t * 0.8) * 1.35, -0.4 + k * 2.6, 0.2); b.scale.setScalar(Math.sin(k * Math.PI) * 1.2 + 0.05); b.rotation.set(t * 1.4 + i, t + i, 0); });
            grp.rotation.set(-0.12 + py * 0.3, -0.28 + Math.sin(t * 0.5) * 0.18 + px * 0.6, 0);
          } };
        },
        desk() {
          const grp = new THREE.Group(), std = (c, r = 0.8) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
          const paper = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.05, 1.55), std(0xffffff, 0.9));
          const edge = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.03, 1.61), std(0xe3dccf)); edge.position.y = -0.04;
          grp.add(edge, paper);
          const lines = [0, 1, 2, 3].map((i) => { const g = new THREE.BoxGeometry(1.7, 0.012, i ? 0.05 : 0.09); g.translate(0.85, 0, 0); const m = new THREE.Mesh(g, std(i ? 0xd9d2c4 : 0xf5c400, 0.6)); m.position.set(-0.85, 0.035, -0.45 + i * 0.3); grp.add(m); return m; });
          const pen = new THREE.Group();
          const body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.1, 14), std(0x3b3b3b, 0.5)); body.position.y = 0.78;
          const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.045, 0.3, 14), std(0xffd34d, 0.5)); grip.position.y = 0.18;
          const tip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 14), std(0xd9776d, 0.5)); tip.rotation.x = Math.PI; tip.position.y = 0.08;
          pen.add(body, grip, tip); pen.rotation.set(-0.35, 0, 0.5); grp.add(pen);
          const cols = [0xf59ea0, 0xe9bdff, 0x83c1ff];
          const dots = cols.map((c) => { const d = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.35 })); grp.add(d); return d; });
          { const slim = +host.dataset.h < 100; grp.scale.setScalar(slim ? 1.2 : 1.15); grp.position.set(slim ? 5.4 : 0, slim ? -0.2 : -0.15, 0); }
          return { obj: grp, pose: (t, px, py) => {
            const c = (t * 0.22) % 1, k = Math.min(3, Math.floor(c * 4)), f = c * 4 - k;
            lines.forEach((l, i) => { const p = Math.max(0.001, Math.min(1, c * 4 - i)); l.scale.x = p; });
            pen.position.set(-0.85 + 1.7 * f * (k ? 1 : 0.6), 0.06 + Math.abs(Math.sin(t * 9)) * 0.03, -0.45 + k * 0.3);
            dots.forEach((d, i) => { const u = (t * 0.25 + i / 3) % 1; d.position.set(-1.1 + i * 1.1 + Math.sin(t + i) * 0.2, 0.2 + u * 1.4, 0.4); d.scale.setScalar(Math.sin(u * Math.PI) * 1.2 + 0.05); d.rotation.set(t + i, t * 1.3, 0); });
            grp.rotation.set(0.75 + py * 0.2, -0.35 + Math.sin(t * 0.4) * 0.12 + px * 0.5, 0);
          } };
        },
        bars() {
          /* Mood: last 14 days as 3D bars. data-v scores 0..5 (0 = no check-in), data-c colours, data-l day letters. */
          const vals = (host.dataset.v || "").split(",").map(Number), cols = (host.dataset.c || "").split(","), lab = (host.dataset.l || "").split(",");
          const n = vals.length || 14, grp = new THREE.Group(), W = 0.34, step = W + 0.12, x0 = -((n - 1) * step) / 2, born = performance.now() / 1000;
          const mat = (c, r) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
          const slab = new THREE.Mesh(new THREE.BoxGeometry(n * step + 0.3, 0.1, 1.35), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 0.9 }));
          slab.position.set(0, -0.05, 0.1);
          grp.add(slab);
          const geo = new THREE.BoxGeometry(W, 1, W), cap = new THREE.BoxGeometry(W + 0.025, 0.05, W + 0.025);
          const bars = vals.map((v, i) => {
            const c = new THREE.Color(cols[i] || "#d9d4cb"), x = x0 + i * step;
            const b = new THREE.Mesh(geo, mat(c, 0.55)), t = new THREE.Mesh(cap, mat(c.clone().offsetHSL(0, 0, 0.07), 0.3));
            b.position.x = t.position.x = x;
            grp.add(b, t);
            const cv = document.createElement("canvas"); cv.width = cv.height = 64;
            const cx = cv.getContext("2d"); cx.font = "700 40px Manrope, sans-serif"; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillStyle = v ? "#6f695f" : "#a59f94"; cx.fillText(lab[i] || "", 32, 34);
            const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
            const l = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshBasicMaterial({ map: tx, transparent: true }));
            l.rotation.x = -Math.PI / 2; l.position.set(x, 0.012, 0.52);
            grp.add(l);
            return { b, t, h: v ? 0.12 + v * 0.44 : 0.05 };
          });
          const aspect = (host.clientWidth || +host.dataset.w || 320) / (host.clientHeight || +host.dataset.h || 210);
          grp.scale.setScalar(Math.min(1.05, (3.78 * aspect * 0.9) / (n * step + 0.5)));
          const maxH = Math.max(...bars.map((o) => o.h));
          grp.position.y = -0.15 - maxH * 0.32; /* sits in the middle of the card, whether it is empty or tall */
          return { obj: grp, pose: (t, px, py) => {
            const el = calm ? 9 : t - born;
            bars.forEach((o, i) => {
              const k = Math.min(1, Math.max(0, el * 1.5 - i * 0.06)), e = 1 - Math.pow(1 - k, 3), h = Math.max(0.04, o.h * e);
              o.b.scale.y = h; o.b.position.y = h / 2; o.t.position.y = h + 0.025;
            });
            grp.rotation.set(0.55 + py * 0.12, -0.16 + Math.sin(t * 0.5) * 0.05 + px * 0.35, 0);
          } };
        },
        donut() {
          /* Mood: balance as a chunky 3D ring. data-v counts, data-c colours. */
          const vals = (host.dataset.v || "").split(",").map(Number), cols = (host.dataset.c || "").split(",");
          const tot = vals.reduce((a, b) => a + b, 0) || 1, grp = new THREE.Group(), TAU = Math.PI * 2;
          let a0 = Math.PI / 2;
          const parts = vals.map((v, i) => {
            const span = (v / tot) * TAU, sh = new THREE.Shape();
            if (span >= TAU - 0.01) { sh.absarc(0, 0, 1.25, 0, TAU, false); const h = new THREE.Path(); h.absarc(0, 0, 0.66, 0, TAU, true); sh.holes.push(h); }
            else { const g = vals.length > 1 ? 0.05 : 0; sh.absarc(0, 0, 1.25, a0 + g / 2, a0 + span - g / 2, false); sh.absarc(0, 0, 0.66, a0 + span - g / 2, a0 + g / 2, true); }
            const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.34, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.05, bevelSegments: 3, curveSegments: 28 }), new THREE.MeshStandardMaterial({ color: new THREE.Color(cols[i] || "#ffee83"), roughness: 0.42 }));
            const mid = a0 + span / 2; a0 += span;
            grp.add(m);
            return { m, dx: Math.cos(mid), dy: Math.sin(mid) };
          });
          grp.scale.setScalar(1.05);
          return { obj: grp, pose: (t, px, py) => {
            parts.forEach((o, i) => { const k = 0.03 + 0.03 * Math.sin(t * 1.6 + i * 1.3); o.m.position.set(o.dx * k, o.dy * k, 0); });
            grp.rotation.set(-0.92 + py * 0.18, px * 0.45, Math.sin(t * 0.4) * 0.3);
          } };
        },
        orbit() {
          const root = new THREE.Group();
          const geo = new THREE.SphereGeometry(0.06, 12, 10);
          const ring = (color, n, r, tilt, spin) => {
            const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4, roughness: 0.5 });
            const mesh = new THREE.InstancedMesh(geo, mat, n);
            const g = new THREE.Group();
            g.rotation.set(tilt[0], 0, tilt[1]);
            g.add(mesh);
            root.add(g);
            const m = new THREE.Matrix4();
            return (t) => {
              for (let i = 0; i < n; i++) {
                const a = (i / n) * Math.PI * 2 + t * spin;
                const k = 0.55 + 0.75 * (0.5 + 0.5 * Math.sin(t * 2.2 - i * 0.7));
                m.makeScale(k, k, k).setPosition(Math.cos(a) * r, 0, Math.sin(a) * r);
                mesh.setMatrixAt(i, m);
              }
              mesh.instanceMatrix.needsUpdate = true;
            };
          };
          const a = ring(0xffec85, 24, 0.98, [1.15, 0.25], 0.5);
          const b = ring(0xd9776d, 18, 1.16, [1.0, -0.45], -0.35);
          return { obj: root, pose: (t, px, py) => { a(t); b(t); root.rotation.y = px * 0.3; root.rotation.x = py * 0.15; } };
        },
      };
      {
        const make = makers[host.dataset["3d"]];
        if (!make) return;
        const W = host.clientWidth || +host.dataset.w || 220, H = host.clientHeight || +host.dataset.h || 170;
        const r = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
        r.setSize(W, H);
        r.domElement.setAttribute("aria-hidden", "true");
        const scene = new THREE.Scene();
        const cam = new THREE.PerspectiveCamera(35, W / H, 0.1, 50);
        cam.position.set(0, 0.6, 6);
        cam.lookAt(0, 0, 0);
        scene.add(new THREE.AmbientLight(0xffffff, 1.1));
        const sun = new THREE.DirectionalLight(0xffffff, 2.2);
        sun.position.set(2, 4, 3);
        scene.add(sun);
        const it = make();
        scene.add(it.obj);
        host.prepend(r.domElement);
        host.classList.add("ready");
        let px = 0, py = 0, tx = 0, ty = 0, raf = 0;
        let lt = 0, spin = 0;
        /* tap or click the little 3D toy (envelope, plane, pen desk) and it does one slow spin. Charts stay still so the numbers stay readable. */
        const toy = !host.classList.contains("chart3d");
        const draw = (t) => { lt = t; px += (tx - px) * 0.06; py += (ty - py) * 0.06; spin = spin > 0.002 ? spin * 0.95 : 0; it.pose(t, px, py); if (spin) it.obj.rotation.y += spin; r.render(scene, cam); };
        draw(0);
        /* charts keep their shape when the phone turns or the card resizes */
        if (window.ResizeObserver && host.classList.contains("chart3d")) new ResizeObserver(() => {
          const w = host.clientWidth, h = host.clientHeight;
          if (!w || !h || (Math.abs(w - r.domElement.clientWidth) < 2 && Math.abs(h - r.domElement.clientHeight) < 2)) return;
          r.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); draw(lt);
        }).observe(host);
        if (calm) return;
        const area = host.closest(".card, .callui") || host;
        area.addEventListener("pointermove", (e) => {
          const b = area.getBoundingClientRect();
          tx = ((e.clientX - b.left) / b.width) * 2 - 1;
          ty = ((e.clientY - b.top) / b.height) * 2 - 1;
        });
        area.addEventListener("pointerleave", () => { tx = ty = 0; });
        if (toy) host.addEventListener("pointerdown", () => { spin = Math.PI * 2; });
        const loop = (ms) => { draw(ms / 1000); raf = requestAnimationFrame(loop); };
        const run = () => { if (!raf && !document.hidden) raf = requestAnimationFrame(loop); };
        const stop = () => { cancelAnimationFrame(raf); raf = 0; };
        document.addEventListener("visibilitychange", () => (document.hidden ? stop() : run()));
        new IntersectionObserver((e) => (e[0].isIntersecting ? run() : stop())).observe(host);
        addEventListener("pagehide", () => { stop(); r.dispose(); });
      }
    })
    .catch(() => { /* offline or no WebGL: nothing breaks */ });
  window.mount3d = mount;
  hosts.forEach(mount);
})();
