<?php
/* ============================================================
   MẪU cấu hình kết nối CSDL.
   Cách dùng: sao chép file này thành  config.php  (cùng thư mục)
   rồi điền thông tin CSDL lấy trong Plesk > Databases.
   ⚠️ KHÔNG commit config.php lên GitHub (đã có trong .gitignore).
   ============================================================ */

return [
    'host' => 'localhost',
    'name' => 'ten_database',    // vd: ttyt_admin
    'user' => 'ten_dang_nhap_db',
    'pass' => 'mat_khau_db',
];
