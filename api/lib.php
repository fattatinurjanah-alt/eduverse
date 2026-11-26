<?php
declare(strict_types=1);

/* ===========================================================
   lib.php – fungsi inti API EDUVERSE
   Koneksi PDO, sesi, validasi input, dan aturan hak akses.
   Semua query memakai prepared statement.
   =========================================================== */

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const TABLES = ['users', 'schedules', 'tasks', 'notes', 'study_groups', 'group_members', 'categories', 'events', 'registrations'];

/* ---------- Koneksi ---------- */
function pdo(): PDO
{
    static $pdo = null;
    if ($pdo) return $pdo;
    $c = require __DIR__ . '/config.php';
    $dsn = getenv('EDUVERSE_DSN') ?: sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $c['db_host'], $c['db_port'], $c['db_name']);
    $pdo = new PDO($dsn, $c['db_user'] ?? null, $c['db_pass'] ?? null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    if (str_starts_with($dsn, 'sqlite')) $pdo->exec('PRAGMA foreign_keys = ON');
    return $pdo;
}
function q(string $sql, array $p = []): PDOStatement { $s = pdo()->prepare($sql); $s->execute($p); return $s; }
function one(string $sql, array $p = []): ?array { $r = q($sql, $p)->fetch(); return $r ?: null; }

/* ---------- Respons ---------- */
function respond(array $data, int $code = 200): never
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function fail(string $msg, int $code = 400): never { respond(['error' => $msg], $code); }

/* ---------- Sesi dan CSRF ---------- */
function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_name('eduverse_sid');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax', 'secure' => !empty($_SERVER['HTTPS'])]);
    session_start();
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
}
function check_csrf(): void
{
    $t = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!is_string($t) || !hash_equals($_SESSION['csrf'], $t)) fail('Sesi tidak valid. Muat ulang halaman lalu coba lagi.', 419);
}
function current_user(): ?array
{
    if (empty($_SESSION['uid'])) return null;
    $u = one('SELECT id, nama, email, prodi, role, created_at FROM users WHERE id = ?', [(int)$_SESSION['uid']]);
    if (!$u) unset($_SESSION['uid']);
    return $u;
}
function require_user(): array { $u = current_user(); if (!$u) fail('Silakan masuk terlebih dahulu.', 401); return $u; }
function require_role(array $u, string $role): void { if ($u['role'] !== $role) fail('Kamu tidak punya akses untuk aksi ini.', 403); }

/* ---------- Spesifikasi tabel dan validasi ---------- */
function f(string $type, string $label, $arg = null, bool $req = false): array { return ['type' => $type, 'label' => $label, 'arg' => $arg, 'req' => $req]; }

function spec(): array
{
    static $s = null;
    return $s ??= [
        'users' => ['cols' => ['id', 'nama', 'email', 'prodi', 'role', 'created_at'], 'fields' => []],
        'schedules' => ['cols' => ['id', 'user_id', 'matkul', 'hari', 'mulai', 'selesai', 'ruang'], 'fields' => [
            'matkul' => f('str', 'Mata pelajaran/mata kuliah', 120, true), 'hari' => f('enum', 'Hari', DAYS, true),
            'mulai' => f('time', 'Jam mulai', null, true), 'selesai' => f('time', 'Jam selesai', null, true), 'ruang' => f('str', 'Ruang', 60)]],
        'tasks' => ['cols' => ['id', 'user_id', 'judul', 'matkul', 'deskripsi', 'tenggat', 'status'], 'fields' => [
            'judul' => f('str', 'Nama tugas', 150, true), 'matkul' => f('str', 'Mata pelajaran/mata kuliah', 120, true),
            'deskripsi' => f('text', 'Deskripsi'), 'tenggat' => f('date', 'Tenggat', null, true),
            'status' => f('enum', 'Status', ['belum', 'proses', 'selesai'], true)]],
        'notes' => ['cols' => ['id', 'user_id', 'judul', 'matkul', 'isi', 'updated_at'], 'fields' => [
            'judul' => f('str', 'Judul catatan', 150, true), 'matkul' => f('str', 'Mata pelajaran/mata kuliah', 120, true),
            'isi' => f('text', 'Isi catatan', null, true)]],
        'study_groups' => ['cols' => ['id', 'owner_id', 'nama', 'matkul', 'topik', 'deskripsi', 'jadwal', 'created_at'], 'fields' => [
            'nama' => f('str', 'Nama kelompok', 100, true), 'matkul' => f('str', 'Mata pelajaran/mata kuliah', 120, true),
            'topik' => f('str', 'Topik', 150, true), 'deskripsi' => f('text', 'Deskripsi'), 'jadwal' => f('str', 'Jadwal belajar', 120, true)]],
        'group_members' => ['cols' => ['id', 'group_id', 'user_id'], 'fields' => []],
        'categories' => ['cols' => ['id', 'nama'], 'fields' => ['nama' => f('str', 'Nama kategori', 60, true)]],
        'events' => ['cols' => ['id', 'category_id', 'created_by', 'judul', 'tanggal', 'lokasi', 'penyelenggara', 'deskripsi'], 'fields' => [
            'judul' => f('str', 'Judul kegiatan', 200, true), 'category_id' => f('ref', 'Kategori', 'categories', true),
            'tanggal' => f('date', 'Tanggal', null, true), 'lokasi' => f('str', 'Lokasi', 150, true),
            'penyelenggara' => f('str', 'Penyelenggara', 150, true), 'deskripsi' => f('text', 'Deskripsi')]],
        'registrations' => ['cols' => ['id', 'user_id', 'event_id', 'type', 'created_at'], 'fields' => []],
    ];
}
function to_camel(string $s): string { return lcfirst(str_replace('_', '', ucwords($s, '_'))); }

