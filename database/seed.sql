-- ===========================================================
-- EDUVERSE – data contoh (jalankan SETELAH schema.sql)
-- Akun demo:  admin@eduverse.id / admin123
--             mahasiswa@eduverse.id / user123  (juga dimas@ dan sari@, sandi sama)
-- Tanggal dibuat relatif terhadap hari impor, jadi tenggat selalu terlihat segar.
-- ===========================================================
USE eduverse;

INSERT INTO users (id, nama, email, password, prodi, role, created_at) VALUES
 (1, 'Admin EDUVERSE', 'admin@eduverse.id',     '$2y$10$Lps6F.F4wiHUF7DkJPdqQueDluk0JPA5iitAVjo4S.tdNPAEGDLCe', 'Pengelola sistem',        'admin', NOW() - INTERVAL 90 DAY),
 (2, 'Rani Putri',     'mahasiswa@eduverse.id', '$2y$10$2ie09Sj5SWK3V6Qqao1ON.og/onTMVBxPOfI5mt/N9BIBV/VeLj.K', 'Sistem Informasi, 3B',    'user',  NOW() - INTERVAL 60 DAY),
 (3, 'Dimas Pratama',  'dimas@eduverse.id',     '$2y$10$2ie09Sj5SWK3V6Qqao1ON.og/onTMVBxPOfI5mt/N9BIBV/VeLj.K', 'Teknik Informatika, 3A',  'user',  NOW() - INTERVAL 45 DAY),
 (4, 'Sari Wulandari', 'sari@eduverse.id',      '$2y$10$2ie09Sj5SWK3V6Qqao1ON.og/onTMVBxPOfI5mt/N9BIBV/VeLj.K', 'Sistem Informasi, 3B',    'user',  NOW() - INTERVAL 30 DAY);

INSERT INTO schedules (user_id, matkul, hari, mulai, selesai, ruang) VALUES
 (2, 'Basis Data',         'Senin',  '08:00', '09:40', 'Lab 2'),
 (2, 'Pemrograman Web',    'Rabu',   '10:00', '11:40', 'R. 305'),
 (2, 'Statistika',         'Jumat',  '13:00', '14:40', 'R. 201'),
 (2, 'Jaringan Komputer',  'Kamis',  '09:00', '10:40', 'Lab 1');

INSERT INTO tasks (user_id, judul, matkul, deskripsi, tenggat, status) VALUES
 (2, 'Rancang ERD sistem perpustakaan',  'Basis Data',        'Minimal 6 tabel dengan relasi.',  CURDATE() + INTERVAL 1 DAY,  'proses'),
 (2, 'Laporan praktikum HTML dan CSS',   'Pemrograman Web',   NULL,                              CURDATE() + INTERVAL 3 DAY,  'belum'),
 (2, 'Latihan soal distribusi normal',   'Statistika',        'Bab 4, soal 1 sampai 10.',        CURDATE() + INTERVAL 6 DAY,  'belum'),
 (2, 'Rangkuman topologi jaringan',      'Jaringan Komputer', NULL,                              CURDATE() - INTERVAL 1 DAY,  'selesai');

INSERT INTO notes (user_id, judul, matkul, isi, updated_at) VALUES
 (2, 'Normalisasi 1NF sampai 3NF', 'Basis Data', '1NF: tidak ada atribut berulang.\n2NF: tidak ada ketergantungan parsial pada kunci.\n3NF: tidak ada ketergantungan transitif.', NOW() - INTERVAL 2 DAY),
 (2, 'Box model CSS', 'Pemrograman Web', 'Content, padding, border, margin. Gunakan box-sizing: border-box agar hitungan lebar lebih mudah.', NOW() - INTERVAL 4 DAY);

INSERT INTO study_groups (id, owner_id, nama, matkul, topik, deskripsi, jadwal, created_at) VALUES
 (1, 3, 'Basis Data Squad',  'Basis Data',      'Normalisasi dan relasi tabel',    'Belajar bareng sebelum kuis dan praktikum.', 'Setiap Selasa, 19.00 (online)',  NOW() - INTERVAL 20 DAY),
 (2, 2, 'Web Dev Pagi',      'Pemrograman Web', 'HTML, CSS, JavaScript dasar',     'Saling review kode proyek akhir.',           'Sabtu, 09.00 di perpustakaan',   NOW() - INTERVAL 12 DAY),
 (3, 4, 'Statistika Santai', 'Statistika',      'Probabilitas dan uji hipotesis',  'Bahas latihan soal bersama.',                'Rabu, 16.00',                    NOW() - INTERVAL 8 DAY);

INSERT INTO group_members (group_id, user_id) VALUES (1,3),(1,2),(2,2),(2,4),(3,4);

INSERT INTO events (id, category_id, created_by, judul, tanggal, lokasi, penyelenggara, deskripsi) VALUES
 (1, 1, 1, 'Seminar Nasional Transformasi Digital Pendidikan', CURDATE() + INTERVAL 9 DAY,  'Aula Utama Kampus',  'BEM Fakultas Teknologi', 'Pembicara dari praktisi edtech membahas tren pembelajaran digital.'),
 (2, 2, 1, 'Webinar Karier di Dunia Data',                     CURDATE() + INTERVAL 4 DAY,  'Online (Zoom)',      'Himpunan Mahasiswa SI',  'Mengenal peran data analyst, data engineer, dan cara memulai portofolio.'),
 (3, 3, 1, 'Workshop Git dan GitHub untuk Proyek Kelompok',    CURDATE() + INTERVAL 14 DAY, 'Lab Komputer 3',     'Lab Pemrograman',        'Praktik branching, pull request, dan menyelesaikan konflik merge.'),
 (4, 4, 1, 'Hackathon Inovasi Pendidikan',                     CURDATE() + INTERVAL 25 DAY, 'Gedung Inovasi',     'Dinas Pendidikan',       'Tim 3 sampai 4 orang membangun prototipe solusi untuk masalah belajar di sekolah.'),
 (5, 5, 1, 'Beasiswa Prestasi Semester Genap',                 CURDATE() + INTERVAL 30 DAY, 'Daftar online',      'Biro Kemahasiswaan',     'Syarat: IPK minimal 3,50 dan surat rekomendasi dosen. Batas pendaftaran tertera pada tanggal kegiatan.'),
 (6, 2, 1, 'Webinar Menulis Artikel Ilmiah Pertama',           CURDATE() + INTERVAL 17 DAY, 'Online (Google Meet)','Perpustakaan Kampus',   'Dari memilih topik sampai mengirim ke jurnal mahasiswa.');

INSERT INTO registrations (user_id, event_id, type, created_at) VALUES
 (2, 2, 'daftar', NOW() - INTERVAL 1 DAY),
 (2, 5, 'simpan', NOW() - INTERVAL 1 DAY),
 (3, 2, 'daftar', NOW() - INTERVAL 2 DAY);
