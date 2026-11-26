/* ===========================================================
   main.js – router, navigasi, login/daftar, dan demo di beranda
   =========================================================== */
(function () {
  'use strict';

  var $ = function (s) { return document.querySelector(s); };
  var landing = $('#landing'), app = $('#app'), content = $('#content');

  var NAV_USER = [['dashboard', 'Dashboard'], ['jadwal', 'Jadwal'], ['tugas', 'Tugas'], ['catatan', 'Catatan'], ['kelompok', 'Kelompok belajar'], ['kegiatan', 'Kegiatan']];
  var NAV_ADMIN = [['dashboard', 'Ringkasan'], ['admin-kegiatan', 'Kelola kegiatan'], ['admin-pengguna', 'Pengguna'], ['kelompok', 'Kelompok belajar'], ['kegiatan', 'Lihat kegiatan']];

  function route() {
    var h = location.hash || '#/';
    var m = h.match(/^#\/app\/([\w-]+)/);
    var user = Auth.current();
    if (m) {
      if (!user) { show('landing'); openAuth('login'); return; }
      show('app');
      render(m[1]);
    } else {
      show('landing');
      updateLandingButtons();
      // jangan scroll ulang kalau hanya pindah anchor (#modul dst.)
      if (h.charAt(1) !== '/' && h.length > 1) {
        var t = document.getElementById(h.slice(1)); if (t) t.scrollIntoView();
      }
    }
  }

  function show(which) {
    landing.hidden = which !== 'landing';
    app.hidden = which !== 'app';
  }

  function currentPage() {
    var m = (location.hash || '').match(/^#\/app\/([\w-]+)/);
    return m ? m[1] : 'dashboard';
  }

  function render(page) {
    page = typeof page === 'string' ? page : currentPage();
    var user = Auth.current();
    if (!user) return route();
    if (!Views[page]) page = 'dashboard';

    // simpan fokus kolom pencarian supaya tidak hilang saat render ulang
    var ae = document.activeElement, keep = null;
    if (ae && ae.dataset && ae.dataset.filter) keep = { k: ae.dataset.filter, s: ae.selectionStart, e: ae.selectionEnd };

    var nav = user.role === 'admin' ? NAV_ADMIN : NAV_USER;
    $('#app-nav').innerHTML = nav.map(function (n) {
      return '<a href="#/app/' + n[0] + '"' + (n[0] === page ? ' class="on" aria-current="page"' : '') + '>' + n[1] + '</a>';
    }).join('');
    $('#user-name').textContent = user.nama;
    $('#user-role').textContent = user.role === 'admin' ? 'Admin' : (user.prodi || 'Mahasiswa');
    $('#user-avatar').textContent = UI.initials(user.nama);
    document.title = 'EDUVERSE – ' + (nav.filter(function (n) { return n[0] === page; })[0] || ['', 'Dashboard'])[1];

    content.innerHTML = Views[page](user);
    setTip(user, page);

    if (keep) {
      var el = content.querySelector('[data-filter="' + keep.k + '"]');
      if (el) { el.focus(); try { el.setSelectionRange(keep.s, keep.e); } catch (e) { /* abaikan */ } }
    }
  }
  var lastPage = null;
  function setTip(user, page) {
    var msg;
    if (user.role === 'admin') msg = 'Halo admin! Ada kegiatan baru yang mau ditambah?';
    else {
      var open = DB.where('tasks', function (t) { return t.userId === user.id && t.status !== 'selesai'; }).length;
      var tips = {
        dashboard: open ? 'Ada ' + open + ' tugas menunggumu. Semangat!' : 'Semua tugas beres. Waktunya istirahat ♥',
        jadwal: 'Jangan lupa cek jadwal besok ya',
        tugas: open ? 'Centang kalau sudah selesai, nanti aku kasih hati' : 'Tugasmu kosong. Hebat!',
        catatan: 'Catatan rapi bikin ujian lebih tenang ✿',
        kelompok: 'Belajar bareng itu seru, lho',
        kegiatan: 'Ada beasiswa yang cocok buatmu?'
      };
      msg = tips[page] || 'Semangat belajarnya!';
    }
    Fun.tip(msg, page !== lastPage);
    lastPage = page;
  }
  window.App = { render: render };

  /* ---------- Landing: tombol bergantung status login ---------- */
  function updateLandingButtons() {
    var u = Auth.current();
    var l = $('#btn-login'), r = $('#btn-register');
    if (u) {
      l.textContent = 'Keluar'; l.dataset.act = 'logout';
      r.textContent = 'Buka dashboard'; r.dataset.act = 'go-app';
    } else {
      l.textContent = 'Masuk'; l.dataset.act = 'open-auth'; l.dataset.mode = 'login';
      r.textContent = 'Daftar gratis'; r.dataset.act = 'open-auth'; r.dataset.mode = 'register';
    }
  }

  /* ---------- Dialog auth ---------- */
  var authDlg = $('#auth-dialog'), authForm = $('#auth-form'), authMode = 'login';
  function setAuthMode(mode) {
    authMode = mode;
    $('#auth-title').textContent = mode === 'login' ? 'Masuk ke EDUVERSE' : 'Buat akun EDUVERSE';
    $('#auth-submit').textContent = mode === 'login' ? 'Masuk' : 'Buat akun';
    $('#tab-login').classList.toggle('on', mode === 'login');
    $('#tab-register').classList.toggle('on', mode === 'register');
    $('#tab-login').setAttribute('aria-selected', mode === 'login');
    $('#tab-register').setAttribute('aria-selected', mode === 'register');
    authForm.querySelectorAll('[data-only="register"]').forEach(function (el) { el.hidden = mode !== 'register'; });
    authForm.password.autocomplete = mode === 'login' ? 'current-password' : 'new-password';
    $('#auth-error').hidden = true;
  }
  function openAuth(mode) {
    setAuthMode(mode || 'login');
    if (!authDlg.open) authDlg.showModal();
    authForm.email.focus();
  }

  authForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var p = {
      nama: authForm.nama.value, email: authForm.email.value,
      password: authForm.password.value, prodi: authForm.prodi.value
    };
    var mode = authMode, btn = $('#auth-submit');
    btn.disabled = true;
    (mode === 'login' ? Auth.login(p.email, p.password) : Auth.register(p)).then(function (res) {
      btn.disabled = false;
      if (!res.ok) { var er = $('#auth-error'); er.textContent = res.error; er.hidden = false; return; }
      authDlg.close(); authForm.reset();
      UI.toast(mode === 'login' ? 'Selamat datang kembali, ' + res.user.nama.split(' ')[0] : 'Akun dibuat. Selamat datang!');
      location.hash = '#/app/dashboard';
      route();
    });
  });

  /* ---------- Aksi global (event delegation) ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var act = el.dataset.act;

    if (act === 'open-auth') return openAuth(el.dataset.mode);
    if (act === 'auth-tab') return setAuthMode(el.dataset.mode);
    if (act === 'close-modal') return UI.closeModal();
    if (act === 'go-app') { location.hash = '#/app/dashboard'; return; }
    if (act === 'logout') {
      Auth.logout().then(function () {
        UI.toast('Kamu sudah keluar');
        if (location.hash === '#/') route(); else location.hash = '#/';
      });
      return;
    }
    if (act === 'demo-login') {
      var who = el.dataset.who || 'user';
      (who === 'admin' ? Auth.login('admin@eduverse.id', 'admin123') : Auth.login('mahasiswa@eduverse.id', 'user123')).then(function (res) {
        if (res.ok) { if (authDlg.open) authDlg.close(); location.hash = '#/app/dashboard'; route(); }
        else UI.toast(res.error);
      });
      return;
    }
    if (Actions[act]) Actions[act](el.dataset, el);
  });

  document.addEventListener('input', function (e) {
    var k = e.target.dataset && e.target.dataset.filter;
    if (k) { ViewState[k] = e.target.value; render(); }
  });

  // klik di luar dialog menutupnya
  [authDlg, $('#modal')].forEach(function (d) {
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
  });

  window.addEventListener('hashchange', route);

  /* ---------- Demo papan tugas di hero ---------- */
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  (function demo() {
    var items = [
      { t: 'Rancang ERD sistem perpustakaan', m: 'Basis Data', d: 'Besok', done: false },
      { t: 'Laporan praktikum HTML dan CSS', m: 'Pemrograman Web', d: '3 hari lagi', done: false },
      { t: 'Latihan soal distribusi normal', m: 'Statistika', d: '6 hari lagi', done: false },
      { t: 'Rangkuman topologi jaringan', m: 'Jaringan Komputer', d: 'Selesai', done: true }
    ];
    var list = $('#demo-list'), fg = $('#demo-ring-fg'), txt = $('#demo-ring-text');
    $('#demo-day').textContent = UI.HARI[new Date().getDay()] + ', ' + UI.fmtDate(DB.today());
    function draw() {
      list.innerHTML = items.map(function (it, i) {
        return '<li class="' + (it.done ? 'done' : '') + '"><label><input type="checkbox" class="check" data-i="' + i + '"' + (it.done ? ' checked' : '') + '>' +
          '<span class="dt"><strong>' + UI.esc(it.t) + '</strong><small>' + UI.esc(it.m) + '</small></span><span class="dd">' + (it.done ? 'Selesai' : it.d) + '</span></label></li>';
      }).join('');
      var n = items.filter(function (i) { return i.done; }).length;
      fg.style.strokeDasharray = (n / items.length * 100) + ' 100';
      txt.textContent = n + '/' + items.length;
      $('#demo-ring').setAttribute('aria-label', n + ' dari ' + items.length + ' tugas selesai');
    }
    list.addEventListener('change', function (e) {
      var i = e.target.dataset.i; if (i == null) return;
      items[i].done = e.target.checked;
      if (e.target.checked) { Fun.burst(e.target, 18); var left = items.filter(function (x) { return !x.done; }).length; Fun.say(left ? pick(['Yey, satu beres!', 'Kerennn ♥', 'Lanjut yang berikutnya!']) : 'Semua beres! Kamu juara ★', 3000); }
      draw();
      var again = list.querySelector('[data-i="' + i + '"]'); if (again) again.focus();
    });
    draw();
  })();

  Fun.mount();
  DB.ready.then(function () {
    if (DB.error) UI.toast(DB.error);
    route();
  });
})();
