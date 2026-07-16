# Thư mục nhận file (uploads)

Đây là thư mục nhận file của website khi triển khai bản chính thức:
ảnh nhân viên, ảnh bài viết, tệp đính kèm... sẽ được backend lưu vào đây
(ví dụ `uploads/2026/07/ten-file.jpg`) và website tham chiếu theo đường dẫn.

**Ở bản demo hiện tại** (chưa có backend), trình duyệt không thể tự ghi file
vào ổ đĩa, nên chức năng "Kho tệp" trong trang Quản trị đóng vai trò thư mục
nhận file: tệp tải lên được lưu (dạng base64) trong localStorage của trình duyệt
và có thể tải về lại bất cứ lúc nào.

Khi làm backend (giai đoạn 2 trong README.md), chỉ cần:
1. API `POST /api/files` nhận multipart upload, lưu file vào thư mục này.
2. Sửa hàm `importToLibrary()` trong `assets/js/admin.js` để gọi API đó
   thay vì đọc base64, và lưu đường dẫn file thay vì dataUrl.
