<?php
/* ============================================================
   TRANG TỰ KIỂM TRA CÀI ĐẶT — mở bằng trình duyệt để xem còn thiếu gì.
   https://ttytsonduong.vn/api/check.php
   ⚠️ XOÁ FILE NÀY sau khi cài đặt xong.
   (Không hiển thị mật khẩu CSDL.)
   ============================================================ */

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');

$rows = [];
function check(string $name, bool $pass, string $detail = '', bool $warn = false): void {
    global $rows;
    $rows[] = ['name' => $name, 'pass' => $pass, 'detail' => $detail, 'warn' => $warn];
}

/* ---------- 1. Môi trường PHP ---------- */
$php = PHP_VERSION;
$phpOk = version_compare($php, '7.4', '>=');
$phpOld = version_compare($php, '8.1', '<');
check('Phiên bản PHP', $phpOk,
    "Đang dùng PHP $php" . ($phpOld ? ' — chạy được, nhưng bản này đã hết hỗ trợ bảo mật. Nên chọn PHP 8.1+ trong Plesk nếu có.' : ' — tốt.'),
    $phpOld);

check('Thư viện PDO MySQL', extension_loaded('pdo_mysql'),
    extension_loaded('pdo_mysql') ? 'Đã bật.' : 'Chưa bật — vào Plesk > PHP Settings bật extension pdo_mysql.');

check('Thư viện fileinfo (kiểm tra tệp tải lên)', extension_loaded('fileinfo'),
    extension_loaded('fileinfo') ? 'Đã bật.' : 'Chưa bật — cần cho chức năng tải tệp.');

check('Chạy qua HTTPS', ($_SERVER['HTTPS'] ?? 'off') === 'on',
    ($_SERVER['HTTPS'] ?? 'off') === 'on' ? 'Có.' : 'Chưa — API bắt buộc HTTPS. Bật SSL trong Plesk.');

/* ---------- 2. Giới hạn tải tệp ---------- */
$toBytes = function (string $v): int {
    $v = trim($v); $n = (int)$v; $u = strtoupper(substr($v, -1));
    return $u === 'G' ? $n * 1073741824 : ($u === 'M' ? $n * 1048576 : ($u === 'K' ? $n * 1024 : $n));
};
$up = $toBytes((string)ini_get('upload_max_filesize'));
$post = $toBytes((string)ini_get('post_max_size'));
$limit = min($up, $post);
check('Giới hạn tải tệp', $limit >= 100 * 1048576,
    'upload_max_filesize=' . ini_get('upload_max_filesize') . ', post_max_size=' . ini_get('post_max_size') .
    ($limit >= 100 * 1048576 ? ' — đủ cho 100MB.'
        : ' — hiện chỉ tải được ~' . round($limit / 1048576) . 'MB. Muốn 100MB: Plesk > PHP Settings đặt upload_max_filesize=100M và post_max_size=105M.'),
    $limit < 100 * 1048576);

/* ---------- 3. Thư mục lưu tệp ---------- */
$updir = __DIR__ . '/../uploads';
$exists = is_dir($updir);
check('Thư mục /uploads', $exists && is_writable($updir),
    !$exists ? 'Chưa có thư mục uploads.' : (is_writable($updir) ? 'Có và ghi được.' : 'Có nhưng KHÔNG ghi được — cấp quyền ghi cho thư mục này.'));

/* ---------- 4. Cấu hình + CSDL ---------- */
$cfgFile = __DIR__ . '/config.php';
$hasCfg  = is_file($cfgFile);
check('File cấu hình api/config.php', $hasCfg,
    $hasCfg ? 'Đã có.' : 'Chưa có — sao chép config.example.php thành config.php rồi điền thông tin CSDL.');

