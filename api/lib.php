<?php
/* ============================================================
   TTYT KHU VỰC SƠN DƯƠNG — Tiện ích dùng chung cho backend
   Kết nối CSDL, trả JSON, phiên đăng nhập, kiểm tra quyền, nhật ký.
   ============================================================ */

declare(strict_types=1);

// ---- Chỉ chạy qua HTTPS (trừ khi chạy thử ở localhost) ----
$isLocal = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true);
if (!$isLocal && (($_SERVER['HTTPS'] ?? 'off') !== 'on')) {
    http_response_code(403);
    exit(json_encode(['error' => 'Yêu cầu phải dùng HTTPS.'], JSON_UNESCAPED_UNICODE));
}

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

const SESSION_COOKIE = 'ttyt_sess';
const SESSION_HOURS  = 8;      // phiên hết hạn sau 8 giờ
const MAX_TRIES      = 8;      // số lần đăng nhập sai tối đa
const LOCK_MINUTES   = 15;     // trong khoảng thời gian này

/** Các mục có thể cấp quyền cho tài khoản con (khớp với trang quản trị) */
const GRANTABLE_PANELS = [
    'dashboard', 'appointments', 'doctors', 'featured',
    'departments', 'services', 'news', 'hero', 'files'
];

/* ---------------- Kết nối CSDL ---------------- */
function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;

    $cfgFile = __DIR__ . '/config.php';
    if (!is_file($cfgFile)) fail(500, 'Chưa có file cấu hình api/config.php.');
    $cfg = require $cfgFile;

    // Chấp nhận cả "localhost" lẫn "localhost:3306" (PDO cần tách cổng riêng)
    $host = (string)$cfg['host'];
    $port = '';
    if (strpos($host, ':') !== false) {
        [$host, $port] = explode(':', $host, 2);
        $port = ctype_digit($port) ? ";port=$port" : '';
    }

    try {
        $pdo = new PDO(
            "mysql:host={$host}{$port};dbname={$cfg['name']};charset=utf8mb4",
            $cfg['user'], $cfg['pass'],
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,   // dùng prepared statement thật
            ]
        );
    } catch (Throwable $e) {
        error_log('DB connect failed: ' . $e->getMessage());
        fail(500, 'Không kết nối được cơ sở dữ liệu.');
    }
    return $pdo;
}

/* ---------------- Trả kết quả ---------------- */
function ok(array $data = []) {
    exit(json_encode(['ok' => true] + $data, JSON_UNESCAPED_UNICODE));
}

function fail(int $code, string $message) {
    http_response_code($code);
    exit(json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE));
}

/** Đọc dữ liệu JSON client gửi lên */
function input(): array {
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function clientIp(): string {
    return substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);
}

/* ---------------- Phiên đăng nhập ---------------- */
/** Sinh token phiên; chỉ LƯU BẢN BĂM trong CSDL (lộ CSDL cũng không dùng lại được) */
function createSession(int $userId): string {
    $token = bin2hex(random_bytes(32));
    $stmt = db()->prepare(
        'INSERT INTO sessions (id, user_id, ip, user_agent, expires_at)
         VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))'
    );
    $stmt->execute([
        hash('sha256', $token), $userId, clientIp(),
        substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255), SESSION_HOURS
    ]);

    setcookie(SESSION_COOKIE, $token, [
        'expires'  => time() + SESSION_HOURS * 3600,
        'path'     => '/',
        'secure'   => true,
        'httponly' => true,       // JavaScript không đọc được -> chống đánh cắp qua XSS
        'samesite' => 'Strict',   // chống CSRF
    ]);
    return $token;
}

function destroySession(): void {
    $token = $_COOKIE[SESSION_COOKIE] ?? '';
    if ($token !== '') {
        db()->prepare('DELETE FROM sessions WHERE id = ?')->execute([hash('sha256', $token)]);
    }
    setcookie(SESSION_COOKIE, '', ['expires' => time() - 3600, 'path' => '/', 'secure' => true, 'httponly' => true, 'samesite' => 'Strict']);
}

/** Lấy người dùng của phiên hiện tại; null nếu chưa đăng nhập / phiên hết hạn */
function currentUser(): ?array {
    static $user = null;
    static $done = false;
    if ($done) return $user;
    $done = true;

    $token = $_COOKIE[SESSION_COOKIE] ?? '';
    if ($token === '') return null;

    $stmt = db()->prepare(
        'SELECT u.id, u.username, u.full_name, u.role, u.is_active, u.must_change_pw
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.id = ? AND s.expires_at > NOW()'
    );
    $stmt->execute([hash('sha256', $token)]);
    $row = $stmt->fetch();
    if (!$row || (int)$row['is_active'] !== 1) return null;

    $row['perms'] = permsOf((int)$row['id']);
    return $user = $row;
}

/** Danh sách mục mà tài khoản được phép quản lý */
function permsOf(int $userId): array {
    $stmt = db()->prepare('SELECT panel FROM user_permissions WHERE user_id = ?');
    $stmt->execute([$userId]);
    return array_column($stmt->fetchAll(), 'panel');
}

/* ---------------- Kiểm tra quyền ---------------- */
function requireLogin(): array {
    $u = currentUser();
    if (!$u) fail(401, 'Chưa đăng nhập hoặc phiên đã hết hạn.');
    return $u;
}

function requireSuperadmin(): array {
    $u = requireLogin();
    if ($u['role'] !== 'superadmin') fail(403, 'Chỉ tài khoản cấp cao mới được thao tác mục này.');
    return $u;
}

/** Yêu cầu quyền với một mục cụ thể (superadmin luôn có) */
function requirePanel(string $panel): array {
    $u = requireLogin();
    if ($u['role'] === 'superadmin') return $u;
    if (!in_array($panel, $u['perms'], true)) fail(403, 'Tài khoản không có quyền với mục này.');
    return $u;
}

/* ---------------- Nhật ký thao tác ---------------- */
function audit(?array $user, string $action, string $detail = ''): void {
    try {
        db()->prepare(
            'INSERT INTO audit_log (user_id, username, action, detail, ip) VALUES (?, ?, ?, ?, ?)'
        )->execute([
            $user['id'] ?? null, $user['username'] ?? '', $action, $detail, clientIp()
        ]);
    } catch (Throwable $e) {
        error_log('Audit failed: ' . $e->getMessage());   // không chặn luồng chính
    }
}
