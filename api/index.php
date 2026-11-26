<?php
declare(strict_types=1);

/* ===========================================================
   api/index.php – satu pintu masuk API EDUVERSE
   GET  ?r=bootstrap                  data awal + status login
   POST ?r=login | register | logout
   POST ?r=create&t=TABEL             tambah data
   POST ?r=update&t=TABEL&id=ID       ubah data
   POST ?r=delete&t=TABEL&id=ID       hapus data
   =========================================================== */
require __DIR__ . '/lib.php';

ini_set('display_errors', '0');
mb_internal_encoding('UTF-8');
start_session();

try {
    $route = (string)($_GET['r'] ?? '');
    $method = $_SERVER['REQUEST_METHOD'];

    if ($route === 'bootstrap') {
        if ($method !== 'GET') fail('Metode tidak diizinkan.', 405);
        respond(bootstrap());
    }

    if ($method !== 'POST') fail('Metode tidak diizinkan.', 405);
    check_csrf();
    $in = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($in)) $in = [];

    switch ($route) {
        case 'login': {
            $_SESSION['fails'] = array_values(array_filter($_SESSION['fails'] ?? [], fn($t) => $t > time() - 600));
            if (count($_SESSION['fails']) >= 8) fail('Terlalu banyak percobaan. Coba lagi beberapa menit lagi.', 429);
            $email = strtolower(trim((string)($in['email'] ?? '')));
            $pass = (string)($in['password'] ?? '');
            $u = one('SELECT id, password FROM users WHERE LOWER(email) = ?', [$email]);
            if (!$u || !password_verify($pass, $u['password'])) {
                $_SESSION['fails'][] = time();
                fail('Email atau kata sandi salah. Periksa lagi lalu coba masuk kembali.', 401);
            }
            session_regenerate_id(true);
            $_SESSION['uid'] = (int)$u['id'];
            $_SESSION['fails'] = [];
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
            respond(bootstrap());
        }

        case 'register': {
            $nama = trim((string)($in['nama'] ?? ''));
            $email = strtolower(trim((string)($in['email'] ?? '')));
            $pass = (string)($in['password'] ?? '');
            $prodi = trim((string)($in['prodi'] ?? ''));
            if ($nama === '') fail('Isi nama lengkap.');
            if (mb_strlen($nama) > 100) fail('Nama maksimal 100 karakter.');
            if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 120) fail('Format email belum benar. Contoh: nama@kampus.ac.id');
            if (strlen($pass) < 6) fail('Kata sandi minimal 6 karakter.');
            if (strlen($pass) > 72) fail('Kata sandi maksimal 72 karakter.');
            if (mb_strlen($prodi) > 120) fail('Program studi maksimal 120 karakter.');
            if (one('SELECT id FROM users WHERE LOWER(email) = ?', [$email])) fail('Email ini sudah terdaftar. Silakan masuk.', 409);
            q('INSERT INTO users (nama, email, password, prodi, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                [$nama, $email, password_hash($pass, PASSWORD_DEFAULT), $prodi === '' ? null : $prodi, 'user', now()]);
            session_regenerate_id(true);
            $_SESSION['uid'] = (int)pdo()->lastInsertId();
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
            respond(bootstrap());
        }

        case 'logout': {
            $_SESSION = [];
            session_regenerate_id(true);
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
            respond(bootstrap());
        }

        case 'create': case 'update': case 'delete': {
            $u = require_user();
            $t = (string)($_GET['t'] ?? '');
            if (!in_array($t, TABLES, true)) fail('Tabel tidak dikenal.', 404);
            if ($route === 'create') respond(['row' => out_row(crud_create($t, $in, $u))], 201);
            $id = (string)($_GET['id'] ?? '');
            if ($route === 'update') respond(['row' => out_row(crud_update($t, $id, $in, $u))]);
            crud_delete($t, $id, $u);
            respond(['ok' => true]);
        }
    }
    fail('Rute tidak ditemukan.', 404);
} catch (Throwable $e) {
    error_log('[EDUVERSE] ' . $e->getMessage());
    fail(friendly_error($e), 500);
}
