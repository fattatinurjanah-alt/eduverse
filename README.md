# EDUVERSE (HTML, CSS, JavaScript, PHP, MySQL)

Website usulan proyek EDUVERSE: manajemen akademik, komunitas belajar, dan informasi kegiatan pendidikan.
Data disimpan di **MySQL** lewat **API PHP**. Tampilan dan interaksi (maskot Evi, konfeti, level) tetap sama.

## Cara menjalankan (XAMPP / Laragon)
1. Salin folder `eduverse` ke `htdocs` (XAMPP) atau `www` (Laragon).
2. Nyalakan **Apache** dan **MySQL**.
3. Buka phpMyAdmin → tab **Import** → impor `database/schema.sql`, lalu `database/seed.sql`.
4. Cek `api/config.php` (bawaan XAMPP: user `root`, tanpa kata sandi). Ubah kalau berbeda.
5. Buka **http://localhost/eduverse/** di browser.

Website tidak bisa dibuka dengan klik dua kali `index.html` (file://) karena sekarang butuh server PHP.

## Akun demo
| Peran | Email | Kata sandi |
|---|---|---|
| Mahasiswa | mahasiswa@eduverse.id | user123 |
| Admin | admin@eduverse.id | admin123 |

Akun baru bisa dibuat lewat "Daftar gratis" (otomatis berperan mahasiswa).

## Struktur
```
index.html            halaman beranda + kerangka aplikasi
css/style.css         seluruh tampilan (responsif)
js/db.js              lapisan data: memanggil API, menyimpan salinan di memori
js/auth.js            login, daftar, keluar (lewat API)
js/ui.js              toast, dialog form, format tanggal
js/fun.js             maskot Evi, konfeti hati, kilau kursor
js/views.js           halaman (Views) dan aksi CRUD (Actions)
js/main.js            router, navigasi, dialog login, demo hero
api/config.php        pengaturan koneksi MySQL
api/lib.php           PDO, sesi, validasi, aturan hak akses
api/index.php         pintu masuk API (login, register, create, update, delete)
database/schema.sql   9 tabel MySQL + relasi
database/seed.sql     data contoh dan akun demo
```

## Cara kerja singkat
- Saat halaman dibuka, `db.js` mengambil data milik pengguna dari `api/index.php?r=bootstrap`.
- Membaca data memakai salinan di memori. Menambah, mengubah, dan menghapus langsung tampil di layar, lalu dikirim ke server berurutan.
- Server selalu memeriksa ulang: siapa yang login, kepemilikan data, dan isi input. Jika menolak, pesannya muncul dan data dimuat ulang dari MySQL.

## Keamanan yang sudah diterapkan
- Kata sandi di-hash dengan `password_hash` (bcrypt), tidak pernah dikirim balik ke browser.
- Semua query memakai prepared statement (aman dari SQL injection).
- Sesi server (cookie `HttpOnly`, `SameSite=Lax`) dan token CSRF pada setiap aksi tulis.
- Hak akses ditegakkan di server: pengguna hanya bisa mengubah data miliknya, hanya pembuat kelompok yang bisa mengelola anggota, hanya admin yang mengelola kegiatan, kategori, dan akun.
- Pembatasan percobaan login (8 kali gagal per 10 menit per sesi).
- Pengguna biasa hanya menerima nama (bukan email) pengguna lain yang satu kelompok dengannya.
- Teks pengguna di-escape saat ditampilkan, sehingga aman dari XSS.

Catatan untuk dipakai di server sungguhan: aktifkan HTTPS, buat user MySQL khusus (jangan `root`), dan ganti akun demo.
