/* ===========================================================
   fun.js – bagian interaktif: maskot Evi, konfeti hati, kilau kursor
   =========================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var COLORS = ['#ff6fa5', '#ff8dba', '#7d4ce0', '#ffc93c', '#4a1a35', '#ff5c9a'];
  var SHAPES = ['♥', '✦', '★', '✿', '♥', '♡'];
  var last = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  var currentTip = 'Hai! Aku Evi. Klik aku kalau butuh semangat ♥';

  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function rand(a, b) { return a + Math.random() * (b - a); }

  /* ---------- Maskot (SVG) ---------- */
  function mascotSvg(cls) {
    return '<svg class="mascot ' + cls + '" viewBox="0 0 120 120" role="img" aria-label="Evi, maskot EDUVERSE. Klik untuk menyapa">' +
      '<ellipse cx="38" cy="30" rx="12" ry="25" fill="#ff8dba" stroke="#4a1a35" stroke-width="3" transform="rotate(-12 38 30)"/>' +
      '<ellipse cx="38" cy="32" rx="5.5" ry="15" fill="#ffd3e6" transform="rotate(-12 38 32)"/>' +
      '<ellipse cx="82" cy="30" rx="12" ry="25" fill="#ff8dba" stroke="#4a1a35" stroke-width="3" transform="rotate(12 82 30)"/>' +
      '<ellipse cx="82" cy="32" rx="5.5" ry="15" fill="#ffd3e6" transform="rotate(12 82 32)"/>' +
      '<ellipse cx="60" cy="74" rx="44" ry="38" fill="#ffb3d1" stroke="#4a1a35" stroke-width="3"/>' +
      '<circle cx="34" cy="84" r="8" fill="#ff6fa5" opacity=".55"/><circle cx="86" cy="84" r="8" fill="#ff6fa5" opacity=".55"/>' +
      '<g class="eye"><circle cx="44" cy="70" r="10" fill="#fff" stroke="#4a1a35" stroke-width="2"/>' +
      '<g class="pupil"><circle cx="44" cy="70" r="5.5" fill="#4a1a35"/><circle cx="46" cy="68" r="1.8" fill="#fff"/></g></g>' +
      '<g class="eye"><circle cx="76" cy="70" r="10" fill="#fff" stroke="#4a1a35" stroke-width="2"/>' +
      '<g class="pupil"><circle cx="76" cy="70" r="5.5" fill="#4a1a35"/><circle cx="78" cy="68" r="1.8" fill="#fff"/></g></g>' +
      '<path d="M52 84 Q60 93 68 84" fill="none" stroke="#4a1a35" stroke-width="3" stroke-linecap="round"/>' +
      '<g transform="translate(92 40) rotate(14)"><path d="M0 0 L-13 -8 V8 Z M0 0 L13 -8 V8 Z" fill="#7d4ce0" stroke="#4a1a35" stroke-width="2" stroke-linejoin="round"/><circle r="4" fill="#ffc93c" stroke="#4a1a35" stroke-width="2"/></g>' +
      '</svg>';
  }

  /* ---------- Gelembung ucapan ---------- */
  var timers = {};
  function bubbleEl() {
    var appOpen = !document.getElementById('app').hidden;
    return document.getElementById(appOpen ? 'buddy-bubble' : 'hero-bubble');
  }
  function say(msg, ms) {
    var b = bubbleEl(); if (!b) return;
    b.textContent = msg; b.classList.add('show');
    clearTimeout(timers[b.id]);
    timers[b.id] = setTimeout(function () { b.classList.remove('show'); }, ms || 3400);
  }
  function tip(msg, showNow) { currentTip = msg; if (showNow) say(msg, 4200); }

  var CHEERS = ['Kamu hebat! ♥', 'Satu langkah lagi!', 'Semangat, jangan lupa minum air ya', 'Pelan-pelan juga nggak apa-apa ✿', 'Istirahat sebentar boleh kok', 'Aku bangga sama kamu ★'];

  /* ---------- Ledakan hati dan bintang ---------- */
  function origin(at) {
    if (at && at.getBoundingClientRect) { var r = at.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
    if (at && typeof at.x === 'number') return at;
    return last;
  }
  function burst(at, n) {
    if (reduce) return;
    var o = origin(at); n = n || 16;
    for (var i = 0; i < n; i++) {
      var el = document.createElement('span');
      el.className = 'fx'; el.textContent = pick(SHAPES);
      el.style.left = o.x + 'px'; el.style.top = o.y + 'px';
      el.style.color = pick(COLORS); el.style.fontSize = rand(14, 28) + 'px';
      document.body.appendChild(el);
      var ang = rand(0, Math.PI * 2), dist = rand(50, 140), dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - 30, rot = rand(-200, 200);
      var anim = el.animate([
        { transform: 'translate(-50%,-50%) scale(.2)', opacity: 1 },
        { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) rotate(' + rot / 2 + 'deg) scale(1.1)', opacity: 1, offset: .55 },
        { transform: 'translate(calc(-50% + ' + dx * 1.1 + 'px), calc(-50% + ' + (dy + 70) + 'px)) rotate(' + rot + 'deg) scale(.7)', opacity: 0 }
      ], { duration: rand(750, 1150), easing: 'cubic-bezier(.2,.8,.3,1)' });
      anim.onfinish = (function (e) { return function () { e.remove(); }; })(el);
    }
  }

  /* ---------- Kilau mengikuti kursor di beranda ---------- */
  var lastSpark = 0;
  function sparkle(x, y) {
    var el = document.createElement('span');
    el.className = 'fx'; el.textContent = pick(['✦', '♥', '✿']);
    el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.color = pick(COLORS.slice(0, 4)); el.style.fontSize = rand(10, 18) + 'px';
    document.body.appendChild(el);
    var a = el.animate([
      { transform: 'translate(-50%,-50%) scale(1)', opacity: .9 },
      { transform: 'translate(-50%, calc(-50% + 26px)) rotate(' + rand(-60, 60) + 'deg) scale(.3)', opacity: 0 }
    ], { duration: 700, easing: 'ease-out' });
    a.onfinish = function () { el.remove(); };
  }

  /* ---------- Mata maskot mengikuti kursor ---------- */
  function lookAt(x, y) {
    document.querySelectorAll('svg.mascot').forEach(function (svg) {
      var r = svg.getBoundingClientRect();
      if (!r.width) return;
      var dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height * .6);
      var len = Math.sqrt(dx * dx + dy * dy) || 1, k = Math.min(1, len / 200);
      var tx = (dx / len) * 3.6 * k, ty = (dy / len) * 3.6 * k;
      svg.querySelectorAll('.pupil').forEach(function (p) { p.style.transform = 'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px)'; });
    });
  }

  document.addEventListener('pointerdown', function (e) { last = { x: e.clientX, y: e.clientY }; }, true);
  document.addEventListener('pointermove', function (e) {
    lookAt(e.clientX, e.clientY);
    if (reduce || e.pointerType !== 'mouse') return;
    var now = performance.now();
    if (now - lastSpark > 90 && document.getElementById('landing') && !document.getElementById('landing').hidden && e.target.closest && e.target.closest('.hero')) {
      lastSpark = now; sparkle(e.clientX, e.clientY);
    }
  });

  /* ---------- Pasang maskot ---------- */
  function bounce(svg) {
    if (!svg.animate || reduce) return;
    svg.animate([{ transform: 'scale(1,1)' }, { transform: 'scale(1.12,.86)' }, { transform: 'scale(.92,1.14) translateY(-14px)' }, { transform: 'scale(1,1)' }], { duration: 480, easing: 'ease-out' });
  }
  function mount() {
    var hero = document.getElementById('hero-mascot');
    if (hero) hero.innerHTML = mascotSvg('');
    var buddy = document.getElementById('buddy-mascot');
    if (buddy) buddy.innerHTML = mascotSvg('');

    if (hero) hero.addEventListener('click', function (e) {
      bounce(hero.querySelector('svg')); burst(hero, 10);
      say(pick(['Hai, aku Evi! ♥', 'Yuk coba centang tugas di papan itu', 'Kuliah jadi lebih ringan bareng EDUVERSE ✿', 'Klik aku lagi, aku suka!']));
    });
    if (buddy) buddy.addEventListener('click', function () {
      bounce(buddy.querySelector('svg')); burst(buddy, 8);
      say(Math.random() < .55 ? currentTip : pick(CHEERS));
    });

    setTimeout(function () { if (!document.getElementById('landing').hidden) say('Hai! Aku Evi. Coba centang tugasnya ♥', 4200); }, 900);
  }

  window.Fun = { burst: burst, say: say, tip: tip, cheer: function () { return pick(CHEERS); }, mount: mount };
})();
