<?php
/* ============================================================
   Quản lý tài khoản con + phân quyền  (CHỈ tài khoản cấp cao)
   GET    /api/users.php                 -> danh sách tài khoản
   POST   /api/users.php?action=create   {username, full_name, password, perms[]}
   POST   /api/users.php?action=update   {id, full_name, perms[], is_active}
   POST   /api/users.php?action=reset-pw {id, password}
   POST   /api/users.php?action=delete   {id}
   ============================================================ */

require __DIR__ . '/lib.php';

$me     = requireSuperadmin();
$action = $_GET['action'] ?? '';

/** Lọc bỏ mục không hợp lệ -> tài khoản con không thể tự nâng quyền */
function cleanPerms($raw): array {
    if (!is_array($raw)) return [];
    return array_values(array_intersect(array_unique($raw), GRANTABLE_PANELS));
}

function savePerms(int $userId, array $perms): void {
    db()->prepare('DELETE FROM user_permissions WHERE user_id = ?')->execute([$userId]);
    if (!$perms) return;
    $stmt = db()->prepare('INSERT INTO user_permissions (user_id, panel) VALUES (?, ?)');
    foreach ($perms as $p) $stmt->execute([$userId, $p]);
}

function findUser(int $id): array {
    $stmt = db()->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([$id]);
    $u = $stmt->fetch();
    if (!$u) fail(404, 'Không tìm thấy tài khoản.');
    return $u;
}

switch ($action) {

    /* ---------------- Danh sách ---------------- */
    case '': {
        $rows = db()->query(
            'SELECT id, username, full_name, role, is_active, created_at, last_login_at
             FROM users ORDER BY role = "superadmin" DESC, username'
        )->fetchAll();
        foreach ($rows as &$r) {
            $r['perms']     = $r['role'] === 'superadmin' ? ['*'] : permsOf((int)$r['id']);
            $r['is_active'] = (bool)$r['is_active'];
        }
        ok(['users' => $rows, 'grantable' => GRANTABLE_PANELS]);
        break;
    }

    /* ---------------- Tạo tài khoản con ---------------- */
    case 'create': {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'Sai phương thức.');
        $in       = input();
        $username = strtolower(trim((string)($in['username'] ?? '')));
        $fullName = trim((string)($in['full_name'] ?? ''));
        $password = (string)($in['password'] ?? '');

        if (!preg_match('/^[a-z0-9._-]{4,50}$/', $username)) {
            fail(400, 'Tên đăng nhập 4-50 ký tự, chỉ gồm chữ thường, số và . _ -');
        }
        if (strlen($password) < 10) fail(400, 'Mật khẩu phải từ 10 ký tự trở lên.');

        $stmt = db()->prepare('SELECT 1 FROM users WHERE username = ?');
        $stmt->execute([$username]);
        if ($stmt->fetch()) fail(409, 'Tên đăng nhập đã tồn tại.');

        // Chỉ tạo được tài khoản con — không tạo thêm cấp cao qua API
        db()->prepare(
            'INSERT INTO users (username, password_hash, full_name, role, must_change_pw)
             VALUES (?, ?, ?, "editor", 1)'
        )->execute([$username, password_hash($password, PASSWORD_DEFAULT), $fullName]);

        $id    = (int)db()->lastInsertId();
        $perms = cleanPerms($in['perms'] ?? []);
        savePerms($id, $perms);

        audit($me, 'user_create', "username=$username perms=" . implode(',', $perms));
        ok(['id' => $id]);
        break;
    }

    /* ---------------- Sửa tài khoản / đổi quyền ---------------- */
    case 'update': {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'Sai phương thức.');
        $in   = input();
        $user = findUser((int)($in['id'] ?? 0));

        $fullName = trim((string)($in['full_name'] ?? $user['full_name']));
        db()->prepare('UPDATE users SET full_name = ? WHERE id = ?')->execute([$fullName, $user['id']]);

        if ($user['role'] === 'superadmin') {
            // Không đổi quyền / không khoá tài khoản cấp cao
            audit($me, 'user_update', "username={$user['username']} (superadmin, chỉ đổi tên)");
            ok();
        }

        if (array_key_exists('perms', $in)) {
            $perms = cleanPerms($in['perms']);
            savePerms((int)$user['id'], $perms);
        }
        if (array_key_exists('is_active', $in)) {
            $active = $in['is_active'] ? 1 : 0;
            db()->prepare('UPDATE users SET is_active = ? WHERE id = ?')->execute([$active, $user['id']]);
            // Khoá tài khoản -> huỷ luôn mọi phiên đang đăng nhập
            if (!$active) db()->prepare('DELETE FROM sessions WHERE user_id = ?')->execute([$user['id']]);
        }

        audit($me, 'user_update', "username={$user['username']} perms=" . implode(',', $perms ?? []));
        ok();
        break;
    }

    /* ---------------- Đặt lại mật khẩu ---------------- */
    case 'reset-pw': {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'Sai phương thức.');
        $in   = input();
        $user = findUser((int)($in['id'] ?? 0));
        $new  = (string)($in['password'] ?? '');
        if (strlen($new) < 10) fail(400, 'Mật khẩu phải từ 10 ký tự trở lên.');

        db()->prepare('UPDATE users SET password_hash = ?, must_change_pw = 1 WHERE id = ?')
            ->execute([password_hash($new, PASSWORD_DEFAULT), $user['id']]);
        db()->prepare('DELETE FROM sessions WHERE user_id = ?')->execute([$user['id']]);

        audit($me, 'user_reset_pw', "username={$user['username']}");
        ok();
        break;
    }

    /* ---------------- Xoá tài khoản ---------------- */
    case 'delete': {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'Sai phương thức.');
        $user = findUser((int)(input()['id'] ?? 0));

        if ($user['role'] === 'superadmin')       fail(403, 'Không thể xoá tài khoản cấp cao.');
        if ((int)$user['id'] === (int)$me['id'])  fail(403, 'Không thể xoá tài khoản đang đăng nhập.');

        db()->prepare('DELETE FROM users WHERE id = ?')->execute([$user['id']]);  // quyền & phiên tự xoá theo
        audit($me, 'user_delete', "username={$user['username']}");
        ok();
        break;
    }

    default:
        fail(404, 'Không có thao tác này.');
}
