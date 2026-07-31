<?php
/* ============================================================
   API CÔNG KHAI — trang web đọc nội dung để hiển thị cho người dân.
   Không cần đăng nhập, chỉ ĐỌC.

   GET /api/public.php            -> toàn bộ nội dung (trừ danh mục dịch vụ)
   GET /api/public.php?only=services  -> riêng bảng giá (2000+ dòng, tải khi cần)
   ============================================================ */

require __DIR__ . '/lib.php';

// Cho phép trình duyệt và Plesk lưu đệm ngắn -> nhẹ máy chủ, vẫn cập nhật nhanh
header('Cache-Control: public, max-age=60');

function collectionItems(PDO $pdo, string $collection): array {
    $stmt = $pdo->prepare(
        'SELECT item_key, data FROM content_items
         WHERE collection = ? AND is_published = 1 ORDER BY sort_order, id'
    );
    $stmt->execute([$collection]);
    $out = [];
    foreach ($stmt->fetchAll() as $r) {
        $obj = json_decode($r['data'], true) ?: [];
        $obj['id'] = $r['item_key'];
        $out[] = $obj;
    }
    return $out;
}

try {
    $pdo  = db();
    $only = $_GET['only'] ?? '';

    // Bảng giá dịch vụ rất dài -> chỉ trả khi trang Bảng giá yêu cầu
    if ($only === 'services') {
        ok(['services' => collectionItems($pdo, 'services')]);
    }

    $settings = [];
    foreach ($pdo->query('SELECT k, v FROM settings')->fetchAll() as $r) {
        $val = $r['v'];
        // Giá trị dạng JSON (mảng/đối tượng) thì giải mã lại
        if (is_string($val) && $val !== '' && ($val[0] === '[' || $val[0] === '{')) {
            $decoded = json_decode($val, true);
            if ($decoded !== null) $val = $decoded;
        }
        $settings[$r['k']] = $val;
    }

    ok([
        'settings'    => $settings,
        'hero'        => collectionItems($pdo, 'hero'),
        'departments' => collectionItems($pdo, 'departments'),
        'doctors'     => collectionItems($pdo, 'doctors'),
        'news'        => collectionItems($pdo, 'news'),
    ]);

} catch (Throwable $e) {
    // Máy chủ/CSDL trục trặc -> báo lỗi nhẹ nhàng để trang web dùng dữ liệu dự phòng
    error_log('public API failed: ' . $e->getMessage());
    fail(503, 'Tạm thời không lấy được dữ liệu.');
}