function clean(string $t, array $in, bool $partial = false): array
{
    $out = [];
    foreach (spec()[$t]['fields'] as $col => $d) {
        $key = to_camel($col);
        if (!array_key_exists($key, $in)) {
            if ($partial) continue;
            $val = null;
        } else {
            $val = $in[$key];
        }
        $v = is_scalar($val) ? trim((string)$val) : '';
        if ($v === '') {
            if ($d['req']) fail($d['label'] . ' wajib diisi.');
            $out[$col] = null;
            continue;
        }
        switch ($d['type']) {
            case 'str':
                if (mb_strlen($v) > $d['arg']) fail($d['label'] . ' maksimal ' . $d['arg'] . ' karakter.');
                break;
            case 'text':
                if (mb_strlen($v) > 5000) fail($d['label'] . ' terlalu panjang (maksimal 5000 karakter).');
                break;
            case 'enum':
                if (!in_array($v, $d['arg'], true)) fail($d['label'] . ' tidak valid.');
                break;
            case 'date':
                if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $v, $m) || !checkdate((int)$m[2], (int)$m[3], (int)$m[1])) fail($d['label'] . ' tidak valid.');
                break;
            case 'time':
                if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $v)) fail($d['label'] . ' tidak valid.');
                break;
            case 'ref':
                if (!ctype_digit($v) || !one('SELECT id FROM ' . $d['arg'] . ' WHERE id = ?', [(int)$v])) fail($d['label'] . ' tidak ditemukan.');
                $v = (int)$v;
                break;
        }
        $out[$col] = $v;
    }
    return $out;
}

/* ---------- Baca / tulis baris ---------- */
function out_row(array $r): array
{
    $o = [];
    foreach ($r as $col => $v) {
        $k = to_camel($col);
        if ($col === 'id' || $col === 'created_by' || str_ends_with($col, '_id')) $o[$k] = $v === null ? null : (string)$v;
        elseif ($col === 'mulai' || $col === 'selesai') $o[$k] = substr((string)$v, 0, 5);
        elseif ($col === 'created_at' || $col === 'updated_at') $o[$k] = substr((string)$v, 0, 10);
        else $o[$k] = $v;
    }
    return $o;
}
function rows(string $t, string $where = '', array $p = []): array
{
    $sql = 'SELECT ' . implode(', ', spec()[$t]['cols']) . ' FROM ' . $t . ($where ? ' WHERE ' . $where : '') . ' ORDER BY id';
    return array_map('out_row', q($sql, $p)->fetchAll());
}
function find_row(string $t, $id): ?array
{
    if (!is_string($id) && !is_int($id)) return null;
    if (!ctype_digit((string)$id)) return null;
    return one('SELECT ' . implode(', ', spec()[$t]['cols']) . ' FROM ' . $t . ' WHERE id = ?', [(int)$id]);
}
function insert_row(string $t, array $data): array
{
    $cols = array_keys($data);
    q('INSERT INTO ' . $t . ' (' . implode(', ', $cols) . ') VALUES (' . implode(', ', array_fill(0, count($cols), '?')) . ')', array_values($data));
    return find_row($t, (string)pdo()->lastInsertId());
}
function update_db(string $t, int $id, array $data): array
{
    if ($data) {
        $set = implode(', ', array_map(fn($c) => $c . ' = ?', array_keys($data)));
        q('UPDATE ' . $t . ' SET ' . $set . ' WHERE id = ?', [...array_values($data), $id]);
    }
    return find_row($t, $id);
}
function now(): string { return date('Y-m-d H:i:s'); }

