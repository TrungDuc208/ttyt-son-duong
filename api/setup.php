<?php
/* ============================================================
   CÀI ĐẶT LẦN ĐẦU — tạo tài khoản quản trị cấp cao.
   ⚠️ XOÁ FILE NÀY NGAY sau khi cài xong.
   Mở: https://ttytsonduong.vn/api/setup.php
   ============================================================ */

require __DIR__ . '/lib.php';
header('Content-Type: text/html; charset=utf-8');   // trang này hiển thị form

/* Chặn chạy lại: đã có tài khoản cấp cao thì dừng */
$exists = (int)db()->query('SELECT COUNT(*) c FROM users WHERE role = "superadmin"')->fetch()['c'] > 0;

$msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !$exists) {
    $username = strtolower(trim((string)($_POST['username'] ?? '')));
    $fullName = trim((string)($_POST['full_name'] ?? 'Quản trị viên cấp cao'));
    $password = (string)($_POST['password'] ?? '');
    $confirm  = (string)($_POST['confirm'] ?? '');

    if (!preg_match('/^[a-z0-9._-]{4,50}$/', $username)) {
        $msg = '<p class="err">Tên đăng nhập 4-50 ký tự, chỉ chữ thường, số và . _ -</p>';
    } elseif (strlen($password) < 12) {
        $msg = '<p class="err">Mật khẩu tài khoản cấp cao phải từ 12 ký tự trở lên.</p>';
    } elseif ($password !== $confirm) {
        $msg = '<p class="err">Hai lần nhập mật khẩu không khớp.</p>';
    } else {
        db()->prepare(
            'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, "superadmin")'
        )->execute([$username, password_hash($password, PASSWORD_DEFAULT), $fullName]);
        audit(null, 'setup_superadmin', "username=$username");
        $msg = '<p class="ok">✅ Đã tạo tài khoản cấp cao <b>' . htmlspecialchars($username) .
               '</b>.<br><b>Hãy XOÁ file api/setup.php ngay bây giờ</b>, rồi đăng nhập tại
                <a href="../admin.html">trang quản trị</a>.</p>';
        $exists = true;
    }
}
?>
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cài đặt quản trị — TTYT Sơn Dương</title>
  <style>
    body{font-family:system-ui,Segoe UI,Arial,sans-serif;background:#eef4f5;padding:24px;color:#1e293b}
    .box{max-width:460px;margin:40px auto;background:#fff;padding:26px;border-radius:14px;
         box-shadow:0 10px 30px -12px rgba(15,23,42,.3)}
    h1{font-size:19px;margin:0 0 6px} p{font-size:14px;line-height:1.6}
    label{display:block;font-size:13px;font-weight:600;margin:14px 0 5px}
    input{width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:9px;font-size:14px;box-sizing:border-box}
    button{margin-top:18px;width:100%;padding:11px;border:0;border-radius:9px;background:#0e7490;
           color:#fff;font-size:15px;font-weight:600;cursor:pointer}
    .err{color:#b91c1c;font-weight:600}.ok{color:#15803d;font-weight:600}
    .warn{background:#fffbeb;border:1px solid #fde68a;padding:10px 12px;border-radius:9px;font-size:13px;color:#7c5300}
  </style>
</head>
<body>
  <div class="box">
    <h1>Cài đặt tài khoản quản trị cấp cao</h1>
    <?= $msg ?>
    <?php if ($exists && !$msg): ?>
      <p class="err">Đã có tài khoản cấp cao trong hệ thống. Không thể chạy lại trang cài đặt.</p>
      <p class="warn">⚠️ Nếu file này vẫn còn trên máy chủ, hãy <b>xoá api/setup.php</b> ngay.</p>
    <?php elseif (!$exists): ?>
      <p>Tạo tài khoản quản trị đầu tiên. Mật khẩu sẽ được <b>mã hoá (bcrypt)</b> trước khi lưu.</p>
      <form method="post">
        <label>Tên đăng nhập</label>
        <input name="username" required placeholder="vd: admin" autocomplete="off">
        <label>Họ tên hiển thị</label>
        <input name="full_name" value="Quản trị viên cấp cao">
        <label>Mật khẩu (tối thiểu 12 ký tự)</label>
        <input name="password" type="password" required autocomplete="new-password">
        <label>Nhập lại mật khẩu</label>
        <input name="confirm" type="password" required autocomplete="new-password">
        <button type="submit">Tạo tài khoản</button>
      </form>
      <p class="warn" style="margin-top:16px">⚠️ Sau khi tạo xong <b>phải xoá file api/setup.php</b>
         để người khác không chạy lại được.</p>
    <?php endif; ?>
  </div>
</body>
</html>
