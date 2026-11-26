-- ===========================================================
-- EDUVERSE – rancangan basis data (MySQL 8)
-- Sesuai bab 8 dokumen usulan. Prototipe web saat ini memakai
-- struktur yang sama di localStorage (lihat js/db.js).
-- ===========================================================
CREATE DATABASE IF NOT EXISTS eduverse CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE eduverse;

CREATE TABLE users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nama        VARCHAR(100) NOT NULL,
  email       VARCHAR(120) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,             -- simpan hasil bcrypt/argon2, bukan teks asli
  prodi       VARCHAR(120) NULL,
  role        ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE schedules (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  user_id   INT NOT NULL,
  matkul    VARCHAR(120) NOT NULL,
  hari      ENUM('Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu') NOT NULL,
  mulai     TIME NOT NULL,
  selesai   TIME NOT NULL,
  ruang     VARCHAR(60) NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE tasks (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  judul      VARCHAR(150) NOT NULL,
  matkul     VARCHAR(120) NOT NULL,
  deskripsi  TEXT NULL,
  tenggat    DATE NOT NULL,
  status     ENUM('belum','proses','selesai') NOT NULL DEFAULT 'belum',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE notes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  judul       VARCHAR(150) NOT NULL,
  matkul      VARCHAR(120) NOT NULL,
  isi         TEXT NOT NULL,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE study_groups (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  owner_id    INT NOT NULL,                      -- pembuat kelompok
  nama        VARCHAR(100) NOT NULL,
  matkul      VARCHAR(120) NOT NULL,
  topik       VARCHAR(150) NOT NULL,
  deskripsi   TEXT NULL,
  jadwal      VARCHAR(120) NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE group_members (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  group_id  INT NOT NULL,
  user_id   INT NOT NULL,
  UNIQUE KEY uq_member (group_id, user_id),      -- satu pengguna satu kali per kelompok
  FOREIGN KEY (group_id) REFERENCES study_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id)        ON DELETE CASCADE
);

CREATE TABLE categories (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  nama  VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE events (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  category_id    INT NOT NULL,
  created_by     INT NULL,                       -- admin / penyelenggara
  judul          VARCHAR(200) NOT NULL,
  tanggal        DATE NOT NULL,
  lokasi         VARCHAR(150) NOT NULL,
  penyelenggara  VARCHAR(150) NOT NULL,
  deskripsi      TEXT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by)  REFERENCES users(id)      ON DELETE SET NULL
);

CREATE TABLE registrations (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  event_id    INT NOT NULL,
  type        ENUM('daftar','simpan') NOT NULL,  -- daftar = terdaftar, simpan = disimpan saja
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_reg (user_id, event_id, type),
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Data awal kategori (id 1-5 dipakai oleh seed.sql)
INSERT INTO categories (id, nama) VALUES (1,'Seminar'),(2,'Webinar'),(3,'Workshop'),(4,'Kompetisi'),(5,'Beasiswa');
