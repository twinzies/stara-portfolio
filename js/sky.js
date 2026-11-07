/*
 * Interactive night sky.
 * Redraws the hero photo on a canvas and lifts the bright stars out of it as
 * particles. The pointer pushes and swirls them, they leave light trails, and
 * springs pull them back home. The photo also shifts slightly with the pointer.
 */
(function () {
  const canvas = document.getElementById('sky');
  if (!canvas || !canvas.getContext) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = canvas.getContext('2d');
  const SRC = canvas.dataset.src;
  const POS_Y = 0.4;          // matches background-position: center 40%
  const OVERSCAN = 1.04;      // headroom so parallax never shows an edge
  const PARALLAX = 18;        // px of photo shift at the viewport edge
  const RADIUS = 150;         // pointer influence radius (css px)
  const SPRING = 0.035;
  const DAMPING = 0.88;

  let W = 0, H = 0, dpr = 1;
  let img, stars = [];
  let view = { s: 1, dx: 0, dy: 0 };
  const pointer = { x: -9999, y: -9999, vx: 0, vy: 0, active: false, energy: 0 };
  const par = { x: 0, y: 0 };
  let running = false, raf = 0, t = 0;

  // ---------- Setup ----------
  img = new Image();
  img.onload = function () {
    sampleStars();
    resize();
    canvas.classList.add('is-ready');
    start();
  };
  img.src = SRC;

  function sampleStars() {
    // Downscale the photo and keep pixels that are bright and brighter than their neighbours.
    const sw = 480, sh = Math.round(sw * img.naturalHeight / img.naturalWidth);
    const off = document.createElement('canvas');
    off.width = sw; off.height = sh;
    const o = off.getContext('2d');
    o.drawImage(img, 0, 0, sw, sh);
    const d = o.getImageData(0, 0, sw, sh).data;
    const lum = function (x, y) { const i = (y * sw + x) * 4; return 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; };

    const found = [];
    for (let y = 1; y < sh - 1; y++) {
      for (let x = 1; x < sw - 1; x++) {
        const l = lum(x, y);
        if (l < 85) continue;
        if (l < lum(x - 1, y) || l < lum(x + 1, y) || l < lum(x, y - 1) || l < lum(x, y + 1)) continue;
        const i = (y * sw + x) * 4;
        found.push({ hx: x / sw, hy: y / sh, l: l, r: d[i], g: d[i + 1], b: d[i + 2] });
      }
    }
    found.sort(function (a, b) { return b.l - a.l; });
    const max = window.innerWidth < 700 ? 500 : 1400;
    stars = found.slice(0, max).map(function (p) {
      const k = Math.min(1, (p.l - 85) / 170);
      // Lift the colour toward white so stars glow, keep a hint of their hue.
      const mix = function (c) { return Math.round(c + (255 - c) * 0.55); };
      return {
        hx: p.hx, hy: p.hy, x: 0, y: 0, vx: 0, vy: 0,
        size: 0.6 + k * 1.8,
        alpha: 0.35 + k * 0.65,
        color: 'rgb(' + mix(p.r) + ',' + mix(p.g) + ',' + mix(p.b) + ')',
        phase: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 1.6,
        placed: false
      };
    });
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Cover the viewport plus enough margin that parallax never reveals an edge.
    const m = PARALLAX * 4;
    const s = Math.max((W + m) / img.naturalWidth, (H + m) / img.naturalHeight) * OVERSCAN;
    view = { s: s, dx: (W - img.naturalWidth * s) / 2, dy: (H - img.naturalHeight * s) * POS_Y };
    stars.forEach(function (st) { st.placed = false; });
  }

  // ---------- Input ----------
  function onMove(e) {
    const x = e.clientX, y = e.clientY;
    if (pointer.active) {
      // Clamp so a jump (e.g. pointer re-entering the window) is not a "flick".
      pointer.vx = Math.max(-30, Math.min(30, x - pointer.x));
      pointer.vy = Math.max(-30, Math.min(30, y - pointer.y));
      pointer.energy = Math.min(1, pointer.energy + Math.hypot(pointer.vx, pointer.vy) / 60);
    }
    pointer.x = x; pointer.y = y; pointer.active = true;
  }
  function onLeave() { pointer.active = false; pointer.x = pointer.y = -9999; }

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onMove, { passive: true });
  document.addEventListener('pointerleave', onLeave);
  window.addEventListener('blur', onLeave);
  window.addEventListener('resize', function () { if (img.complete) resize(); });

  // Pause while a panel covers the sky or the tab is hidden.
  function shouldRun() { return !document.hidden && !document.body.classList.contains('panel-open'); }
  function start() { if (!running && shouldRun()) { running = true; raf = requestAnimationFrame(frame); } }
  function stop() { running = false; cancelAnimationFrame(raf); }
  document.addEventListener('visibilitychange', function () { shouldRun() ? start() : stop(); });
  new MutationObserver(function () { shouldRun() ? start() : stop(); })
    .observe(document.body, { attributes: true, attributeFilter: ['class'] });

  // ---------- Frame ----------
  function frame() {
    if (!running) return;
    t += 1 / 60;

    // Ease the parallax toward the pointer, back to centre when it leaves.
    const tx = pointer.active ? (pointer.x / W - 0.5) * -PARALLAX * 2 : 0;
    const ty = pointer.active ? (pointer.y / H - 0.5) * -PARALLAX * 2 : 0;
    par.x += (tx - par.x) * 0.05;
    par.y += (ty - par.y) * 0.05;
    pointer.energy *= 0.96;
    pointer.vx *= 0.8; pointer.vy *= 0.8;

    const iw = img.naturalWidth * view.s, ih = img.naturalHeight * view.s;
    const ox = view.dx + par.x, oy = view.dy + par.y;

    // Photo (the theme tint is a CSS layer above the canvas).
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(img, ox, oy, iw, ih);

    // Soft glow that follows the pointer and swells with movement.
    ctx.globalCompositeOperation = 'lighter';
    if (pointer.active) {
      const gr = RADIUS * (1.1 + pointer.energy * 0.6);
      const g = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, gr);
      g.addColorStop(0, 'rgba(255, 170, 120, ' + (0.10 + pointer.energy * 0.12) + ')');
      g.addColorStop(0.5, 'rgba(140, 150, 255, ' + (0.05 + pointer.energy * 0.06) + ')');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(pointer.x - gr, pointer.y - gr, gr * 2, gr * 2);
    }

    ctx.lineCap = 'round';
    const r2 = RADIUS * RADIUS;
    const push = 1.6 + pointer.energy * 4;

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const hx = ox + s.hx * iw, hy = oy + s.hy * ih;
      if (!s.placed) { s.x = hx; s.y = hy; s.placed = true; }

      // Spring home.
      s.vx += (hx - s.x) * SPRING;
      s.vy += (hy - s.y) * SPRING;

      // Pointer: push outward plus a swirl, stronger the faster it moves.
      const dx = s.x - pointer.x, dy = s.y - pointer.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < r2 && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const f = (1 - d / RADIUS);
        const ff = f * f * push;
        s.vx += (dx / d) * ff + (-dy / d) * ff * 0.9 + pointer.vx * f * 0.08;
        s.vy += (dy / d) * ff + (dx / d) * ff * 0.9 + pointer.vy * f * 0.08;
      }

      s.vx *= DAMPING; s.vy *= DAMPING;
      const v = Math.hypot(s.vx, s.vy);
      if (v > 14) { s.vx *= 14 / v; s.vy *= 14 / v; }
      const px = s.x, py = s.y;
      s.x += s.vx; s.y += s.vy;

      const speed = Math.abs(s.vx) + Math.abs(s.vy);
      const twinkle = 0.65 + 0.35 * Math.sin(t * s.speed * 2 + s.phase);
      const a = Math.min(1, s.alpha * twinkle + speed * 0.04);
      ctx.globalAlpha = a;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.size + Math.min(speed * 0.08, 1.2);
      ctx.beginPath();
      // Trail grows with speed; at rest it is a dot.
      ctx.moveTo(px - s.vx * 1.8, py - s.vy * 1.8);
      ctx.lineTo(s.x + 0.01, s.y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }
})();
