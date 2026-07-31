<?php
/* ============================================================
   Đăng nhập / Đăng xuất / Lấy thông tin phiên
   POST /api/auth.php?action=login    {username, password}
   POST /api/auth.php?action=logout
   GET  /api/auth.php?action=me
   POST /api/auth.php?action=change-password {old_password, new_password}
   ============================================================ */

require __DIR__ . '/lib.php';

$action = $_GET['action'] ?? '';

switch ($action) {

    /* ---------------- Đăng nhập ---------------- */
    case 'login': {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'Sai phương thức.');
        $in = input();
        $username = trim((string)($in['username'] ?? ''));
        $password = (string)($in['password'] ?? '');
        if ($username === '' || $password === '') fail(400, 'Nhập tên đăng nhập và mật khẩu.');

        // Khoá tạm nếu sai quá nhiều lần (theo IP và theo tên đăng nhập)
        $stmt = db()->prepare(
            'SELECT COUNT(*) c FROM login_attempts
             WHERE success = 0 AND attempted_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)
               AND (ip = ? OR username = ?)'
        );
        $stmt->execute([LOCK_MINUTES, clientIp(), $username]);
        if ((int)$stmt->fetch()['c'] >= MAX_TRIES) {
            audit(null, 'login_locked', "username=$username");
            fail(429, 'Sai quá nhiều lần. Vui lòng thử lại sau ' . LOCK_MINUTES . ' phút.');
        }

        $stmt = db()->prepare('SELECT * FROM users WHERE username = ? AND is_active = 1');
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        $valid = $user && password_verify($password, $user['password_hash']);

        db()->prepare('INSERT INTO login_attempts (username, ip, success) VALUES (?, ?, ?)')
            ->execute([$username, clientIp(), $valid ? 1 : 0]);

        if (!$valid) {
            audit(null, 'login_failed', "username=$username");
            // Không nói rõ sai tên hay sai mật khẩu -> tránh dò tài khoản
            fail(401, 'Tên đăng nhập hoặc mật khẩu không đúng.');
        }

        // Nâng cấp thuật toán băm nếu chuẩn bcrypt thay đổi
        if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
            db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
                ->execute([password_hash($password, PASSWORD_DEFAULT), $user['id']]);
        }

        createSession((int)$user['id']);
        db()->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?')->execute([$user['id']]);
        audit($user, 'login', '');

        ok(['user' => [
            'username'       => $user['username'],
            'fullName'       => $user['full_name'],
            'role'           => $user['role'],
            'perms'          => permsOf((int)$user['id']),
            'mustChangePw'   => (bool)$user['must_change_pw'],
        ]]);
        break;
    }

    /* ---------------- Đăng xuất ---------------- */
    case 'logout': {
        $u = currentUser();
        destroySession();
        if ($u) audit($u, 'logout', '');
        ok();
        break;
    }

    /* ---------------- Thông tin phiên hiện tại ---------------- */
    case 'me': {
        $u = currentUser();
        if (!$u) ok(['user' => null]);
        ok(['user' => [
            'username'     => $u['username'],
            'fullName'     => $u['full_name'],
            'role'         => $u['role'],
            'perms'        => $u['perms'],
            'mustChangePw' => (bool)$u['must_change_pw'],
        ]]);
        break;
    }

    /* ---------------- Tự đổi mật khẩu ---------------- */
    case 'change-password': {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'Sai phương thức.');
        $u  = requireLogin();
        $in = input();
        $old = (string)($in['old_password'] ?? '');
        $new = (string)($in['new_password'] ?? '');

        if (strlen($new) < 10) fail(400, 'Mật khẩu mới phải từ 10 ký tự trở lên.');

        $stmt = db()->prepare('SELECT password_hash FROM users WHERE id = ?');
        $stmt->execute([$u['id']]);
        if (!password_verify($old, $stmt->fetch()['password_hash'])) {
            fail(401, 'Mật khẩu hiện tại không đúng.');
        }

        db()->prepare('UPDATE users SET password_hash = ?, must_change_pw = 0 WHERE id = ?')
            ->execute([password_hash($new, PASSWORD_DEFAULT), $u['id']]);

        // Đăng xuất mọi phiên khác của tài khoản này cho an toàn
        $token = $_COOKIE[SESSION_COOKIE] ?? '';
        db()->prepare('DELETE FROM sessions WHERE user_id = ? AND id <> ?')
            ->execute([$u['id'], hash('sha256', $token)]);

        audit($u, 'change_password', '');
        ok();
        break;
    }

    default:
        fail(404, 'Không có thao tác này.');
}
