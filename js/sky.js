/*
 * Interactive night sky.
 * The hero photo is drawn once onto a static canvas. The bright stars are
 * lifted out of it as particles on a second, transparent canvas: the pointer
 * pushes and swirls them into light trails, sparks burst off it, and springs
 * pull the stars back home. Only the particle layer is redrawn each frame;
 * the photo layer shifts gently with the cursor via a cheap CSS transform.
 */
(function () {
  const canvas = document.getElementById('sky');
  if (!canvas || !canvas.getContext) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = canvas.getContext('2d');
  const SRC = canvas.dataset.src;
  const POS_Y = 0.4;          // matches background-position: center 40%
  const OVERSCAN = 1.04;      // matches the CSS backdrop's scale(1.04)
  const RADIUS = 210;         // pointer influence radius (css px)
  const SPRING = 0.05;        // higher = stars snap home faster
  const DAMPING = 0.84;       // lower = less drift after the cursor passes
  const MAX_SPARKS = 220;     // cap on live burst sparks
  const MOVING = 0.25;        // speed above which a star is drawn as a trail
  const PARALLAX = 22;        // max px the background shifts with the cursor
  const FOLLOW = 0.22;        // how fast it follows (1 = instantly, lower = smoother)

  // Static photo layer, drawn only on load and resize.
  const photo = document.createElement('canvas');
  photo.className = 'sky-layer';
  photo.setAttribute('aria-hidden', 'true');
  photo.style.willChange = 'transform';
  canvas.parentNode.insertBefore(photo, canvas);
  const pctx = photo.getContext('2d');

  let W = 0, H = 0, dpr = 1;
  let img, stars = [], sparks = [];
  const moving = [];
  const pointer = { x: -9999, y: -9999, vx: 0, vy: 0, active: false, energy: 0 };
  const par = { x: 0, y: 0, tx: 0, ty: 0, sx: NaN, sy: NaN };
  let running = false, raf = 0, t = 0, frameNo = 0, lastInput = 0;

  // ---------- Setup ----------
  img = new Image();
  img.onload = function () {
    sampleStars();
    resize();
    photo.classList.add('is-ready');
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
        if (l < 70) continue;
        if (l < lum(x - 1, y) || l < lum(x + 1, y) || l < lum(x, y - 1) || l < lum(x, y + 1)) continue;
        const i = (y * sw + x) * 4;
        found.push({ hx: x / sw, hy: y / sh, l: l, r: d[i], g: d[i + 1], b: d[i + 2] });
      }
    }
    found.sort(function (a, b) { return b.l - a.l; });
    const max = window.innerWidth < 700 ? 600 : 1600;
    // Lift colours toward white so stars glow, and round them to a small
    // palette so the canvas rarely has to switch colour while drawing.
    const tone = function (c) { return Math.min(255, Math.round((c + (255 - c) * 0.55) / 24) * 24); };
    stars = found.slice(0, max).map(function (p) {
      const k = Math.min(1, (p.l - 70) / 185);
      return {
        hx: p.hx, hy: p.hy, sx: 0, sy: 0, x: 0, y: 0, vx: 0, vy: 0,
        size: 0.6 + k * 1.8,
        alpha: 0.35 + k * 0.65,
        color: 'rgb(' + tone(p.r) + ',' + tone(p.g) + ',' + tone(p.b) + ')',
        phase: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 1.6
      };
    });
    stars.sort(function (a, b) { return a.color < b.color ? -1 : a.color > b.color ? 1 : 0; });
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    const M = PARALLAX, PW = W + M * 2, PH = H + M * 2;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    // The photo layer overhangs the viewport by M on every side, so it can
    // shift by up to M without revealing an edge. It is moved with a CSS
    // transform (GPU), never redrawn per frame.
    photo.width = Math.round(PW * dpr);
    photo.height = Math.round(PH * dpr);
    photo.style.left = photo.style.top = -M + 'px';
    photo.style.right = photo.style.bottom = 'auto';
    photo.style.width = PW + 'px';
    photo.style.height = PH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Same framing as the CSS backdrop: cover, centred, 40% down, scaled 1.04.
    const s = Math.max(PW / img.naturalWidth, PH / img.naturalHeight) * OVERSCAN;
    const iw = img.naturalWidth * s, ih = img.naturalHeight * s;
    const ox = (PW - iw) / 2, oy = (PH - ih) * POS_Y;
    pctx.drawImage(img, ox, oy, iw, ih);

    // Star homes in viewport coordinates (before the parallax offset).
    stars.forEach(function (st) {
      st.sx = ox - M + st.hx * iw; st.sy = oy - M + st.hy * ih;
      st.x = st.sx + par.x; st.y = st.sy + par.y; st.vx = st.vy = 0;
    });
  }

  // ---------- Input ----------
  function onMove(e) {
    const x = e.clientX, y = e.clientY;
    if (pointer.active) {
      // Clamp so a jump (e.g. pointer re-entering the window) is not a "flick".
      pointer.vx = Math.max(-30, Math.min(30, x - pointer.x));
      pointer.vy = Math.max(-30, Math.min(30, y - pointer.y));
      pointer.energy = Math.min(1, pointer.energy + Math.hypot(pointer.vx, pointer.vy) / 35);
      const sp = Math.hypot(pointer.vx, pointer.vy);
      if (sp > 2) burst(x, y, Math.min(5, Math.round(sp / 5)), 0.35, 6);
    }
    pointer.x = x; pointer.y = y; pointer.active = true;
    lastInput = performance.now();
  }
  function onLeave() { pointer.active = false; pointer.x = pointer.y = -9999; }

  // Sparks: short-lived streaks thrown off the cursor.
  const SPARK_COLORS = ['rgb(255,240,225)', 'rgb(255,196,150)', 'rgb(255,160,110)', 'rgb(190,205,255)', 'rgb(235,240,255)'];
  function burst(x, y, n, carry, power) {
    for (let i = 0; i < n && sparks.length < MAX_SPARKS; i++) {
      const ang = Math.random() * Math.PI * 2;
      const v = power * (0.4 + Math.random() * 0.9);
      const life = 26 + Math.random() * 34;
      sparks.push({
        x: x, y: y,
        vx: Math.cos(ang) * v + pointer.vx * carry,
        vy: Math.sin(ang) * v + pointer.vy * carry,
        life: life, max: life,
        w: 0.8 + Math.random() * 1.6,
        c: SPARK_COLORS[(Math.random() * SPARK_COLORS.length) | 0]
      });
    }
  }

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', function (e) {
    onMove(e);
    burst(e.clientX, e.clientY, 40, 0, 11);   // a big burst on click / tap
    pointer.energy = 1;
  }, { passive: true });
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
  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    frameNo++;

    // When nothing is happening, only the twinkle is animating: 30 fps is plenty.
    // Background drift: ease quickly toward the cursor, back to centre when it leaves.
    par.tx = pointer.active ? (0.5 - pointer.x / W) * PARALLAX * 2 : 0;
    par.ty = pointer.active ? (0.5 - pointer.y / H) * PARALLAX * 2 : 0;
    par.x += (par.tx - par.x) * FOLLOW;
    par.y += (par.ty - par.y) * FOLLOW;
    if (Math.abs(par.x - par.sx) > 0.05 || Math.abs(par.y - par.sy) > 0.05 || par.sx !== par.sx) {
      par.sx = par.x; par.sy = par.y;
      photo.style.transform = 'translate3d(' + par.x.toFixed(2) + 'px,' + par.y.toFixed(2) + 'px,0)';
    }
    const settling = Math.abs(par.tx - par.x) > 0.1 || Math.abs(par.ty - par.y) > 0.1;

    const idle = !settling && now - lastInput > 1200 && sparks.length === 0 && pointer.energy < 0.01;
    if (idle && (frameNo & 1)) return;
    t += idle ? 2 / 60 : 1 / 60;

    pointer.energy *= 0.92;
    pointer.vx *= 0.8; pointer.vy *= 0.8;

    ctx.clearRect(0, 0, W, H);

    // Soft glow that follows the pointer and swells with movement.
    ctx.globalCompositeOperation = 'lighter';
    if (pointer.active) {
      const gr = RADIUS * (1.25 + pointer.energy * 0.9);
      const g = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, gr);
      g.addColorStop(0, 'rgba(255, 170, 120, ' + (0.07 + pointer.energy * 0.09) + ')');
      g.addColorStop(0.5, 'rgba(140, 150, 255, ' + (0.035 + pointer.energy * 0.05) + ')');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(pointer.x - gr, pointer.y - gr, gr * 2, gr * 2);
    }

    // Stars: physics for all; resting ones are cheap dots, moving ones become trails.
    ctx.globalCompositeOperation = 'source-over';
    const r2 = RADIUS * RADIUS;
    const push = 2.6 + pointer.energy * 7;
    let color = '';
    moving.length = 0;

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];

      s.vx += (s.sx + par.x - s.x) * SPRING;
      s.vy += (s.sy + par.y - s.y) * SPRING;

      const dx = s.x - pointer.x, dy = s.y - pointer.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < r2 && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const f = (1 - d / RADIUS);
        const ff = f * f * push;
        s.vx += (dx / d) * ff + (-dy / d) * ff * 1.25 + pointer.vx * f * 0.16;
        s.vy += (dy / d) * ff + (dx / d) * ff * 1.25 + pointer.vy * f * 0.16;
      }

      s.vx *= DAMPING; s.vy *= DAMPING;
      const v = Math.hypot(s.vx, s.vy);
      if (v > 22) { s.vx *= 22 / v; s.vy *= 22 / v; }
      s.x += s.vx; s.y += s.vy;

      const speed = Math.abs(s.vx) + Math.abs(s.vy);
      if (speed > MOVING) { moving.push(s); continue; }

      const twinkle = 0.65 + 0.35 * Math.sin(t * s.speed * 2 + s.phase);
      if (s.color !== color) { color = s.color; ctx.fillStyle = color; }
      ctx.globalAlpha = s.alpha * twinkle;
      const r = s.size * 0.5;
      ctx.fillRect(s.x - r, s.y - r, s.size, s.size);
    }

    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = 0; i < moving.length; i++) {
      const s = moving[i];
      const speed = Math.abs(s.vx) + Math.abs(s.vy);
      const twinkle = 0.65 + 0.35 * Math.sin(t * s.speed * 2 + s.phase);
      ctx.globalAlpha = Math.min(1, s.alpha * twinkle + speed * 0.08);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.size + Math.min(speed * 0.14, 2.2);
      ctx.beginPath();
      // Trail runs back along the direction of travel.
      ctx.moveTo(s.x - s.vx * 4.8, s.y - s.vy * 4.8);
      ctx.lineTo(s.x + 0.01, s.y);
      ctx.stroke();
    }

    // Sparks: fly out, slow down, fade.
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.vx *= 0.93; p.vy *= 0.93;
      p.x += p.vx; p.y += p.vy;
      p.life--;
      if (p.life <= 0) { sparks[i] = sparks[sparks.length - 1]; sparks.pop(); continue; }
      const k = p.life / p.max;
      ctx.globalAlpha = k;
      ctx.strokeStyle = p.c;
      ctx.lineWidth = p.w * (0.5 + k * 0.8);
      ctx.beginPath();
      ctx.moveTo(p.x - p.vx * 5, p.y - p.vy * 5);
      ctx.lineTo(p.x + 0.01, p.y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }
})();
