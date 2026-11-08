(function () {
  const root = document.documentElement;
  const panels = document.querySelectorAll('.panel');
  const navPill = document.getElementById('nav');
  const burger = document.querySelector('.nav-burger');

  // ---------- Panels (hash-routed: #about, #projects, ...) ----------
  function openPanel(name) {
    let opened = false;
    panels.forEach(function (p) {
      const match = p.dataset.panel === name;
      p.classList.toggle('is-open', match);
      p.setAttribute('aria-hidden', match ? 'false' : 'true');
      if (match) { p.scrollTop = 0; opened = true; }
    });
    document.body.classList.toggle('panel-open', opened);
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('href') === '#' + name);
    });
    if (name === 'photo') loadPhoto();
  }

  function route() {
    openPanel(location.hash.replace('#', ''));
    navPill.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
  }

  function closePanels() {
    if (location.hash) history.pushState('', document.title, location.pathname + location.search);
    openPanel('');
  }

  window.addEventListener('hashchange', route);
  document.querySelectorAll('.panel-close').forEach(function (b) { b.addEventListener('click', closePanels); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanels(); });

  // ---------- Mobile nav ----------
  burger.addEventListener('click', function () {
    const open = navPill.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // ---------- Easter egg: long-press the TJ monogram to crack it ----------
  const mono = document.querySelector('.monogram');
  let pressTimer = null;
  let cracking = false;
  let swallowClick = false;

  function cancelPress() {
    clearTimeout(pressTimer);
    mono.classList.remove('is-pressing');
  }

  function crackEgg() {
    cancelPress();
    cracking = true;
    swallowClick = true;

    ['shell-l', 'shell-r'].forEach(function (side) {
      const s = document.createElement('span');
      s.className = 'shell ' + side;
      s.setAttribute('aria-hidden', 'true');
      s.textContent = 'TJ';
      mono.appendChild(s);
    });
    mono.classList.add('is-cracked');

    const r = mono.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height * 0.6;
    const yolk = document.createElement('div');
    yolk.className = 'yolk';
    yolk.style.left = x + 'px';
    yolk.style.top = y + 'px';
    document.body.appendChild(yolk);

    const drop = window.innerHeight - y - 14;
    const fallMs = Math.max(500, Math.sqrt(drop) * 38); // longer drop takes longer, like gravity
    yolk.animate([
      { transform: 'translateY(0) scale(.4)', offset: 0 },
      { transform: 'translateY(6px) scale(1, 1.15)', offset: 0.12 },
      { transform: 'translateY(' + drop + 'px) scale(.9, 1.2)', offset: 1 }
    ], { duration: fallMs, easing: 'cubic-bezier(.5, 0, 1, .6)', fill: 'forwards' }).onfinish = function () {
      yolk.remove();
      splatPage(x, window.innerHeight);
    };

    // Shell halves animate apart and back together (2.6s), then restore.
    setTimeout(function () {
      mono.querySelectorAll('.shell').forEach(function (s) { s.remove(); });
      mono.classList.remove('is-cracked');
      cracking = false;
    }, 2650);
  }

  // Yolk bursts out from where it landed to cover the page, then slides off.
  function splatPage(x, y) {
    const splat = document.createElement('div');
    splat.className = 'yolk-splat';
    splat.setAttribute('aria-hidden', 'true');

    const canvas = document.createElement('canvas');
    splat.appendChild(canvas);
    document.body.appendChild(splat);

    // Paint the slime (a canvas, so the cursor can wipe holes in it)
    const w = window.innerWidth, h = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    let g = ctx.createRadialGradient(w / 2, h, 0, w / 2, h, Math.hypot(w / 2, h));
    g.addColorStop(0, '#f0a00c'); g.addColorStop(0.55, '#f7b91f'); g.addColorStop(1, '#ffcb3a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    [[0.28, 0.30, 0.30, 0.22, 'rgba(255,246,200,.55)'],
     [0.72, 0.62, 0.18, 0.12, 'rgba(255,240,180,.45)'],
     [0.55, 0.45, 0.60, 0.45, 'rgba(255,200,40,.35)']].forEach(function (b) {
      ctx.save();
      ctx.translate(b[0] * w, b[1] * h);
      ctx.scale(b[2] * w, b[3] * h);
      g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, b[4]); g.addColorStop(1, 'rgba(255,220,120,0)');
      ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
    });

    g = ctx.createLinearGradient(0, 0, w * 0.35, h);
    g.addColorStop(0, 'rgba(255,255,255,.28)'); g.addColorStop(0.35, 'rgba(255,255,255,0)');
    g.addColorStop(0.7, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.12)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    // Wiper: moving the pointer over the slime clears a soft-edged swath
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = 63;
    ctx.strokeStyle = ctx.fillStyle = '#000';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 17;
    let last = null;
    function wipe(e) {
      const r = canvas.getBoundingClientRect(); // follows the suck-in scale
      if (!r.width) return;
      const p = { x: (e.clientX - r.left) * (w / r.width), y: (e.clientY - r.top) * (h / r.height) };
      ctx.beginPath();
      if (last) { ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); }
      else { ctx.arc(p.x, p.y, 32, 0, Math.PI * 2); ctx.fill(); }
      last = p;
    }
    function stopWipe() { last = null; }
    window.addEventListener('pointermove', wipe);
    document.addEventListener('pointerleave', stopWipe);

    const at = ' at ' + x + 'px ' + y + 'px)';
    const reach = Math.hypot(Math.max(x, window.innerWidth - x), y) + 40;
    splat.animate([
      { clipPath: 'circle(0px' + at },
      { clipPath: 'circle(' + reach * 0.8 + 'px' + at, offset: 0.6 },
      { clipPath: 'circle(' + reach + 'px' + at }
    ], { duration: 550, easing: 'cubic-bezier(.2, .9, .3, 1)' }).onfinish = function () {
      // Let it sit, bulge slightly, then get sucked into the middle of the page
      const suck = splat.animate([
        { transform: 'scale(1)', offset: 0 },
        { transform: 'scale(1)', offset: 0.2, easing: 'ease-out' },
        { transform: 'scale(1.04)', offset: 0.32, easing: 'cubic-bezier(.6, 0, .9, .4)' },
        { transform: 'scale(.12)', offset: 1 }
      ], { duration: 3000, fill: 'forwards' });

      // Amoeba outline: a wobbly, lopsided blob whose lobes drift every frame.
      // Its radius shrinks to nothing as the scale pulls it into the center.
      const cx = w / 2, cy = h / 2;
      const full = Math.hypot(w, h) / 2 + 4;
      const ph = [0, 0, 0, 0, 0].map(function () { return Math.random() * Math.PI * 2; });
      const sp = [0, 0, 0, 0, 0].map(function () { return (Math.random() - 0.5) * 6; });
      const AMP = 0.5; // max total lobe amplitude (sum of weights below)
      function outline() {
        const t = (suck.currentTime || 0) / 1000;
        const u = Math.max(0, ((suck.currentTime || 0) / 3000 - 0.2) / 0.8);
        // Starts only a bit past the corners, so lobes creep in from the edges early
        const R = full * (1 + AMP * 0.6) * (1 - u) * (1 - u * 0.4);
        const ox = Math.sin(t * 2.3 + ph[0]) * R * 0.06, oy = Math.cos(t * 1.7 + ph[1]) * R * 0.06;
        const pts = [];
        for (let i = 0; i < 90; i++) {
          const a = (i / 90) * Math.PI * 2;
          const k = 1 + 0.17 * Math.sin(2 * a + ph[0] + t * sp[0])
                      + 0.13 * Math.sin(3 * a + ph[1] + t * sp[1])
                      + 0.10 * Math.sin(5 * a + ph[2] + t * sp[2])
                      + 0.06 * Math.sin(7 * a + ph[3] + t * sp[3])
                      + 0.04 * Math.sin(11 * a + ph[4] + t * sp[4]);
          pts.push((cx + ox + Math.cos(a) * R * k).toFixed(1) + 'px ' + (cy + oy + Math.sin(a) * R * k).toFixed(1) + 'px');
        }
        splat.style.clipPath = 'polygon(' + pts.join(',') + ')';
      }
      (function frame() {
        if (suck.playState === 'finished' || !splat.isConnected) return;
        outline();
        requestAnimationFrame(frame);
      })();

      suck.onfinish = function () {
        window.removeEventListener('pointermove', wipe);
        document.removeEventListener('pointerleave', stopWipe);
        splat.remove();
      };
    };
  }

  mono.addEventListener('pointerdown', function (e) {
    if (cracking || e.button > 0) return;
    swallowClick = false;
    mono.classList.add('is-pressing');
    pressTimer = setTimeout(crackEgg, 700);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { mono.addEventListener(ev, cancelPress); });
  mono.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  mono.addEventListener('click', function (e) {
    if (swallowClick || cracking) { e.preventDefault(); swallowClick = false; }
  });

  // ---------- Theme toggle ----------
  document.querySelector('.theme-toggle').addEventListener('click', function () {
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  // ---------- Photo of the day ----------
  const PHOTO_COUNT = 19; // images/image-of-day/1.jpg ... 19.jpg
  const img = document.getElementById('photo-img');
  const caption = document.getElementById('photo-caption');
  let offset = 0;

  // Day of the year for the visitor's local calendar date. Built from UTC
  // midnights so daylight-saving shifts can't make it slip by a day.
  function dayOfYear(d) {
    return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 86400000);
  }

  function showPhoto() {
    const today = new Date();
    const day = dayOfYear(today);
    const index = (((day + offset) % PHOTO_COUNT) + PHOTO_COUNT) % PHOTO_COUNT;
    img.src = 'images/image-of-day/' + (index + 1) + '.jpg';
    caption.textContent = offset === 0
      ? 'Day ' + day + ' of ' + today.getFullYear() + '. A new photograph each day.'
      : 'Photo ' + (index + 1) + ' of ' + PHOTO_COUNT + '.';
  }

  // Opening the panel always starts on today's photo.
  function loadPhoto() { offset = 0; showPhoto(); }

  document.getElementById('photo-prev').addEventListener('click', function () { offset--; showPhoto(); });
  document.getElementById('photo-next').addEventListener('click', function () { offset++; showPhoto(); });

  // Open the panel named in the URL (e.g. /#photo) once everything above is set up.
  route();
})();
