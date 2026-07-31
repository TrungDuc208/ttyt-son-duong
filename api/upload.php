<?php
/* ============================================================
   Tải tệp lên máy chủ (ảnh, PDF, tệp cài đặt...)
   File lưu vào thư mục /uploads — KHÔNG nhét vào CSDL
   -> tải được tệp lớn, trang web vẫn nhẹ.

   POST /api/upload.php        (multipart/form-data, trường "file")
   GET  /api/upload.php        -> danh sách tệp đã tải
   POST /api/upload.php?action=delete  {id}
   ============================================================ */

require __DIR__ . '/lib.php';

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;   // 100MB

/* Chỉ nhận các định dạng an toàn. TUYỆT ĐỐI không nhận .php/.exe/.aspx... */
const ALLOWED = [
    'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png',
    'gif' => 'image/gif',  'webp' => 'image/webp',
    'pdf' => 'application/pdf',
    'doc' => 'application/msword',
    'docx'=> 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls' => 'application/vnd.ms-excel',
    'xlsx'=> 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'apk' => 'application/vnd.android.package-archive',
];

$action = $_GET['action'] ?? '';

/* ---------------- Danh sách tệp ---------------- */
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === '') {
    requirePanel('files');
    $rows = db()->query(
        'SELECT id, orig_name, stored_path, mime, size_bytes, uploaded_at
         FROM files ORDER BY uploaded_at DESC LIMIT 500'
    )->fetchAll();
    ok(['files' => $rows]);
}

/* ---------------- Xoá tệp ---------------- */
if ($action === 'delete') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'Sai phương thức.');
    $me = requirePanel('files');
    $id = (int)(input()['id'] ?? 0);

    $stmt = db()->prepare('SELECT * FROM files WHERE id = ?');
    $stmt->execute([$id]);
    $f = $stmt->fetch();
    if (!$f) fail(404, 'Không tìm thấy tệp.');

    // Chỉ cho xoá trong thư mục uploads (chặn xoá file hệ thống)
    $root = realpath(__DIR__ . '/../uploads');
    $path = realpath(__DIR__ . '/../' . $f['stored_path']);
    if ($root && $path && strpos($path, $root) === 0 && is_file($path)) @unlink($path);

    db()->prepare('DELETE FROM files WHERE id = ?')->execute([$id]);
    audit($me, 'file_delete', $f['orig_name']);
    ok();
}

/* ---------------- Tải tệp lên ---------------- */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'Sai phương thức.');
$me = requirePanel('files');

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    $code = $_FILES['file']['error'] ?? -1;
    if ($code === UPLOAD_ERR_INI_SIZE || $code === UPLOAD_ERR_FORM_SIZE) {
        fail(413, 'Tệp vượt quá giới hạn máy chủ cho phép. Xem mục "Tệp lớn" trong hướng dẫn cài đặt.');
    }
    fail(400, 'Không nhận được tệp (mã lỗi ' . $code . ').');
}

$file = $_FILES['file'];
if ($file['size'] > MAX_UPLOAD_BYTES) fail(413, 'Tệp vượt quá 100MB.');

$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if (!isset(ALLOWED[$ext])) {
    fail(415, 'Định dạng không được phép. Chỉ nhận: ' . implode(', ', array_keys(ALLOWED)));
}

/* Kiểm tra nội dung thật của tệp, không tin phần mở rộng */
$finfo = new finfo(FILEINFO_MIME_TYPE);
$realMime = (string)$finfo->file($file['tmp_name']);
$isOffice = in_array($ext, ['docx', 'xlsx', 'apk'], true) && $realMime === 'application/zip';
if ($realMime !== ALLOWED[$ext] && !$isOffice && strpos($realMime, 'application/octet-stream') !== 0) {
    fail(415, "Nội dung tệp không khớp định dạng .$ext");
}

/* Tên file do máy chủ đặt -> tránh tên độc hại, tránh ghi đè */
$dir = __DIR__ . '/../uploads/' . date('Y/m');
if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
    fail(500, 'Không tạo được thư mục lưu tệp.');
}
$safeBase = preg_replace('/[^a-zA-Z0-9]+/', '-', pathinfo($file['name'], PATHINFO_FILENAME));
$safeBase = trim(substr($safeBase, 0, 40), '-') ?: 'tep';
$stored   = $safeBase . '-' . bin2hex(random_bytes(4)) . '.' . $ext;
$destAbs  = $dir . '/' . $stored;
$destRel  = 'uploads/' . date('Y/m') . '/' . $stored;

if (!move_uploaded_file($file['tmp_name'], $destAbs)) fail(500, 'Không lưu được tệp lên máy chủ.');

db()->prepare(
    'INSERT INTO files (orig_name, stored_path, mime, size_bytes, uploaded_by)
     VALUES (?, ?, ?, ?, ?)'
)->execute([$file['name'], $destRel, ALLOWED[$ext], $file['size'], $me['id']]);

audit($me, 'file_upload', $file['name'] . ' -> ' . $destRel);
ok(['id' => (int)db()->lastInsertId(), 'url' => $destRel, 'name' => $file['name'], 'size' => $file['size']]);
