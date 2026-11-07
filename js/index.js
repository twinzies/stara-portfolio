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
