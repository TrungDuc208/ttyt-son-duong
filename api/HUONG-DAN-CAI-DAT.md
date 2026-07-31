# Backend quản trị — Hướng dẫn cài đặt

Backend lưu **tài khoản và phân quyền** vào cơ sở dữ liệu trên máy chủ, thay cho
cách cũ (lưu trong trình duyệt). Nhờ đó tài khoản con dùng được trên **mọi máy**,
mật khẩu được **mã hoá**, và có **nhật ký thao tác**.

Chạy trên chính hosting VDC hiện có (Windows + IIS + Plesk, PHP + MySQL) — **không tốn thêm chi phí**.

---

## Bước 1 — Nâng phiên bản PHP (khuyến nghị làm trước)

Hosting đang dùng **PHP 7.4.33** — bản này **đã hết hỗ trợ bảo mật từ 11/2022**.
Với website có đăng nhập thì nên nâng lên **PHP 8.1 trở lên**:

> Plesk → **ttytsonduong.vn** → **PHP Settings** → chọn **PHP 8.1/8.2** → **Apply**

Mã nguồn viết tương thích cả PHP 7.4 và 8.x, nên nâng cấp không làm hỏng gì.
Sau khi đổi, mở lại website kiểm tra vẫn chạy bình thường.

## Bước 2 — Tạo cơ sở dữ liệu

> Plesk → **Databases** → **Add Database**

- Database name: `ttyt_admin`
- Tạo kèm **Database user** riêng, đặt mật khẩu mạnh
- **Ghi lại**: tên database, tên user, mật khẩu

## Bước 3 — Tạo các bảng

> Plesk → Databases → **phpMyAdmin** → chọn `ttyt_admin` → tab **Import**
> → chọn file `api/schema.sql` → **Go**

Xong sẽ có 5 bảng: `users`, `user_permissions`, `sessions`, `login_attempts`, `audit_log`.

## Bước 4 — Tạo file cấu hình

Trong thư mục `httpdocs/api/`:

1. Sao chép `config.example.php` thành **`config.php`**
2. Sửa `config.php`, điền thông tin ở Bước 2:

```php
return [
    'host' => 'localhost',
    'name' => 'ttyt_admin',
    'user' => 'ten_user_db',
    'pass' => 'mat_khau_db',
];
```

> ⚠️ File `config.php` chứa mật khẩu CSDL — **không đưa lên GitHub**
> (đã chặn sẵn trong `.gitignore` và `api/web.config`).

## Bước 5 — Tạo tài khoản quản trị cấp cao

Mở trình duyệt: **`https://ttytsonduong.vn/api/setup.php`**

- Nhập tên đăng nhập, họ tên, mật khẩu (**tối thiểu 12 ký tự**)
- Bấm **Tạo tài khoản**

> 🔴 **QUAN TRỌNG: xoá ngay file `api/setup.php`** sau khi tạo xong.

## Bước 6 — Kiểm tra

Mở **`https://ttytsonduong.vn/api/check.php`** — trang này tự dò và báo còn thiếu gì
(phiên bản PHP, thư viện, kết nối CSDL, đủ bảng chưa, giới hạn tải tệp, quyền ghi
thư mục uploads…). Sửa theo hướng dẫn hiện trên trang rồi tải lại.

Khi tất cả hiện ✅ là dùng được. Có thể kiểm tra thêm:
`https://ttytsonduong.vn/api/auth.php?action=me` → trả về `{"ok":true,"user":null}`.

> 🔴 Cài xong nhớ **xoá 3 file**: `api/setup.php`, `api/import.php`, `api/check.php`.

## Tệp lớn (nếu cần tải tới 100MB)

Mặc định PHP chỉ cho tải ~2–8MB. Muốn tải tệp lớn:

> Plesk → ttytsonduong.vn → **PHP Settings**
> - `upload_max_filesize` = **100M**
> - `post_max_size` = **105M**
> - `max_execution_time` = **300**

Trang `check.php` sẽ báo giới hạn hiện tại đang là bao nhiêu.

---

## Các đường dẫn API

| Đường dẫn | Việc | Ai được dùng |
|---|---|---|
| `POST /api/auth.php?action=login` | Đăng nhập | Mọi người |
| `POST /api/auth.php?action=logout` | Đăng xuất | Đã đăng nhập |
| `GET /api/auth.php?action=me` | Xem phiên hiện tại | Mọi người |
| `POST /api/auth.php?action=change-password` | Tự đổi mật khẩu | Đã đăng nhập |
| `GET /api/users.php` | Danh sách tài khoản | Cấp cao |
| `POST /api/users.php?action=create` | Tạo tài khoản con | Cấp cao |
| `POST /api/users.php?action=update` | Sửa tên / đổi quyền / khoá | Cấp cao |
| `POST /api/users.php?action=reset-pw` | Đặt lại mật khẩu | Cấp cao |
| `POST /api/users.php?action=delete` | Xoá tài khoản | Cấp cao |

## Biện pháp bảo mật đã áp dụng

- **Mật khẩu băm bcrypt** (`password_hash`), không lưu dạng đọc được.
- **Phiên đăng nhập** lưu ở CSDL, token chỉ lưu **bản băm**; cookie `HttpOnly` +
  `Secure` + `SameSite=Strict` → chống đánh cắp phiên và CSRF.
- **Chống dò mật khẩu**: sai 8 lần trong 15 phút thì khoá tạm (theo IP và theo tài khoản).
- **Prepared statement** toàn bộ truy vấn → chống SQL injection.
- **Lọc quyền phía máy chủ**: tài khoản con không thể tự nâng quyền, không xoá
  được tài khoản cấp cao; khoá tài khoản là **huỷ phiên ngay lập tức**.
- **Bắt buộc HTTPS**; chặn tải `config.php` và `*.sql`.
- **Nhật ký** (`audit_log`) ghi lại đăng nhập, tạo/sửa/xoá tài khoản.

## Việc còn lại (giai đoạn sau)

Backend này mới lo **tài khoản + phân quyền**. Để trang quản trị dùng nó thay cho
localStorage, cần thêm:
1. Nối màn hình đăng nhập và mục "Tài khoản" trong `admin.html` vào các API trên.
2. (Tuỳ chọn) Chuyển **nội dung** (tin tức, bác sĩ, cài đặt) lên CSDL — khi đó cán
   bộ đăng bài là hiện ngay cho mọi người, không phải gửi file qua lại nữa.
