<?php
/* ============================================================
   Nhập dữ liệu hiện có vào CSDL (chạy 1 lần khi chuyển sang backend).
   Dùng chính file sao lưu JSON xuất từ trang quản trị.

   POST /api/import.php   (multipart/form-data, trường "backup")
   Chỉ tài khoản cấp cao. Mặc định KHÔNG ghi đè mục đã có.
   ============================================================ */

require __DIR__ . '/lib.php';
header('Content-Type: text/html; charset=utf-8');

$me = currentUser();
if (!$me || $me['role'] !== 'superadmin') {
    exit('<p style="font-family:sans-serif;padding:24px">Cần đăng nhập bằng tài khoản cấp cao. '
       . '<a href="../admin.html">Đăng nhập</a></p>');
}

$COLLECTIONS = ['hero', 'departments', 'doctors', 'services', 'news'];
$report = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['backup'])) {
    if ($_FILES['backup']['error'] !== UPLOAD_ERR_OK) {
        $report = '<p class="err">Không nhận được tệp (mã ' . $_FILES['backup']['error'] . ').</p>';
    } else {
        $json = file_get_contents($_FILES['backup']['tmp_name']);
        $data = json_decode((string)$json, true);
        if (!is_array($data)) {
            $report = '<p class="err">Tệp không phải JSON hợp lệ.</p>';
        } else {
            $overwrite = !empty($_POST['overwrite']);
            $pdo = db();
            $lines = [];

            // ----- Cài đặt -----
            if (!empty($data['settings']) && is_array($data['settings'])) {
                $stmt = $pdo->prepare(
                    'INSERT INTO settings (k, v) VALUES (?, ?) ' .
                    ($overwrite ? 'ON DUPLICATE KEY UPDATE v = VALUES(v)' : 'ON DUPLICATE KEY UPDATE k = k')
                );
                $n = 0;
                foreach ($data['settings'] as $k => $v) {
                    if (!preg_match('/^[A-Za-z0-9_]{1,60}$/', (string)$k)) continue;
                    if ($k === 'his') continue;                       // không nhập khoá kết nối HIS
                    $stmt->execute([$k, is_scalar($v) ? (string)$v : json_encode($v, JSON_UNESCAPED_UNICODE)]);
                    $n++;
                }
                $lines[] = "Cài đặt: $n mục";
            }

            // ----- Các danh sách nội dung -----
            $stmt = $pdo->prepare(
                'INSERT INTO content_items (collection, item_key, data, sort_order, updated_by)
                 VALUES (?, ?, ?, ?, ?) ' .
                ($overwrite
                    ? 'ON DUPLICATE KEY UPDATE data = VALUES(data), sort_order = VALUES(sort_order)'
                    : 'ON DUPLICATE KEY UPDATE item_key = item_key')
            );
            foreach ($COLLECTIONS as $coll) {
                if (empty($data[$coll]) || !is_array($data[$coll])) continue;
                $n = 0;
                foreach (array_values($data[$coll]) as $i => $item) {
                    if (!is_array($item)) continue;
                    $key = (string)($item['id'] ?? '');
                    if (!preg_match('/^[A-Za-z0-9_-]{1,64}$/', $key)) continue;
                    unset($item['id']);
                    $stmt->execute([$coll, $key, json_encode($item, JSON_UNESCAPED_UNICODE), $i, $me['id']]);
                    $n++;
                }
                $lines[] = ucfirst($coll) . ": $n mục";
            }

            audit($me, 'content_import', implode('; ', $lines));
            $report = '<p class="ok">✅ Đã nhập xong:</p><ul><li>' . implode('</li><li>', $lines) . '</li></ul>'
                    . '<p>Kiểm tra lại website, sau đó <b>xoá file api/import.php</b>.</p>';
        }
    }
}

/* Thống kê hiện có trong CSDL */
$counts = [];
foreach ($COLLECTIONS as $c) {
    $s = db()->prepare('SELECT COUNT(*) n FROM content_items WHERE collection = ?');
    $s->execute([$c]);
    $counts[$c] = (int)$s->fetch()['n'];
}
$settingCount = (int)db()->query('SELECT COUNT(*) n FROM settings')->fetch()['n'];
?>
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Nhập dữ liệu vào CSDL — TTYT Sơn Dương</title>
  <style>
    body{font-family:system-ui,Segoe UI,Arial,sans-serif;background:#eef4f5;padding:24px;color:#1e293b}
    .box{max-width:560px;margin:30px auto;background:#fff;padding:26px;border-radius:14px;
         box-shadow:0 10px 30px -12px rgba(15,23,42,.3)}
    h1{font-size:19px;margin:0 0 10px} p,li{font-size:14px;line-height:1.6}
    input[type=file]{margin:10px 0;font-size:14px}
    button{margin-top:16px;padding:11px 18px;border:0;border-radius:9px;background:#0e7490;
           color:#fff;font-size:15px;font-weight:600;cursor:pointer}
    .err{color:#b91c1c;font-weight:600}.ok{color:#15803d;font-weight:600}
    table{border-collapse:collapse;margin:12px 0;font-size:14px}
    td{border:1px solid #e2e8f0;padding:6px 12px}
    .warn{background:#fffbeb;border:1px solid #fde68a;padding:10px 12px;border-radius:9px;font-size:13px;color:#7c5300}
  </style>
</head>
<body>
  <div class="box">
    <h1>Nhập dữ liệu website vào cơ sở dữ liệu</h1>
    <?= $report ?>
    <p>Đang có trong CSDL:</p>
    <table>
      <tr><td>Cài đặt</td><td><b><?= $settingCount ?></b></td></tr>
      <?php foreach ($counts as $c => $n): ?>
        <tr><td><?= htmlspecialchars($c) ?></td><td><b><?= $n ?></b></td></tr>
      <?php endforeach; ?>
    </table>
    <form method="post" enctype="multipart/form-data">
      <p>Chọn tệp sao lưu JSON (xuất từ Quản trị → Sao lưu dữ liệu):</p>
      <input type="file" name="backup" accept=".json,application/json" required>
      <label style="display:block;font-size:13.5px;margin-top:8px">
        <input type="checkbox" name="overwrite" value="1"> Ghi đè mục đã có trùng mã
      </label>
      <button type="submit">Nhập dữ liệu</button>
    </form>
    <p class="warn" style="margin-top:16px">⚠️ Sau khi nhập xong, <b>xoá file api/import.php</b>.</p>
  </div>
</body>
</html>