/* ---------- Data awal untuk klien ---------- */
function bootstrap(): array
{
    $u = current_user();
    $data = array_fill_keys(TABLES, []);
    $res = ['user' => $u ? out_row($u) : null, 'csrf' => $_SESSION['csrf'], 'data' => &$data];
    if (!$u) return $res;

    $data['categories'] = rows('categories');
    $data['events'] = rows('events');
    $data['study_groups'] = rows('study_groups');
    $data['group_members'] = rows('group_members');

    if ($u['role'] === 'admin') {
        $data['users'] = rows('users');
        $data['registrations'] = rows('registrations');
    } else {
        foreach (['schedules', 'tasks', 'notes'] as $t) $data[$t] = rows($t, 'user_id = ?', [(int)$u['id']]);
        $data['registrations'] = rows('registrations', 'user_id = ?', [(int)$u['id']]);
        // pengguna biasa hanya perlu nama pembuat dan anggota kelompok
        $others = q('SELECT id, nama FROM users WHERE id <> ? AND (id IN (SELECT owner_id FROM study_groups) OR id IN (SELECT user_id FROM group_members)) ORDER BY id', [(int)$u['id']])->fetchAll();
        $data['users'] = array_merge([out_row($u)], array_map('out_row', $others));
    }
    unset($data);
    return $res;
}

/* ---------- Aturan jam jadwal ---------- */
function check_times(array $d): void
{
    if (isset($d['mulai'], $d['selesai']) && $d['selesai'] <= $d['mulai']) fail('Jam selesai harus setelah jam mulai.');
}

/* ===========================================================
   CRUD dengan hak akses
   =========================================================== */
const OWNED = ['schedules', 'tasks', 'notes'];

function crud_create(string $t, array $in, array $u): array
{
    if (in_array($t, OWNED, true)) {
        require_role($u, 'user');
        $d = clean($t, $in);
        if ($t === 'schedules') check_times($d);
        if ($t === 'notes') $d['updated_at'] = now();
        $d['user_id'] = (int)$u['id'];
        return insert_row($t, $d);
    }
    switch ($t) {
        case 'study_groups':
            require_role($u, 'user');
            $d = clean($t, $in);
            $d['owner_id'] = (int)$u['id'];
            $d['created_at'] = now();
            return insert_row($t, $d);

        case 'group_members': // bergabung ke kelompok
            require_role($u, 'user');
            $gid = $in['groupId'] ?? '';
            $g = find_row('study_groups', $gid);
            if (!$g) fail('Kelompok tidak ditemukan.', 404);
            $ex = one('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?', [(int)$g['id'], (int)$u['id']]);
            if ($ex) return find_row($t, $ex['id']);
            return insert_row($t, ['group_id' => (int)$g['id'], 'user_id' => (int)$u['id']]);

        case 'categories':
            require_role($u, 'admin');
            return insert_row($t, clean($t, $in));

        case 'events':
            require_role($u, 'admin');
            $d = clean($t, $in);
            $d['created_by'] = (int)$u['id'];
            return insert_row($t, $d);

        case 'registrations':
            require_role($u, 'user');
            $e = find_row('events', $in['eventId'] ?? '');
            if (!$e) fail('Kegiatan tidak ditemukan.', 404);
            $type = $in['type'] ?? '';
            if (!in_array($type, ['daftar', 'simpan'], true)) fail('Jenis pendaftaran tidak valid.');
            if ($type === 'daftar' && $e['tanggal'] < date('Y-m-d')) fail('Kegiatan ini sudah lewat.');
            $ex = one('SELECT id FROM registrations WHERE user_id = ? AND event_id = ? AND type = ?', [(int)$u['id'], (int)$e['id'], $type]);
            if ($ex) return find_row($t, $ex['id']);
            return insert_row($t, ['user_id' => (int)$u['id'], 'event_id' => (int)$e['id'], 'type' => $type, 'created_at' => now()]);
    }
    fail('Aksi tidak tersedia.', 405);
}