$dbOk = false;
if ($hasCfg) {
    $cfg = require $cfgFile;
    try {
        $pdo = new PDO(
            "mysql:host={$cfg['host']};dbname={$cfg['name']};charset=utf8mb4",
            $cfg['user'], $cfg['pass'],
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
        $dbOk = true;
        check('Kết nối cơ sở dữ liệu', true, 'Kết nối được tới CSDL “' . htmlspecialchars((string)$cfg['name']) . '”.');
    } catch (Throwable $e) {
        check('Kết nối cơ sở dữ liệu', false, 'Không kết nối được. Kiểm tra lại tên CSDL / user / mật khẩu trong config.php.');
    }
}

/* ---------- 5. Các bảng ---------- */
if ($dbOk) {
    $need = ['users', 'user_permissions', 'sessions', 'login_attempts', 'audit_log',
             'content_items', 'settings', 'files'];
    $have = array_column($pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_NUM), 0);
    $miss = array_values(array_diff($need, $have));
    check('Các bảng dữ liệu', !$miss,
        $miss ? 'Còn thiếu: ' . implode(', ', $miss) . ' — vào phpMyAdmin Import file schema.sql và schema_content.sql.'
              : 'Đủ ' . count($need) . ' bảng.');

    if (!$miss) {
        $nAdmin = (int)$pdo->query('SELECT COUNT(*) c FROM users WHERE role = "superadmin"')->fetch()['c'];
        check('Tài khoản quản trị cấp cao', $nAdmin > 0,
            $nAdmin > 0 ? "Đã có ($nAdmin tài khoản)." : 'Chưa có — mở api/setup.php để tạo.');

        $nContent = (int)$pdo->query('SELECT COUNT(*) c FROM content_items')->fetch()['c'];
        check('Nội dung trong CSDL', $nContent > 0,
            $nContent > 0 ? "$nContent mục." : 'Chưa có — dùng api/import.php nạp từ file sao lưu JSON.', $nContent === 0);
    }
}

/* ---------- 6. File cài đặt còn sót ---------- */
foreach (['setup.php', 'import.php', 'check.php'] as $f) {
    if (is_file(__DIR__ . '/' . $f)) {
        check("Bảo mật: còn file $f", false, "Nên XOÁ api/$f sau khi cài xong.", true);
    }
}

$fail = count(array_filter($rows, fn($r) => !$r['pass'] && !$r['warn']));
$warn = count(array_filter($rows, fn($r) => !$r['pass'] && $r['warn']));
?>
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Kiểm tra cài đặt backend — TTYT Sơn Dương</title>
  <style>
    body{font-family:system-ui,Segoe UI,Arial,sans-serif;background:#eef4f5;padding:20px;color:#1e293b}
    .box{max-width:760px;margin:24px auto;background:#fff;padding:26px;border-radius:14px;
         box-shadow:0 10px 30px -12px rgba(15,23,42,.3)}
    h1{font-size:20px;margin:0 0 4px}
    .sum{font-size:14px;margin:0 0 18px;color:#475569}
    .item{display:flex;gap:12px;padding:12px 0;border-top:1px solid #e2e8f0;align-items:flex-start}
    .ic{font-size:18px;line-height:1.3;flex-shrink:0}
    .nm{font-weight:600;font-size:14.5px}
    .dt{font-size:13px;color:#475569;line-height:1.55;margin-top:2px}
    .banner{padding:12px 14px;border-radius:10px;font-size:14px;font-weight:600;margin-bottom:16px}
    .green{background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d}
    .red{background:#fef2f2;border:1px solid #fecaca;color:#b91c1c}
    .amber{background:#fffbeb;border:1px solid #fde68a;color:#7c5300}
  </style>
</head>
<body>
  <div class="box">
    <h1>Kiểm tra cài đặt backend</h1>
    <p class="sum">Trang này dò xem hệ thống còn thiếu gì. Sửa xong thì tải lại trang.</p>

    <?php if ($fail === 0 && $warn === 0): ?>
      <div class="banner green">✅ Mọi thứ đã sẵn sàng.</div>
    <?php elseif ($fail === 0): ?>
      <div class="banner amber">⚠️ Chạy được, nhưng có <?= $warn ?> mục nên xem lại.</div>
    <?php else: ?>
      <div class="banner red">❌ Còn <?= $fail ?> mục cần sửa trước khi dùng được.</div>
    <?php endif; ?>

    <?php foreach ($rows as $r): ?>
      <div class="item">
        <span class="ic"><?= $r['pass'] ? '✅' : ($r['warn'] ? '⚠️' : '❌') ?></span>
        <div>
          <div class="nm"><?= htmlspecialchars($r['name']) ?></div>
          <div class="dt"><?= htmlspecialchars($r['detail']) ?></div>
        </div>
      </div>
    <?php endforeach; ?>
  </div>
</body>
</html>
