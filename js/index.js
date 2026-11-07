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
  route();

  // ---------- Mobile nav ----------
  burger.addEventListener('click', function () {
    const open = navPill.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
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
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
  let offset = 0;

  function loadPhoto() {
    const index = (((dayOfYear + offset) % PHOTO_COUNT) + PHOTO_COUNT) % PHOTO_COUNT;
    img.src = 'images/image-of-day/' + (index + 1) + '.jpg';
    caption.textContent = offset === 0
      ? 'Day ' + dayOfYear + ' of ' + today.getFullYear() + '. A new photograph each day.'
      : 'Photo ' + (index + 1) + ' of ' + PHOTO_COUNT + '.';
  }

  document.getElementById('photo-prev').addEventListener('click', function () { offset--; loadPhoto(); });
  document.getElementById('photo-next').addEventListener('click', function () { offset++; loadPhoto(); });
})();