function crud_update(string $t, string $id, array $in, array $u): array
{
    $row = find_row($t, $id);
    if (!$row) fail('Data tidak ditemukan.', 404);

    if (in_array($t, OWNED, true)) {
        if ((string)$row['user_id'] !== (string)$u['id']) fail('Data ini bukan milikmu.', 403);
        $d = clean($t, $in, true);
        if ($t === 'schedules') check_times(array_merge($row, $d));
        if ($t === 'notes') $d['updated_at'] = now();
        return update_db($t, (int)$id, $d);
    }
    switch ($t) {
        case 'study_groups':
            if ((string)$row['owner_id'] !== (string)$u['id']) fail('Hanya pembuat kelompok yang bisa mengubahnya.', 403);
            return update_db($t, (int)$id, clean($t, $in, true));
        case 'categories':
        case 'events':
            require_role($u, 'admin');
            return update_db($t, (int)$id, clean($t, $in, true));
        case 'users':
            require_role($u, 'admin');
            if ((string)$row['id'] === (string)$u['id']) fail('Kamu tidak bisa mengubah perananmu sendiri.', 403);
            $role = $in['role'] ?? '';
            if (!in_array($role, ['user', 'admin'], true)) fail('Peran tidak valid.');
            return update_db($t, (int)$id, ['role' => $role]);
    }
    fail('Aksi tidak tersedia.', 405);
}

function crud_delete(string $t, string $id, array $u): void
{
    $row = find_row($t, $id);
    if (!$row) return; // sudah terhapus: anggap berhasil
    $n = (int)$id;

    if (in_array($t, OWNED, true)) {
        if ((string)$row['user_id'] !== (string)$u['id']) fail('Data ini bukan milikmu.', 403);
        q("DELETE FROM $t WHERE id = ?", [$n]);
        return;
    }
    switch ($t) {
        case 'study_groups':
            if ((string)$row['owner_id'] !== (string)$u['id'] && $u['role'] !== 'admin') fail('Hanya pembuat kelompok atau admin yang bisa menghapusnya.', 403);
            break;
        case 'group_members':
            $g = find_row('study_groups', (string)$row['group_id']);
            $isOwner = $g && (string)$g['owner_id'] === (string)$u['id'];
            $isSelf = (string)$row['user_id'] === (string)$u['id'];
            if (!$isOwner && !$isSelf) fail('Kamu tidak boleh mengeluarkan anggota ini.', 403);
            if ($g && (string)$row['user_id'] === (string)$g['owner_id']) fail('Pembuat kelompok tidak bisa keluar. Hapus kelompoknya jika tidak diperlukan.', 400);
            break;
        case 'categories':
            require_role($u, 'admin');
            $used = (int)one('SELECT COUNT(*) AS c FROM events WHERE category_id = ?', [$n])['c'];
            if ($used) fail("Kategori masih dipakai $used kegiatan. Pindahkan kegiatannya dulu.", 409);
            break;
        case 'events':
            require_role($u, 'admin');
            break;
        case 'registrations':
            if ((string)$row['user_id'] !== (string)$u['id'] && $u['role'] !== 'admin') fail('Data ini bukan milikmu.', 403);
            break;
        case 'users':
            require_role($u, 'admin');
            if ((string)$row['id'] === (string)$u['id']) fail('Kamu tidak bisa menghapus akunmu sendiri.', 403);
            break;
        default:
            fail('Aksi tidak tersedia.', 405);
    }
    q("DELETE FROM $t WHERE id = ?", [$n]); // anak data ikut terhapus lewat ON DELETE CASCADE
}

/* ---------- Pesan galat yang menjelaskan penyebabnya ---------- */
function friendly_error(Throwable $e): string
{
    $c = require __DIR__ . '/config.php';
    $m = $e->getMessage();
    if (str_contains($m, '[1049]') || stripos($m, 'Unknown database') !== false)
        return "Database '{$c['db_name']}' belum ada. Buka phpMyAdmin, lalu impor database/schema.sql dan database/seed.sql.";
    if (str_contains($m, '[1045]') || stripos($m, 'Access denied') !== false)
        return "MySQL menolak user '{$c['db_user']}'. Periksa db_user dan db_pass di api/config.php.";
    if (str_contains($m, '[2002]') || stripos($m, 'refused') !== false || str_contains($m, '[2006]'))
        return "Tidak bisa terhubung ke MySQL di {$c['db_host']}:{$c['db_port']}. Pastikan MySQL hijau di XAMPP dan db_port di api/config.php sama dengan port MySQL-mu.";
    if (str_contains($m, '42S02') || stripos($m, "doesn't exist") !== false || stripos($m, 'no such table') !== false)
        return 'Tabel belum lengkap. Impor database/schema.sql lalu database/seed.sql di phpMyAdmin.';
    if ($c['debug'] ?? true) return 'Galat server: ' . $m;
    return 'Terjadi kesalahan di server. Ubah debug menjadi true di api/config.php untuk melihat rinciannya.';
}
