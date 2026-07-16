# Website Trung tâm Y tế khu vực Sơn Dương

Bản **demo hoàn chỉnh với dữ liệu giả** — chạy ngay trên trình duyệt, không cần cài đặt.

## 🚀 Chạy demo

Cách 1 (khuyến nghị — chạy web server tại thư mục dự án):

```
python -m http.server 8080
```

rồi mở http://localhost:8080

Cách 2: mở trực tiếp file `index.html` bằng trình duyệt (Chrome/Edge).

**Trang quản trị:** mở `admin.html` (hoặc bấm "Quản trị" ở góc trên) — tài khoản demo: `admin` / `admin@123`

## 📄 Các trang đã có

| Trang | File | Chức năng |
|---|---|---|
| Trang chủ | `index.html` | Hero, thống kê, khoa phòng, bác sĩ tiêu biểu, tin mới |
| Giới thiệu | `gioi-thieu.html` | Sứ mệnh, tầm nhìn, chức năng nhiệm vụ |
| Khoa phòng | `khoa-phong.html` | Danh sách 10 khoa chuyên môn |
| Đội ngũ bác sĩ | `bac-si.html` | 12 bác sĩ, tìm kiếm + lọc theo khoa |
| Bảng giá dịch vụ | `dich-vu.html` | 21 dịch vụ theo nhóm, giá + BHYT, tìm kiếm |
| Tin tức | `tin-tuc.html` | Danh sách + trang chi tiết bài viết |
| Đặt lịch khám | `dat-lich.html` | Form đăng ký → gửi sang HIS (mô phỏng) → nhận mã hồ sơ + số thứ tự |
| Liên hệ | `lien-he.html` | Thông tin liên hệ, form góp ý, chỗ nhúng bản đồ |
| **Quản trị** | `admin.html` | **Toàn quyền thêm/sửa/xóa mọi dữ liệu** |

## 🔐 Trang quản trị gồm

- **Tổng quan**: thống kê + duyệt nhanh lịch hẹn chờ xác nhận
- **Lịch hẹn khám**: xác nhận / đánh dấu đã khám / hủy (có báo hủy sang HIS) / xóa, lọc + tìm kiếm
- **Bác sĩ, Khoa phòng, Dịch vụ & giá, Tin tức**: thêm / sửa / xóa đầy đủ, thay đổi hiển thị ngay trên website
- **Cài đặt & HIS**: sửa tên đơn vị, địa chỉ, hotline, thông báo chạy; cấu hình endpoint/API key HIS + nút kiểm tra kết nối
- **Sao lưu**: xuất/nhập dữ liệu JSON, khôi phục dữ liệu mẫu

## 🏗 Kiến trúc demo

```
index.html, dat-lich.html, admin.html, ...   ← các trang
assets/
  css/style.css, admin.css                   ← giao diện
  js/data.js         ← "database" giả (localStorage) + dữ liệu mẫu + CRUD
  js/his-adapter.js  ← lớp tích hợp HIS (mock ↔ real, đổi trong Cài đặt)
  js/main.js         ← render các trang công khai
  js/admin.js        ← logic trang quản trị
```

Mọi dữ liệu lưu trong `localStorage` của trình duyệt (key `ttyt_sonduong_db_v1`) — sửa trong admin là thấy ngay ngoài website. Xóa localStorage hoặc bấm "Khôi phục dữ liệu mẫu" để về trạng thái ban đầu.

## 🔌 Tích hợp HIS (thiết kế sẵn)

Mọi giao tiếp với HIS đi qua **duy nhất** file `assets/js/his-adapter.js` với 4 hàm:

| Hàm | Vai trò |
|---|---|
| `checkConnection()` | Kiểm tra kết nối HIS |
| `getAvailableSlots(bácSĩ, ngày)` | Lấy khung giờ khám còn trống |
| `registerAppointment(hồSơ)` | Gửi đăng ký khám → nhận mã hồ sơ + số thứ tự |
| `cancelAppointment(mãHIS)` | Báo hủy lịch sang HIS |

Chế độ `mock` (demo) mô phỏng độ trễ và sinh mã giả. Khi ký hợp đồng tích hợp với đơn vị HIS (VNPT-HIS, Viettel HIS, FPT.eHospital...), chỉ cần:
1. Vào **Quản trị → Cài đặt & HIS**, chuyển chế độ sang "Kết nối HIS thật", điền endpoint + API key + mã cơ sở KCB.
2. Điều chỉnh đường dẫn/payload trong `his-adapter.js` theo tài liệu API của nhà cung cấp.

## 🗺 Lộ trình lên bản chính thức

**Giai đoạn 1 — Demo (đã xong):** toàn bộ giao diện + luồng nghiệp vụ chạy với dữ liệu giả.

**Giai đoạn 2 — Backend thật:**
- Node.js (Express/NestJS) hoặc PHP (Laravel) + PostgreSQL/MySQL; thay `Store` trong `data.js` bằng gọi API.
- Đăng nhập admin qua server: mật khẩu băm bcrypt, phiên JWT, phân quyền (quản trị / biên tập / tiếp đón).
- Upload ảnh bác sĩ, ảnh tin tức; trình soạn thảo văn bản cho bài viết.
- Gửi SMS/Zalo OTP xác nhận đặt lịch.

**Giai đoạn 3 — Tích hợp HIS thật:**
- Làm việc với nhà cung cấp HIS của Trung tâm để lấy tài liệu API (REST hoặc HL7/FHIR).
- Backend làm trung gian (website → backend → HIS), không để trình duyệt gọi HIS trực tiếp (bảo mật API key).
- Đồng bộ 2 chiều: lịch bác sĩ từ HIS về website; hồ sơ đăng ký từ website sang HIS; trạng thái khám trả về.

**Giai đoạn 4 — Vận hành:**
- Tên miền `.vn` + HTTPS, hosting/VPS trong nước.
- Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân (dữ liệu sức khỏe là dữ liệu nhạy cảm).
- Sao lưu tự động, giám sát, nhật ký truy cập admin.

---
⚠️ *Toàn bộ tên bác sĩ, số điện thoại, giá dịch vụ, tin tức trong demo là **dữ liệu giả** phục vụ trình diễn.*
