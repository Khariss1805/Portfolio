// Page behaviour: scroll reveal, count-up numbers, timeline rows and project filters.
// Plain JavaScript, no dependencies. Without JavaScript every element is visible.
(function () {
  'use strict';
  window.__site = true;
  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var locale = root.lang || 'en';

  /* ------------------------------------------------------------ count-up
     Numbers start at zero and count up to their value the first time they
     are revealed. The final value is in the HTML, so search engines, screen
     readers and visitors without JavaScript always get the real number. */
  var fmtCache = {};
  function fmt(v, dec) {
    var key = dec;
    if (!fmtCache[key]) fmtCache[key] = new Intl.NumberFormat(locale, { minimumFractionDigits: dec, maximumFractionDigits: dec });
    return fmtCache[key].format(v).replace('-', '−');
  }
  var counters = [].slice.call(document.querySelectorAll('.count'));
  counters.forEach(function (el) {
    el.dataset.final = el.textContent;
    if (!reduced) el.textContent = fmt(0, +el.dataset.dec);
  });
  function runCount(el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    if (reduced) { el.textContent = el.dataset.final; return; }
    var to = parseFloat(el.dataset.to), dec = +el.dataset.dec;
    var dur = 1400, start = null;
    function tick(t) {
      if (start === null) start = t;
      var k = Math.min(1, (t - start) / dur);
      var e = 1 - Math.pow(1 - k, 4); // ease-out quart: fast start, gentle landing
      el.textContent = k < 1 ? fmt(to * e, dec) : el.dataset.final;
      if (k < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------ reveal
     Content that stays at opacity 0 is invisible content, so there are three
     layers: IntersectionObserver, a position check on scroll, and a 2 s
     deadline that shows everything if neither has fired. */
  var nodes = [].slice.call(document.querySelectorAll('[data-reveal], .hero-in, .case-results, .kpis'));
  var pending = nodes.slice();
  var io = null;
  function show(n) {
    if (n.classList.contains('is-in')) return;
    n.classList.add('is-in');
    if (io) io.unobserve(n);
    var i = pending.indexOf(n);
    if (i > -1) pending.splice(i, 1);
    [].forEach.call(n.querySelectorAll('.count'), function (c) {
      setTimeout(function () { runCount(c); }, reduced ? 0 : 250);
    });
    n.dispatchEvent(new CustomEvent('revealed', { bubbles: true }));
  }
  function check() {
    var vh = window.innerHeight || 800;
    pending.slice().forEach(function (n) {
      var r = n.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) show(n);
    });
    if (!pending.length) {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    }
  }
  if (reduced || !('IntersectionObserver' in window)) {
    nodes.forEach(show);
  } else {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) show(e.target); });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    nodes.forEach(function (n) { io.observe(n); });
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    requestAnimationFrame(check);
    setTimeout(function () {
      // Anything above the current scroll position the observers missed.
      pending.slice().forEach(function (n) { if (n.getBoundingClientRect().top < (window.innerHeight || 800)) show(n); });
    }, 2000);
  }
  // Counters that are not inside a revealed block.
  counters.forEach(function (c) { if (!c.closest('[data-reveal], .hero-in, .case-results, .kpis')) runCount(c); });

  /* ------------------------------------------------------------ timeline rows
     <details> opens instantly; the paragraph fades and slides in so the change
     is visible. Closing stays instant, which is what the reader asked for. */
  [].forEach.call(document.querySelectorAll('.tl-item details'), function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open || reduced) return;
      var body = d.querySelector('.tl-body');
      if (body && body.animate) {
        body.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }],
          { duration: 240, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
      }
    });
  });

  /* ------------------------------------------------------------ lightbox
     Gallery images open larger in a native <dialog>: focus is trapped and
     Escape closes it for free. Arrow keys move between images. */
  var dialog = document.querySelector('dialog.lightbox');
  var shots = [].slice.call(document.querySelectorAll('[data-lightbox]'));
  if (dialog && shots.length && dialog.showModal) {
    var lbImg = dialog.querySelector('img');
    var lbCap = dialog.querySelector('figcaption');
    var current = -1, opener = null;
    function showShot(i) {
      current = (i + shots.length) % shots.length;
      var b = shots[current];
      lbImg.src = b.dataset.lightbox;
      lbImg.alt = b.dataset.caption;
      lbCap.textContent = b.dataset.caption + '  ·  ' + (current + 1) + ' / ' + shots.length;
      if (!reduced && lbImg.animate) lbImg.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
    }
    function openShot(i) {
      opener = shots[i];
      showShot(i);
      dialog.showModal();
      if (!reduced && dialog.animate) {
        dialog.animate([{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'none' }],
          { duration: 240, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
      }
    }
    function closeShot() {
      if (!dialog.open) return;
      if (!reduced && dialog.animate) {
        var a = dialog.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(0.98)' }], { duration: 160, easing: 'ease-out' });
        a.onfinish = function () { dialog.close(); };
      } else dialog.close();
    }
    shots.forEach(function (b, i) { b.addEventListener('click', function () { openShot(i); }); });
    dialog.addEventListener('close', function () { if (opener) opener.focus(); });
    dialog.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-lb]');
      if (btn) {
        if (btn.dataset.lb === 'close') closeShot(); else showShot(current + parseInt(btn.dataset.lb, 10));
        return;
      }
      if (e.target === dialog) closeShot(); // click on the backdrop
    });
    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') showShot(current + 1);
      if (e.key === 'ArrowLeft') showShot(current - 1);
      if (e.key === 'Escape') { e.preventDefault(); closeShot(); }
    });
  }

  /* ------------------------------------------------------------ project filters */
  var group = document.querySelector('.filters');
  var list = document.getElementById('proj-list');
  if (group && list) {
    group.hidden = false;
    var buttons = group.querySelectorAll('button');
    group.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      var f = btn.dataset.filter;
      [].forEach.call(buttons, function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      var shown = 0;
      [].forEach.call(list.querySelectorAll('.proj'), function (row) {
        var hide = f !== 'all' && row.dataset.cat !== f;
        row.hidden = hide;
        if (!hide && !reduced && row.animate) {
          row.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
            { duration: 260, delay: shown * 50, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'backwards' });
        }
        if (!hide) shown++;
      });
    });
  }
})();
