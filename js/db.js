/* ===========================================================
   db.js – lapisan data EDUVERSE (versi PHP + MySQL)
   Antarmuka sama seperti versi prototipe (all/get/where/insert/update/remove),
   tetapi data sekarang berasal dari API di folder api/ dan disimpan di MySQL.
   - Pembacaan memakai salinan data di memori (cepat, tidak perlu menunggu).
   - Penulisan langsung tampil di layar, lalu dikirim ke server berurutan.
   - Server tetap penentu: jika menolak, pesan galatnya tampil dan data dimuat ulang.
   =========================================================== */
(function () {
  'use strict';

  var API = 'api/index.php';
  var TABLES = ['users', 'schedules', 'tasks', 'notes', 'study_groups', 'group_members', 'categories', 'events', 'registrations'];

  var data = {}, user = null, csrf = '';
  var tempIds = {};                 // id sementara (di layar) -> id asli dari MySQL
  var queue = Promise.resolve();    // antrean tulis: urutan terjaga
  TABLES.forEach(function (t) { data[t] = []; });

  function iso(d) { return d.toISOString().slice(0, 10); }
  function localToday() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function tmpId() { return 'tmp-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function toast(msg) { if (window.UI) UI.toast(msg); }

  /* ---------- HTTP ---------- */
  function request(method, route, params, body) {
    var qs = 'r=' + encodeURIComponent(route);
    Object.keys(params || {}).forEach(function (k) { qs += '&' + k + '=' + encodeURIComponent(params[k]); });
    var opt = { method: method, credentials: 'same-origin', headers: { 'X-CSRF-Token': csrf } };
    if (method !== 'GET') { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body || {}); }
    return fetch(API + '?' + qs, opt).then(function (res) {
      return res.text().then(function (txt) {
        var json = null;
        try { json = JSON.parse(txt); } catch (e) { /* bukan JSON */ }
        if (!res.ok || !json) {
          var err = new Error((json && json.error) || 'Server tidak merespons dengan benar. Pastikan Apache dan MySQL berjalan, lalu buka lewat http://localhost/…');
          err.status = res.status;
          throw err;
        }
        return json;
      });
    }, function () {
      throw new Error('Tidak bisa terhubung ke server. Pastikan Apache dan MySQL berjalan, lalu buka lewat http://localhost/…');
    });
  }

  function apply(payload) {
    user = payload.user || null;
    if (payload.csrf) csrf = payload.csrf;
    TABLES.forEach(function (t) { data[t] = (payload.data && payload.data[t]) || []; });
    tempIds = {};
  }

  function rerender() {
    var app = document.getElementById('app');
    if (window.App && app && !app.hidden) window.App.render();
  }

  /* ---------- Antrean tulis ---------- */
  function resolveIds(obj) {
    var out = {};
    Object.keys(obj).forEach(function (k) {
      var v = obj[k];
      out[k] = (typeof v === 'string' && tempIds[v]) ? tempIds[v] : v;
    });
    return out;
  }
  function enqueue(job) {
    queue = queue.then(job).catch(function (err) {
      toast(err.message);
      return DB.refresh().then(rerender, function () { /* abaikan */ });
    });
    return queue;
  }
  function dropDuplicates(t, row) {
    data[t] = data[t].filter(function (r) { return r === row || r.id !== row.id; });
  }

  var DB = {
    ready: null,
    error: null,
    today: localToday,

    /* ----- sesi dan pemuatan ----- */
    currentUser: function () { return user; },
    refresh: function () { return request('GET', 'bootstrap').then(apply); },
    // login / register / logout: mengembalikan { ok, user } atau { ok:false, error }
    auth: function (route, body) {
      var run = function () {
        return request('POST', route, {}, body).then(function (p) { apply(p); return { ok: true, user: user }; },
          function (e) { return { ok: false, error: e.message }; });
      };
      return route === 'logout' ? queue.then(run) : run();
    },

    /* ----- READ ----- */
    all: function (t) { return data[t].slice(); },
    get: function (t, id) { return data[t].find(function (r) { return r.id === id; }) || null; },
    where: function (t, fn) { return data[t].filter(fn); },

    /* ----- CREATE ----- */
    insert: function (t, row) {
      var tmp = tmpId();
      var payload = {};
      Object.keys(row).forEach(function (k) { if (k !== 'id') payload[k] = row[k]; });
      row.id = tmp;
      data[t].push(row);
      enqueue(function () {
        return request('POST', 'create', { t: t }, resolveIds(payload)).then(function (res) {
          tempIds[tmp] = res.row.id;
          Object.keys(res.row).forEach(function (k) { row[k] = res.row[k]; });
          dropDuplicates(t, row);
          rerender();   // agar tombol di layar memakai id asli
        });
      });
      return row;
    },

    /* ----- UPDATE ----- */
    update: function (t, id, patch) {
      var r = DB.get(t, id);
      if (!r) return null;
      Object.keys(patch).forEach(function (k) { if (k !== 'id') r[k] = patch[k]; });
      var body = {};
      Object.keys(patch).forEach(function (k) { if (k !== 'id') body[k] = patch[k]; });
      enqueue(function () {
        var real = tempIds[id] || id;
        return request('POST', 'update', { t: t, id: real }, resolveIds(body)).then(function (res) {
          Object.keys(res.row).forEach(function (k) { r[k] = res.row[k]; });
        });
      });
      return r;
    },

    /* ----- DELETE (+ cascade di salinan layar; MySQL memakai ON DELETE CASCADE) ----- */
    remove: function (t, id) {
      if (t === 'users') {
        DB.where('study_groups', function (g) { return g.ownerId === id; }).forEach(function (g) { dropLocal('study_groups', g.id); });
        ['schedules', 'tasks', 'notes', 'group_members', 'registrations'].forEach(function (tb) {
          data[tb] = data[tb].filter(function (r) { return r.userId !== id; });
        });
      }
      dropLocal(t, id);
      enqueue(function () {
        var real = tempIds[id] || id;
        return request('POST', 'delete', { t: t, id: real });
      });
    },
    removeWhere: function (t, fn) {
      DB.where(t, fn).forEach(function (r) { DB.remove(t, r.id); });
    }
  };

  function dropLocal(t, id) {
    if (t === 'study_groups') data.group_members = data.group_members.filter(function (m) { return m.groupId !== id; });
    if (t === 'events') data.registrations = data.registrations.filter(function (r) { return r.eventId !== id; });
    data[t] = data[t].filter(function (r) { return r.id !== id; });
  }

  // Muat data awal. Selalu selesai (tidak menolak) supaya halaman tetap tampil walau server mati.
  DB.ready = request('GET', 'bootstrap').then(apply).catch(function (e) { DB.error = e.message; });

  window.DB = DB;
})();
