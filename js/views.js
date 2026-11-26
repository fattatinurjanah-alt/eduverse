/* ===========================================================
   views.js – halaman aplikasi (Views) dan aksi CRUD (Actions)
   =========================================================== */
(function () {
  'use strict';

  var esc = UI.esc;
  var S = { taskF: 'semua', noteQ: '', eventQ: '', eventCat: 'semua', eventTab: 'semua', groupTab: 'jelajah' };
  var rerender = function () { window.App.render(); };

  /* ---------- potongan HTML yang dipakai ulang ---------- */
  function page(title, sub, actions, body) {
    return '<header class="page-head"><div><h1>' + esc(title) + '</h1>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div>' +
      '<div class="page-actions">' + (actions || '') + '</div></header>' + body;
  }
  function empty(title, text, btn) {
    return '<div class="empty"><h3>' + esc(title) + '</h3><p>' + esc(text) + '</p>' + (btn || '') + '</div>';
  }
  function iconBtns(act, id, extra) {
    return '<button class="btn btn-quiet btn-sm" data-act="' + act + '-edit" data-id="' + id + '">Ubah</button>' +
      '<button class="btn btn-quiet btn-sm text-danger" data-act="' + act + '-delete" data-id="' + id + '">Hapus</button>' + (extra || '');
  }
  function tabs(key, items) {
    return '<div class="tabs tabs-inline" role="tablist">' + items.map(function (i) {
      return '<button role="tab" class="tab' + (S[key] === i[0] ? ' on' : '') + '" aria-selected="' + (S[key] === i[0]) + '" data-act="set" data-key="' + key + '" data-val="' + i[0] + '">' + esc(i[1]) + '</button>';
    }).join('') + '</div>';
  }
  function statusChip(s) {
    var m = { belum: 'Belum', proses: 'Dikerjakan', selesai: 'Selesai' };
    return '<span class="chip chip-' + s + '">' + m[s] + '</span>';
  }
  function taskRow(t, compact) {
    var n = UI.daysLeft(t.tenggat), done = t.status === 'selesai';
    var tone = done ? '' : n < 0 ? ' late' : n <= 1 ? ' soon' : '';
    return '<li class="task' + (done ? ' done' : '') + '">' +
      '<input type="checkbox" class="check" data-act="task-toggle" data-id="' + t.id + '"' + (done ? ' checked' : '') + ' aria-label="Tandai ' + esc(t.judul) + ' selesai">' +
      '<div class="task-main"><strong>' + esc(t.judul) + '</strong>' +
      '<small>' + esc(t.matkul) + (t.deskripsi && !compact ? ' · ' + esc(t.deskripsi) : '') + '</small></div>' +
      '<div class="task-side"><span class="due' + tone + '">' + (done ? UI.fmtDate(t.tenggat) : UI.dueLabel(t.tenggat)) + '</span>' +
      (compact ? '' : statusChip(t.status) + iconBtns('task', t.id)) + '</div></li>';
  }

  function eventState(userId, eventId) {
    var rows = DB.where('registrations', function (r) { return r.userId === userId && r.eventId === eventId; });
    return {
      daftar: rows.find(function (r) { return r.type === 'daftar'; }) || null,
      simpan: rows.find(function (r) { return r.type === 'simpan'; }) || null
    };
  }
  function catName(id) { var c = DB.get('categories', id); return c ? c.nama : 'Tanpa kategori'; }
  function userName(id) { var u = DB.get('users', id); return u ? u.nama : 'Pengguna dihapus'; }

  var LEVELS = [[0, 'Murid Baru'], [20, 'Si Rajin'], [50, 'Bintang Kelas'], [100, 'Jagoan Kampus'], [180, 'Legenda Kampus']];
  function levelOf(u) {
    var pts = DB.where('tasks', function (t) { return t.userId === u.id && t.status === 'selesai'; }).length * 10 +
      DB.where('group_members', function (m) { return m.userId === u.id; }).length * 5 +
      DB.where('registrations', function (r) { return r.userId === u.id && r.type === 'daftar'; }).length * 5 +
      DB.where('notes', function (n) { return n.userId === u.id; }).length * 2;
    var i = 0; while (i + 1 < LEVELS.length && pts >= LEVELS[i + 1][0]) i++;
    var next = LEVELS[i + 1], base = LEVELS[i][0];
    return { pts: pts, n: i + 1, name: LEVELS[i][1], next: next ? next[1] : null, left: next ? next[0] - pts : 0, pct: next ? Math.round((pts - base) / (next[0] - base) * 100) : 100 };
  }

  /* ==========================================================
     VIEWS
     ========================================================== */
  var Views = {};

  /* ---------- Dashboard ---------- */
  Views.dashboard = function (u) {
    if (u.role === 'admin') return adminDashboard(u);
    var tasks = DB.where('tasks', function (t) { return t.userId === u.id; });
    var open = tasks.filter(function (t) { return t.status !== 'selesai'; })
      .sort(function (a, b) { return a.tenggat < b.tenggat ? -1 : 1; });
    var done = tasks.length - open.length;
    var pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
    var today = UI.HARI[new Date().getDay()];
    var classes = DB.where('schedules', function (s) { return s.userId === u.id && s.hari === today; })
      .sort(function (a, b) { return a.mulai < b.mulai ? -1 : 1; });
    var groups = DB.where('group_members', function (m) { return m.userId === u.id; }).length;
    var regs = DB.where('registrations', function (r) { return r.userId === u.id && r.type === 'daftar'; })
      .map(function (r) { return DB.get('events', r.eventId); }).filter(Boolean)
      .sort(function (a, b) { return a.tanggal < b.tanggal ? -1 : 1; });
    var next = open[0];

    var lv = levelOf(u);
    return page('Halo, ' + u.nama.split(' ')[0] + ' ♥', 'Hari ini ' + today + ', ' + UI.fmtDate(DB.today()) + '.', '',
      '<div class="stats">' +
        '<div class="stat"><span class="stat-n">' + open.length + '</span><span>tugas belum selesai</span></div>' +
        '<div class="stat"><span class="stat-n">' + (next ? UI.dueLabel(next.tenggat) : '–') + '</span><span>' + (next ? 'tenggat terdekat: ' + esc(next.judul) : 'tidak ada tenggat') + '</span></div>' +
        '<div class="stat"><span class="stat-n">' + classes.length + '</span><span>kelas hari ini</span></div>' +
        '<div class="stat"><span class="stat-n">' + groups + '</span><span>kelompok belajar</span></div>' +
      '</div>' +
      '<div class="fun-row"><div class="progress-wrap"><div class="progress-label"><strong>Progres tugas</strong><span>' + done + ' dari ' + tasks.length + ' selesai</span></div>' +
        '<div class="progress" role="progressbar" aria-label="Progres tugas" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + pct + '%"></i></div>' +
        '<p class="meta" style="margin-top:.6rem">' + (tasks.length && !open.length ? 'Semua tugas selesai. Kamu keren banget!' : 'Centang tugas untuk menambah poin.') + '</p></div>' +
        '<div class="level"><div class="level-top"><span class="level-badge">' + lv.n + '</span><div><strong>' + esc(lv.name) + '</strong><small>' + lv.pts + ' poin</small></div></div>' +
        '<div class="progress" role="progressbar" aria-label="Menuju level berikutnya" aria-valuenow="' + lv.pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + lv.pct + '%"></i></div>' +
        '<p class="meta" style="margin-top:.6rem">' + (lv.next ? lv.left + ' poin lagi menuju ' + esc(lv.next) : 'Level tertinggi. Kamu legenda!') + '</p></div></div>' +
      '<div class="two-col">' +
        '<section class="panel"><div class="panel-head"><h2>Perlu dikerjakan</h2><a href="#/app/tugas">Semua tugas</a></div>' +
          (open.length ? '<ul class="task-list">' + open.slice(0, 5).map(function (t) { return taskRow(t, true); }).join('') + '</ul>' :
            empty('Semua tugas selesai', 'Tambahkan tugas baru supaya tenggatnya tidak terlewat.', '<a class="btn btn-ink btn-sm" href="#/app/tugas">Tambah tugas</a>')) + '</section>' +
        '<div class="stack">' +
          '<section class="panel"><div class="panel-head"><h2>Jadwal hari ini</h2><a href="#/app/jadwal">Jadwal lengkap</a></div>' +
            (classes.length ? '<ul class="plain-list">' + classes.map(function (s) {
              return '<li><span class="time">' + s.mulai + '–' + s.selesai + '</span><div><strong>' + esc(s.matkul) + '</strong><small>' + esc(s.ruang) + '</small></div></li>';
            }).join('') + '</ul>' : empty('Tidak ada kelas hari ini', 'Waktu yang pas untuk mengerjakan tugas atau belajar kelompok.')) + '</section>' +
          '<section class="panel"><div class="panel-head"><h2>Kegiatan yang kamu ikuti</h2><a href="#/app/kegiatan">Cari kegiatan</a></div>' +
            (regs.length ? '<ul class="plain-list">' + regs.slice(0, 3).map(function (e) {
              return '<li><span class="time">' + UI.fmtDate(e.tanggal) + '</span><div><strong>' + esc(e.judul) + '</strong><small>' + esc(e.lokasi) + '</small></div></li>';
            }).join('') + '</ul>' : empty('Belum mendaftar kegiatan', 'Lihat seminar, workshop, dan beasiswa yang sedang dibuka.')) + '</section>' +
        '</div></div>');
  };

  function adminDashboard(u) {
    var regs = DB.all('registrations').filter(function (r) { return r.type === 'daftar'; });
    var recent = regs.slice(-5).reverse();
    return page('Ringkasan platform', 'Pantau pengguna, kegiatan, dan aktivitas EDUVERSE.', '',
      '<div class="stats">' +
        '<div class="stat"><span class="stat-n">' + DB.all('users').length + '</span><span>pengguna terdaftar</span></div>' +
        '<div class="stat"><span class="stat-n">' + DB.all('events').length + '</span><span>kegiatan dipublikasikan</span></div>' +
        '<div class="stat"><span class="stat-n">' + regs.length + '</span><span>pendaftaran kegiatan</span></div>' +
        '<div class="stat"><span class="stat-n">' + DB.all('study_groups').length + '</span><span>kelompok belajar</span></div>' +
      '</div>' +
      '<section class="panel"><div class="panel-head"><h2>Pendaftaran terbaru</h2><a href="#/app/admin-kegiatan">Kelola kegiatan</a></div>' +
        (recent.length ? '<ul class="plain-list">' + recent.map(function (r) {
          var e = DB.get('events', r.eventId);
          return '<li><span class="time">' + UI.fmtDate(r.createdAt) + '</span><div><strong>' + esc(userName(r.userId)) + '</strong><small>mendaftar ke ' + esc(e ? e.judul : 'kegiatan dihapus') + '</small></div></li>';
        }).join('') + '</ul>' : empty('Belum ada pendaftaran', 'Pendaftaran akan muncul di sini setelah pengguna mendaftar ke kegiatan.')) + '</section>');
  }

  /* ---------- Jadwal ---------- */
  Views.jadwal = function (u) {
    var rows = DB.where('schedules', function (s) { return s.userId === u.id; });
    var order = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    var body = rows.length ? order.map(function (h) {
      var list = rows.filter(function (s) { return s.hari === h; }).sort(function (a, b) { return a.mulai < b.mulai ? -1 : 1; });
      if (!list.length) return '';
      return '<section class="day"><h2>' + h + '</h2><ul class="plain-list">' + list.map(function (s) {
        return '<li><span class="time">' + s.mulai + '–' + s.selesai + '</span><div class="grow"><strong>' + esc(s.matkul) + '</strong><small>' + esc(s.ruang) + '</small></div><div class="row-actions">' + iconBtns('schedule', s.id) + '</div></li>';
      }).join('') + '</ul></section>';
    }).join('') : empty('Jadwalmu masih kosong', 'Tambahkan mata pelajaran atau mata kuliah pertamamu.', '<button class="btn btn-ink" data-act="schedule-add">Tambah jadwal</button>');
    return page('Jadwal akademik', 'Jadwal kuliah atau pelajaran mingguanmu.', '<button class="btn btn-ink" data-act="schedule-add">Tambah jadwal</button>', body);
  };

  /* ---------- Tugas ---------- */
  Views.tugas = function (u) {
    var all = DB.where('tasks', function (t) { return t.userId === u.id; });
    var f = S.taskF;
    var list = all.filter(function (t) { return f === 'semua' || t.status === f; })
      .sort(function (a, b) { return (a.status === 'selesai') - (b.status === 'selesai') || (a.tenggat < b.tenggat ? -1 : 1); });
    var body = tabs('taskF', [['semua', 'Semua (' + all.length + ')'], ['belum', 'Belum'], ['proses', 'Dikerjakan'], ['selesai', 'Selesai']]) +
      (list.length ? '<ul class="task-list">' + list.map(function (t) { return taskRow(t, false); }).join('') + '</ul>' :
        empty(all.length ? 'Tidak ada tugas di filter ini' : 'Belum ada tugas', all.length ? 'Pilih filter lain untuk melihat tugasmu.' : 'Catat tugas pertamamu beserta tenggatnya.', all.length ? '' : '<button class="btn btn-ink" data-act="task-add">Tambah tugas</button>'));
    return page('Tugas', 'Centang tugas yang sudah selesai.', '<button class="btn btn-ink" data-act="task-add">Tambah tugas</button>', body);
  };

  /* ---------- Catatan ---------- */
  Views.catatan = function (u) {
    var q = S.noteQ.toLowerCase();
    var all = DB.where('notes', function (n) { return n.userId === u.id; });
    var list = all.filter(function (n) { return !q || (n.judul + ' ' + n.matkul + ' ' + n.isi).toLowerCase().indexOf(q) > -1; })
      .sort(function (a, b) { return a.updatedAt < b.updatedAt ? 1 : -1; });
    var body = '<div class="toolbar"><input class="search" type="search" data-filter="noteQ" value="' + esc(S.noteQ) + '" placeholder="Cari judul, mata kuliah, atau isi catatan" aria-label="Cari catatan"></div>' +
      (list.length ? '<div class="cards">' + list.map(function (n) {
        return '<article class="card note"><span class="chip">' + esc(n.matkul) + '</span><h3>' + esc(n.judul) + '</h3>' +
          '<p class="clamp">' + esc(n.isi) + '</p><div class="card-foot"><small>Diperbarui ' + UI.fmtDate(n.updatedAt) + '</small><div class="row-actions">' +
          '<button class="btn btn-quiet btn-sm" data-act="note-read" data-id="' + n.id + '">Baca</button>' + iconBtns('note', n.id) + '</div></div></article>';
      }).join('') + '</div>' : empty(all.length ? 'Catatan tidak ditemukan' : 'Belum ada catatan', all.length ? 'Coba kata kunci lain.' : 'Simpan ringkasan materi supaya mudah dicari saat ujian.', all.length ? '' : '<button class="btn btn-ink" data-act="note-add">Tulis catatan</button>'));
    return page('Catatan materi', 'Ringkasan dan catatan pembelajaranmu.', '<button class="btn btn-ink" data-act="note-add">Tulis catatan</button>', body);
  };

  /* ---------- Kelompok belajar ---------- */
  Views.kelompok = function (u) {
    var mine = DB.where('group_members', function (m) { return m.userId === u.id; }).map(function (m) { return m.groupId; });
    var all = DB.all('study_groups').sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
    var isAdmin = u.role === 'admin';
    var list = (S.groupTab === 'saya' && !isAdmin) ? all.filter(function (g) { return mine.indexOf(g.id) > -1; }) : all;
    var tabHtml = isAdmin ? '' : tabs('groupTab', [['jelajah', 'Jelajahi semua'], ['saya', 'Kelompokku']]);
    var body = tabHtml + (list.length ? '<div class="cards">' + list.map(function (g) {
      var count = DB.where('group_members', function (m) { return m.groupId === g.id; }).length;
      var joined = mine.indexOf(g.id) > -1, owner = g.ownerId === u.id;
      var btns = '<button class="btn btn-quiet btn-sm" data-act="group-detail" data-id="' + g.id + '">Detail</button>';
      if (!isAdmin && !owner) btns += joined ? '<button class="btn btn-outline btn-sm" data-act="group-leave" data-id="' + g.id + '">Keluar</button>' : '<button class="btn btn-ink btn-sm" data-act="group-join" data-id="' + g.id + '">Gabung</button>';
      if (owner) btns += iconBtns('group', g.id);
      else if (isAdmin) btns += '<button class="btn btn-quiet btn-sm text-danger" data-act="group-delete" data-id="' + g.id + '">Hapus</button>';
      return '<article class="card"><span class="chip">' + esc(g.matkul) + '</span><h3>' + esc(g.nama) + '</h3>' +
        '<p class="topic">' + esc(g.topik) + '</p><p>' + esc(g.deskripsi) + '</p>' +
        '<p class="meta">' + esc(g.jadwal) + '</p>' +
        '<p class="meta">' + count + ' anggota · dibuat oleh ' + (owner ? 'kamu' : esc(userName(g.ownerId))) + '</p>' +
        '<div class="card-foot"><div class="row-actions">' + btns + '</div></div></article>';
    }).join('') + '</div>' : empty('Belum ada kelompok', S.groupTab === 'saya' ? 'Gabung ke kelompok yang ada atau buat kelompokmu sendiri.' : 'Jadilah yang pertama membuat kelompok belajar.', '<button class="btn btn-ink" data-act="group-add">Buat kelompok</button>'));
    return page('Kelompok belajar', isAdmin ? 'Pantau kelompok yang dibuat pengguna.' : 'Cari teman belajar untuk mata kuliahmu.', isAdmin ? '' : '<button class="btn btn-ink" data-act="group-add">Buat kelompok</button>', body);
  };

  /* ---------- Kegiatan ---------- */
  function eventCard(e, u) {
    var st = eventState(u.id, e.id), past = UI.daysLeft(e.tanggal) < 0;
    var btns = '';
    if (u.role !== 'admin') {
      btns += '<button class="btn btn-quiet btn-sm" data-act="event-save" data-id="' + e.id + '">' + (st.simpan ? 'Hapus simpanan' : 'Simpan') + '</button>';
      btns += st.daftar ? '<button class="btn btn-outline btn-sm" data-act="event-unregister" data-id="' + e.id + '">Batalkan pendaftaran</button>'
        : '<button class="btn btn-ink btn-sm" data-act="event-register" data-id="' + e.id + '"' + (past ? ' disabled' : '') + '>Daftar</button>';
    }
    return '<article class="card event"><div class="event-date"><b>' + new Date(e.tanggal + 'T00:00').getDate() + '</b><span>' +
      new Date(e.tanggal + 'T00:00').toLocaleDateString('id-ID', { month: 'short' }) + '</span></div>' +
      '<div class="event-body"><div class="chips"><span class="chip chip-cat">' + esc(catName(e.categoryId)) + '</span>' +
      (st.daftar ? '<span class="chip chip-selesai">Terdaftar</span>' : '') + (st.simpan ? '<span class="chip chip-proses">Tersimpan</span>' : '') + (past ? '<span class="chip">Sudah lewat</span>' : '') + '</div>' +
      '<h3>' + esc(e.judul) + '</h3><p>' + esc(e.deskripsi) + '</p>' +
      '<p class="meta">' + esc(e.lokasi) + ' · ' + esc(e.penyelenggara) + ' · ' + UI.fmtDate(e.tanggal) + '</p>' +
      '<div class="card-foot"><div class="row-actions">' + btns + '</div></div></div></article>';
  }

  Views.kegiatan = function (u) {
    var q = S.eventQ.toLowerCase();
    var cats = DB.all('categories');
    var evs = DB.all('events').sort(function (a, b) { return a.tanggal < b.tanggal ? -1 : 1; });
    var list = evs.filter(function (e) {
      if (S.eventCat !== 'semua' && e.categoryId !== S.eventCat) return false;
      if (q && (e.judul + ' ' + e.penyelenggara + ' ' + e.lokasi + ' ' + e.deskripsi).toLowerCase().indexOf(q) < 0) return false;
      if (S.eventTab !== 'semua') {
        var st = eventState(u.id, e.id);
        if (S.eventTab === 'daftar' && !st.daftar) return false;
        if (S.eventTab === 'simpan' && !st.simpan) return false;
      }
      return true;
    });
    var chips = '<button class="pill' + (S.eventCat === 'semua' ? ' on' : '') + '" data-act="set" data-key="eventCat" data-val="semua">Semua</button>' + cats.map(function (c) {
      return '<button class="pill' + (S.eventCat === c.id ? ' on' : '') + '" data-act="set" data-key="eventCat" data-val="' + c.id + '">' + esc(c.nama) + '</button>';
    }).join('');
    var body = (u.role === 'admin' ? '' : tabs('eventTab', [['semua', 'Semua kegiatan'], ['daftar', 'Terdaftar'], ['simpan', 'Tersimpan']])) +
      '<div class="toolbar"><input class="search" type="search" data-filter="eventQ" value="' + esc(S.eventQ) + '" placeholder="Cari judul, penyelenggara, atau lokasi" aria-label="Cari kegiatan"></div>' +
      '<div class="pills">' + chips + '</div>' +
      (list.length ? '<div class="cards one">' + list.map(function (e) { return eventCard(e, u); }).join('') + '</div>' :
        empty('Kegiatan tidak ditemukan', 'Ubah kata kunci atau pilih kategori lain.'));
    return page('Informasi kegiatan', 'Seminar, webinar, workshop, kompetisi, dan beasiswa.', '', body);
  };

  /* ---------- Admin: kelola kegiatan ---------- */
  Views['admin-kegiatan'] = function (u) {
    if (u.role !== 'admin') return empty('Akses ditolak', 'Halaman ini hanya untuk admin.');
    var evs = DB.all('events').sort(function (a, b) { return a.tanggal < b.tanggal ? -1 : 1; });
    var cats = DB.all('categories');
    var table = evs.length ? '<div class="table-wrap"><table><thead><tr><th>Kegiatan</th><th>Kategori</th><th>Tanggal</th><th>Pendaftar</th><th><span class="sr">Aksi</span></th></tr></thead><tbody>' + evs.map(function (e) {
      var n = DB.where('registrations', function (r) { return r.eventId === e.id && r.type === 'daftar'; }).length;
      return '<tr><td><strong>' + esc(e.judul) + '</strong><small>' + esc(e.penyelenggara) + '</small></td><td>' + esc(catName(e.categoryId)) + '</td><td>' + UI.fmtDate(e.tanggal) + '</td><td>' + n + '</td>' +
        '<td class="row-actions"><button class="btn btn-quiet btn-sm" data-act="event-people" data-id="' + e.id + '">Peserta</button>' + iconBtns('event', e.id) + '</td></tr>';
    }).join('') + '</tbody></table></div>' : empty('Belum ada kegiatan', 'Tambahkan kegiatan pertama agar muncul di halaman pengguna.', '<button class="btn btn-ink" data-act="event-add">Tambah kegiatan</button>');
    var catHtml = '<section class="panel"><div class="panel-head"><h2>Kategori</h2><button class="btn btn-outline btn-sm" data-act="cat-add">Tambah kategori</button></div><ul class="cat-list">' + cats.map(function (c) {
      return '<li><span>' + esc(c.nama) + '</span>' + iconBtns('cat', c.id) + '</li>';
    }).join('') + '</ul></section>';
    return page('Kelola kegiatan', 'Tambah, ubah, dan hapus informasi kegiatan.', '<button class="btn btn-ink" data-act="event-add">Tambah kegiatan</button>', table + catHtml);
  };

  /* ---------- Admin: pengguna ---------- */
  Views['admin-pengguna'] = function (u) {
    if (u.role !== 'admin') return empty('Akses ditolak', 'Halaman ini hanya untuk admin.');
    var users = DB.all('users');
    return page('Pengguna', users.length + ' akun terdaftar.', '',
      '<div class="table-wrap"><table><thead><tr><th>Nama</th><th>Email</th><th>Program studi</th><th>Peran</th><th><span class="sr">Aksi</span></th></tr></thead><tbody>' + users.map(function (x) {
        var me = x.id === u.id;
        return '<tr><td><strong>' + esc(x.nama) + '</strong>' + (me ? '<small>Akunmu</small>' : '') + '</td><td>' + esc(x.email) + '</td><td>' + esc(x.prodi || '–') + '</td>' +
          '<td><span class="chip ' + (x.role === 'admin' ? 'chip-proses' : '') + '">' + (x.role === 'admin' ? 'Admin' : 'Pengguna') + '</span></td>' +
          '<td class="row-actions">' + (me ? '' : '<button class="btn btn-quiet btn-sm" data-act="user-role" data-id="' + x.id + '">' + (x.role === 'admin' ? 'Jadikan pengguna' : 'Jadikan admin') + '</button><button class="btn btn-quiet btn-sm text-danger" data-act="user-delete" data-id="' + x.id + '">Hapus</button>') + '</td></tr>';
      }).join('') + '</tbody></table></div>');
  };

  /* ==========================================================
     ACTIONS (Create / Update / Delete)
     ========================================================== */
  var Actions = {};
  function me() { return Auth.current(); }
  function owned(table, id) { var r = DB.get(table, id); return r && r.userId === me().id ? r : null; }

  Actions.set = function (d) { S[d.key] = d.val; rerender(); };

  /* Jadwal */
  var scheduleFields = [
    { name: 'matkul', label: 'Mata pelajaran / mata kuliah', required: true },
    { name: 'hari', label: 'Hari', type: 'select', options: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'], half: true },
    { name: 'ruang', label: 'Ruang', half: true },
    { name: 'mulai', label: 'Mulai', type: 'time', required: true, half: true },
    { name: 'selesai', label: 'Selesai', type: 'time', required: true, half: true }
  ];
  Actions['schedule-add'] = function () {
    UI.form({ title: 'Tambah jadwal', fields: scheduleFields, values: { hari: 'Senin', mulai: '08:00', selesai: '09:40' }, onSubmit: function (v) {
      if (v.selesai <= v.mulai) { UI.toast('Jam selesai harus setelah jam mulai.'); return false; }
      v.userId = me().id; DB.insert('schedules', v); UI.toast('Jadwal ditambahkan'); rerender();
    } });
  };
  Actions['schedule-edit'] = function (d) {
    var r = owned('schedules', d.id); if (!r) return;
    UI.form({ title: 'Ubah jadwal', fields: scheduleFields, values: r, onSubmit: function (v) {
      if (v.selesai <= v.mulai) { UI.toast('Jam selesai harus setelah jam mulai.'); return false; }
      DB.update('schedules', r.id, v); UI.toast('Jadwal diperbarui'); rerender();
    } });
  };
  Actions['schedule-delete'] = function (d) {
    var r = owned('schedules', d.id); if (!r) return;
    UI.confirm('Hapus jadwal ' + r.matkul + ' hari ' + r.hari + '?', function () { DB.remove('schedules', r.id); UI.toast('Jadwal dihapus'); rerender(); });
  };

  /* Tugas */
  var taskFields = [
    { name: 'judul', label: 'Nama tugas', required: true },
    { name: 'matkul', label: 'Mata pelajaran / mata kuliah', required: true },
    { name: 'deskripsi', label: 'Deskripsi', type: 'textarea', rows: 3 },
    { name: 'tenggat', label: 'Tenggat', type: 'date', required: true, half: true },
    { name: 'status', label: 'Status', type: 'select', options: [{ v: 'belum', l: 'Belum' }, { v: 'proses', l: 'Dikerjakan' }, { v: 'selesai', l: 'Selesai' }], half: true }
  ];
  Actions['task-add'] = function () {
    UI.form({ title: 'Tambah tugas', fields: taskFields, values: { status: 'belum', tenggat: DB.today() }, onSubmit: function (v) {
      v.userId = me().id; DB.insert('tasks', v); UI.toast('Tugas ditambahkan'); rerender();
    } });
  };
  Actions['task-edit'] = function (d) {
    var r = owned('tasks', d.id); if (!r) return;
    UI.form({ title: 'Ubah tugas', fields: taskFields, values: r, onSubmit: function (v) { DB.update('tasks', r.id, v); UI.toast('Tugas diperbarui'); rerender(); } });
  };
  Actions['task-delete'] = function (d) {
    var r = owned('tasks', d.id); if (!r) return;
    UI.confirm('Hapus tugas "' + r.judul + '"?', function () { DB.remove('tasks', r.id); UI.toast('Tugas dihapus'); rerender(); });
  };
  Actions['task-toggle'] = function (d, el) {
    var r = owned('tasks', d.id); if (!r) return;
    var nowDone = r.status !== 'selesai';
    DB.update('tasks', r.id, { status: nowDone ? 'selesai' : 'belum' });
    if (nowDone) {
      var left = DB.where('tasks', function (t) { return t.userId === me().id && t.status !== 'selesai'; }).length;
      Fun.burst(el, left ? 16 : 40);
      Fun.say(left ? Fun.cheer() : 'Semua tugas beres! Kamu juara ★');
    }
    rerender();
  };

  /* Catatan */
  var noteFields = [
    { name: 'judul', label: 'Judul catatan', required: true },
    { name: 'matkul', label: 'Mata pelajaran / mata kuliah', required: true },
    { name: 'isi', label: 'Isi catatan', type: 'textarea', rows: 8, required: true }
  ];
  Actions['note-add'] = function () {
    UI.form({ title: 'Tulis catatan', fields: noteFields, onSubmit: function (v) {
      v.userId = me().id; v.updatedAt = DB.today(); DB.insert('notes', v); UI.toast('Catatan disimpan'); rerender();
    } });
  };
  Actions['note-edit'] = function (d) {
    var r = owned('notes', d.id); if (!r) return;
    UI.form({ title: 'Ubah catatan', fields: noteFields, values: r, onSubmit: function (v) { v.updatedAt = DB.today(); DB.update('notes', r.id, v); UI.toast('Catatan diperbarui'); rerender(); } });
  };
  Actions['note-delete'] = function (d) {
    var r = owned('notes', d.id); if (!r) return;
    UI.confirm('Hapus catatan "' + r.judul + '"?', function () { DB.remove('notes', r.id); UI.toast('Catatan dihapus'); rerender(); });
  };
  Actions['note-read'] = function (d) {
    var r = owned('notes', d.id); if (!r) return;
    UI.openModal(r.judul, '<p class="meta">' + esc(r.matkul) + ' · diperbarui ' + UI.fmtDate(r.updatedAt) + '</p><div class="note-full">' + esc(r.isi) + '</div>' +
      '<div class="dialog-actions"><button class="btn btn-ink" data-act="close-modal">Tutup</button></div>');
  };

  /* Kelompok */
  var groupFields = [
    { name: 'nama', label: 'Nama kelompok', required: true },
    { name: 'matkul', label: 'Mata pelajaran / mata kuliah', required: true },
    { name: 'topik', label: 'Topik yang dibahas', required: true },
    { name: 'deskripsi', label: 'Deskripsi', type: 'textarea', rows: 3 },
    { name: 'jadwal', label: 'Jadwal belajar', placeholder: 'Contoh: Setiap Selasa, 19.00', required: true }
  ];
  function ownedGroup(id) { var g = DB.get('study_groups', id); return g && g.ownerId === me().id ? g : null; }
  Actions['group-add'] = function () {
    UI.form({ title: 'Buat kelompok belajar', fields: groupFields, submit: 'Buat kelompok', onSubmit: function (v) {
      v.ownerId = me().id; v.createdAt = DB.today();
      var g = DB.insert('study_groups', v);
      DB.insert('group_members', { groupId: g.id, userId: me().id });
      S.groupTab = 'saya'; UI.toast('Kelompok dibuat'); Fun.burst(); Fun.say('Kelompok baru! Ajak temanmu ♥'); rerender();
    } });
  };
  Actions['group-edit'] = function (d) {
    var g = ownedGroup(d.id); if (!g) return;
    UI.form({ title: 'Ubah kelompok', fields: groupFields, values: g, onSubmit: function (v) { DB.update('study_groups', g.id, v); UI.toast('Kelompok diperbarui'); rerender(); } });
  };
  Actions['group-delete'] = function (d) {
    var g = DB.get('study_groups', d.id); if (!g) return;
    if (g.ownerId !== me().id && !Auth.isAdmin()) return;
    UI.confirm('Hapus kelompok "' + g.nama + '" beserta keanggotaannya?', function () { DB.remove('study_groups', g.id); UI.toast('Kelompok dihapus'); rerender(); });
  };
  Actions['group-join'] = function (d) {
    var u = me();
    if (!DB.where('group_members', function (m) { return m.groupId === d.id && m.userId === u.id; }).length) DB.insert('group_members', { groupId: d.id, userId: u.id });
    UI.toast('Kamu bergabung ke kelompok'); Fun.burst(null, 20); Fun.say('Yey, nambah teman belajar!'); rerender();
  };
  Actions['group-leave'] = function (d) {
    var u = me();
    DB.removeWhere('group_members', function (m) { return m.groupId === d.id && m.userId === u.id; });
    UI.toast('Kamu keluar dari kelompok'); rerender();
  };
  function showGroup(id) {
    var g = DB.get('study_groups', id), u = me(); if (!g) return;
    var mem = DB.where('group_members', function (m) { return m.groupId === id; });
    var isOwner = g.ownerId === u.id;
    UI.openModal(g.nama, '<p class="meta">' + esc(g.matkul) + ' · ' + esc(g.topik) + '</p><p>' + esc(g.deskripsi) + '</p><p class="meta">' + esc(g.jadwal) + '</p>' +
      '<h3 class="sub">Anggota (' + mem.length + ')</h3><ul class="plain-list">' + mem.map(function (m) {
        var isO = m.userId === g.ownerId;
        return '<li><span class="avatar sm">' + esc(UI.initials(userName(m.userId))) + '</span><div class="grow"><strong>' + esc(userName(m.userId)) + '</strong><small>' + (isO ? 'Pembuat kelompok' : 'Anggota') + '</small></div>' +
          (isOwner && !isO ? '<button class="btn btn-quiet btn-sm text-danger" data-act="member-remove" data-id="' + m.id + '" data-group="' + id + '">Keluarkan</button>' : '') + '</li>';
      }).join('') + '</ul><div class="dialog-actions"><button class="btn btn-ink" data-act="close-modal">Tutup</button></div>');
  }
  Actions['group-detail'] = function (d) { showGroup(d.id); };
  Actions['member-remove'] = function (d) {
    var g = ownedGroup(d.group); if (!g) return;
    DB.remove('group_members', d.id); UI.toast('Anggota dikeluarkan'); showGroup(g.id); rerender();
  };

  /* Kegiatan (pengguna) */
  Actions['event-save'] = function (d) {
    var st = eventState(me().id, d.id);
    if (st.simpan) { DB.remove('registrations', st.simpan.id); UI.toast('Dihapus dari simpanan'); }
    else { DB.insert('registrations', { userId: me().id, eventId: d.id, type: 'simpan', createdAt: DB.today() }); UI.toast('Kegiatan disimpan'); Fun.burst(null, 8); }
    rerender();
  };
  Actions['event-register'] = function (d) {
    var e = DB.get('events', d.id); if (!e) return;
    UI.confirm('Daftar ke "' + e.judul + '"?', function () {
      DB.insert('registrations', { userId: me().id, eventId: d.id, type: 'daftar', createdAt: DB.today() });
      UI.toast('Pendaftaran berhasil'); Fun.burst(null, 30); Fun.say('Terdaftar! Jangan lupa hadir ya ✿'); rerender();
    }, 'Daftar');
  };
  Actions['event-unregister'] = function (d) {
    var st = eventState(me().id, d.id); if (!st.daftar) return;
    UI.confirm('Batalkan pendaftaran kegiatan ini?', function () { DB.remove('registrations', st.daftar.id); UI.toast('Pendaftaran dibatalkan'); rerender(); }, 'Batalkan pendaftaran');
  };

  /* Kegiatan (admin) */
  function eventFields() {
    return [
      { name: 'judul', label: 'Judul kegiatan', required: true },
      { name: 'categoryId', label: 'Kategori', type: 'select', options: DB.all('categories').map(function (c) { return { v: c.id, l: c.nama }; }), half: true },
      { name: 'tanggal', label: 'Tanggal', type: 'date', required: true, half: true },
      { name: 'lokasi', label: 'Lokasi', required: true, half: true },
      { name: 'penyelenggara', label: 'Penyelenggara', required: true, half: true },
      { name: 'deskripsi', label: 'Deskripsi', type: 'textarea', rows: 4 }
    ];
  }
  Actions['event-add'] = function () {
    if (!Auth.isAdmin()) return;
    if (!DB.all('categories').length) { UI.toast('Tambahkan kategori lebih dulu.'); return; }
    UI.form({ title: 'Tambah kegiatan', fields: eventFields(), values: { tanggal: DB.today() }, onSubmit: function (v) {
      v.createdBy = me().id; DB.insert('events', v); UI.toast('Kegiatan ditambahkan'); rerender();
    } });
  };
  Actions['event-edit'] = function (d) {
    if (!Auth.isAdmin()) return;
    var e = DB.get('events', d.id); if (!e) return;
    UI.form({ title: 'Ubah kegiatan', fields: eventFields(), values: e, onSubmit: function (v) { DB.update('events', e.id, v); UI.toast('Kegiatan diperbarui'); rerender(); } });
  };
  Actions['event-delete'] = function (d) {
    if (!Auth.isAdmin()) return;
    var e = DB.get('events', d.id); if (!e) return;
    UI.confirm('Hapus "' + e.judul + '"? Semua pendaftarnya ikut terhapus.', function () { DB.remove('events', e.id); UI.toast('Kegiatan dihapus'); rerender(); });
  };
  function showPeople(id) {
    var e = DB.get('events', id); if (!e) return;
    var regs = DB.where('registrations', function (r) { return r.eventId === id && r.type === 'daftar'; });
    UI.openModal('Peserta: ' + e.judul, (regs.length ? '<ul class="plain-list">' + regs.map(function (r) {
      var x = DB.get('users', r.userId);
      return '<li><span class="avatar sm">' + esc(UI.initials(x ? x.nama : '?')) + '</span><div class="grow"><strong>' + esc(x ? x.nama : 'Pengguna dihapus') + '</strong><small>' + esc(x ? x.email : '') + ' · daftar ' + UI.fmtDate(r.createdAt) + '</small></div>' +
        '<button class="btn btn-quiet btn-sm text-danger" data-act="reg-delete" data-id="' + r.id + '" data-event="' + id + '">Hapus</button></li>';
    }).join('') + '</ul>' : empty('Belum ada pendaftar', 'Pendaftar akan muncul di sini.')) + '<div class="dialog-actions"><button class="btn btn-ink" data-act="close-modal">Tutup</button></div>');
  }
  Actions['event-people'] = function (d) { if (Auth.isAdmin()) showPeople(d.id); };
  Actions['reg-delete'] = function (d) { if (!Auth.isAdmin()) return; DB.remove('registrations', d.id); UI.toast('Pendaftaran dihapus'); showPeople(d.event); rerender(); };

  /* Kategori (admin) */
  Actions['cat-add'] = function () {
    if (!Auth.isAdmin()) return;
    UI.form({ title: 'Tambah kategori', fields: [{ name: 'nama', label: 'Nama kategori', required: true }], onSubmit: function (v) { DB.insert('categories', v); UI.toast('Kategori ditambahkan'); rerender(); } });
  };
  Actions['cat-edit'] = function (d) {
    if (!Auth.isAdmin()) return;
    var c = DB.get('categories', d.id); if (!c) return;
    UI.form({ title: 'Ubah kategori', fields: [{ name: 'nama', label: 'Nama kategori', required: true }], values: c, onSubmit: function (v) { DB.update('categories', c.id, v); UI.toast('Kategori diperbarui'); rerender(); } });
  };
  Actions['cat-delete'] = function (d) {
    if (!Auth.isAdmin()) return;
    var c = DB.get('categories', d.id); if (!c) return;
    var used = DB.where('events', function (e) { return e.categoryId === c.id; }).length;
    if (used) { UI.toast('Kategori dipakai ' + used + ' kegiatan. Pindahkan kegiatannya dulu.'); return; }
    UI.confirm('Hapus kategori "' + c.nama + '"?', function () { DB.remove('categories', c.id); UI.toast('Kategori dihapus'); rerender(); });
  };

  /* Pengguna (admin) */
  Actions['user-role'] = function (d) {
    if (!Auth.isAdmin() || d.id === me().id) return;
    var x = DB.get('users', d.id); if (!x) return;
    DB.update('users', x.id, { role: x.role === 'admin' ? 'user' : 'admin' }); UI.toast('Peran diperbarui'); rerender();
  };
  Actions['user-delete'] = function (d) {
    if (!Auth.isAdmin() || d.id === me().id) return;
    var x = DB.get('users', d.id); if (!x) return;
    UI.confirm('Hapus akun ' + x.nama + '? Jadwal, tugas, catatan, dan kelompok miliknya ikut terhapus.', function () { DB.remove('users', x.id); UI.toast('Akun dihapus'); rerender(); });
  };

  window.Views = Views;
  window.Actions = Actions;
  window.ViewState = S;
})();
