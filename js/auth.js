/* ===========================================================
   auth.js – registrasi, login, logout (lewat API PHP + sesi server)
   Kata sandi dikirim ke server dan di-hash di sana (password_hash).
   =========================================================== */
(function () {
  'use strict';

  var Auth = {
    current: function () { return DB.currentUser(); },
    isAdmin: function () { var u = Auth.current(); return !!u && u.role === 'admin'; },

    // Mengembalikan Promise<{ ok, user } | { ok:false, error }>
    login: function (email, password) {
      return DB.auth('login', { email: (email || '').trim(), password: password || '' });
    },

    register: function (p) {
      var email = (p.email || '').trim();
      if (!(p.nama || '').trim()) return Promise.resolve({ ok: false, error: 'Isi nama lengkap.' });
      if (!/^\S+@\S+\.\S+$/.test(email)) return Promise.resolve({ ok: false, error: 'Format email belum benar. Contoh: nama@kampus.ac.id' });
      if ((p.password || '').length < 6) return Promise.resolve({ ok: false, error: 'Kata sandi minimal 6 karakter.' });
      return DB.auth('register', { nama: p.nama.trim(), email: email, password: p.password, prodi: (p.prodi || '').trim() });
    },

    logout: function () { return DB.auth('logout', {}); }
  };

  window.Auth = Auth;
})();
