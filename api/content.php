<?php
/* ============================================================
   Quản lý NỘI DUNG (tin tức, bác sĩ, khoa phòng, dịch vụ, hero, cài đặt)
   Quyền: theo từng mục — tài khoản con chỉ sửa được mục được cấp.

   GET  /api/content.php?collection=news
   POST /api/content.php?action=save&collection=news     {key?, data{}, sort_order?}
   POST /api/content.php?action=delete&collection=news   {key}
   POST /api/content.php?action=reorder&collection=hero  {keys:[...]}
   POST /api/content.php?action=settings                 {settings:{...}}
   ============================================================ */

require __DIR__ . '/lib.php';

/* Bộ sưu tập hợp lệ -> mục quyền tương ứng trong trang quản trị */
const COLLECTION_PANEL = [
    'news'        => 'news',
    'doctors'     => 'doctors',
    'departments' => 'departments',
    'services'    => 'services',
    'hero'        => 'hero',
];

const MAX_ITEM_BYTES = 2 * 1024 * 1024;   // 2MB/mục — chặn dữ liệu bất thường

$action     = $_GET['action'] ?? '';
$collection = $_GET['collection'] ?? '';

if ($action !== 'settings') {
    if (!isset(COLLECTION_PANEL[$collection])) fail(400, 'Danh mục nội dung không hợp lệ.');
}

/** Sinh mã mục mới nếu chưa có (giữ dạng chữ + số như dữ liệu cũ) */
function newKey(string $collection): string {
    $prefix = ['news' => 'n', 'doctors' => 'bs', 'departments' => 'd',
               'services' => 's', 'hero' => 'h'][$collection] ?? 'i';
    return $prefix . base_convert((string)time(), 10, 36) . random_int(100, 999);
}

switch ($action) {

    /* ---------------- Đọc danh sách (cần đăng nhập) ---------------- */
    case '': {
        requireLogin();
        $stmt = db()->prepare(
            'SELECT item_key, data, sort_order, is_published, updated_at
             FROM content_items WHERE collection = ? ORDER BY sort_order, id'
        );
        $stmt->execute([$collection]);
        $items = [];
        foreach ($stmt->fetchAll() as $r) {
            $obj = json_decode($r['data'], true) ?: [];
            $obj['id'] = $r['item_key'];
            $items[] = $obj;
        }
        ok(['items' => $items]);
        break;
    }

    /* ---------------- Thêm mới / Cập nhật ---------------- */
    case 'save': {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'Sai phương thức.');
        $me  = requirePanel(COLLECTION_PANEL[$collection]);
        $in  = input();
        $obj = $in['data'] ?? null;
        if (!is_array($obj)) fail(400, 'Thiếu nội dung cần lưu.');

        $key = trim((string)($in['key'] ?? ($obj['id'] ?? '')));
        if ($key === '') $key = newKey($collection);
        if (!preg_match('/^[A-Za-z0-9_-]{1,64}$/', $key)) fail(400, 'Mã mục không hợp lệ.');

        unset($obj['id']);                       // id nằm ở cột item_key
        $json = json_encode($obj, JSON_UNESCAPED_UNICODE);
        if (strlen($json) > MAX_ITEM_BYTES) fail(413, 'Nội dung quá lớn (giới hạn 2MB mỗi mục).');

        $sort = (int)($in['sort_order'] ?? 0);
        db()->prepare(
            'INSERT INTO content_items (collection, item_key, data, sort_order, updated_by)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE data = VALUES(data), sort_order = VALUES(sort_order),
                                     updated_by = VALUES(updated_by)'
        )->execute([$collection, $key, $json, $sort, $me['id']]);

        audit($me, 'content_save', "$collection/$key");
        ok(['key' => $key]);
        break;
    }

    /* ---------------- Xoá ---------------- */
    case 'delete': {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'Sai phương thức.');
        $me  = requirePanel(COLLECTION_PANEL[$collection]);
        $key = trim((string)(input()['key'] ?? ''));
        if ($key === '') fail(400, 'Thiếu mã mục cần xoá.');

        $stmt = db()->prepare('DELETE FROM content_items WHERE collection = ? AND item_key = ?');
        $stmt->execute([$collection, $key]);
        if ($stmt->rowCount() === 0) fail(404, 'Không tìm thấy mục cần xoá.');

        audit($me, 'content_delete', "$collection/$key");
        ok();
        break;
    }

    /* ---------------- Sắp xếp lại thứ tự ---------------- */
    case 'reorder': {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'Sai phương thức.');
        $me   = requirePanel(COLLECTION_PANEL[$collection]);
        $keys = input()['keys'] ?? [];
        if (!is_array($keys)) fail(400, 'Danh sách thứ tự không hợp lệ.');

        $pdo = db();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'UPDATE content_items SET sort_order = ? WHERE collection = ? AND item_key = ?'
            );
            foreach (array_values($keys) as $i => $k) $stmt->execute([$i, $collection, $k]);
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            error_log('reorder failed: ' . $e->getMessage());
            fail(500, 'Không lưu được thứ tự.');
        }
        audit($me, 'content_reorder', $collection);
        ok();
        break;
    }

    /* ---------------- Cài đặt website ---------------- */
    case 'settings': {
        // Đọc: mọi tài khoản đã đăng nhập đều xem được (form cần điền sẵn giá trị hiện tại)
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            requireLogin();
            $out = [];
            foreach (db()->query('SELECT k, v FROM settings')->fetchAll() as $r) {
                $val = $r['v'];
                if (is_string($val) && $val !== '' && ($val[0] === '[' || $val[0] === '{')) {
                    $decoded = json_decode($val, true);
                    if ($decoded !== null) $val = $decoded;
                }
                $out[$r['k']] = $val;
            }
            ok(['settings' => $out]);
        }

        // Ghi: chỉ tài khoản cấp cao
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'Sai phương thức.');
        $me  = requireSuperadmin();          // cài đặt chung: chỉ cấp cao
        $set = input()['settings'] ?? null;
        if (!is_array($set)) fail(400, 'Thiếu dữ liệu cài đặt.');

        $stmt = db()->prepare(
            'INSERT INTO settings (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)'
        );
        foreach ($set as $k => $v) {
            if (!preg_match('/^[A-Za-z0-9_]{1,60}$/', (string)$k)) continue;
            $stmt->execute([$k, is_scalar($v) ? (string)$v : json_encode($v, JSON_UNESCAPED_UNICODE)]);
        }
        audit($me, 'settings_save', implode(',', array_keys($set)));
        ok();
        break;
    }

    default:
        fail(404, 'Không có thao tác này.');
}
