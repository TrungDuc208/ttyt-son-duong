-- ============================================================
--  TTYT KHU VỰC SƠN DƯƠNG — Lược đồ CSDL cho phần quản trị
--  Chạy 1 lần khi cài đặt (Plesk > Databases > phpMyAdmin > Import).
--  Yêu cầu: MySQL 5.7+ / MariaDB 10.2+
-- ============================================================

SET NAMES utf8mb4;

-- ---------- Tài khoản quản trị ----------
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,          -- bcrypt (password_hash của PHP)
  full_name     VARCHAR(150) NOT NULL DEFAULT '',
  role          ENUM('superadmin','editor') NOT NULL DEFAULT 'editor',
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  must_change_pw TINYINT(1)  NOT NULL DEFAULT 0, -- buộc đổi mật khẩu lần đăng nhập đầu
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME     NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Quyền của tài khoản con ----------
-- Mỗi dòng = 1 mục mà tài khoản được phép quản lý (news, doctors, hero...).
-- Tài khoản superadmin không cần dòng nào (mặc định toàn quyền).
CREATE TABLE IF NOT EXISTS user_permissions (
  user_id INT         NOT NULL,
  panel   VARCHAR(40) NOT NULL,
  PRIMARY KEY (user_id, panel),
  CONSTRAINT fk_perm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Phiên đăng nhập ----------
-- Lưu phiên ở CSDL thay vì chỉ dựa vào session PHP -> đăng xuất được từ xa,
-- và quyền bị thu hồi có hiệu lực ngay.
CREATE TABLE IF NOT EXISTS sessions (
  id          CHAR(64)  PRIMARY KEY,            -- token ngẫu nhiên đã băm
  user_id     INT       NOT NULL,
  ip          VARCHAR(45) NOT NULL DEFAULT '',
  user_agent  VARCHAR(255) NOT NULL DEFAULT '',
  created_at  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at  DATETIME  NOT NULL,
  CONSTRAINT fk_sess_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sess_expire (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Chống dò mật khẩu ----------
CREATE TABLE IF NOT EXISTS login_attempts (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  username     VARCHAR(50)  NOT NULL DEFAULT '',
  ip           VARCHAR(45)  NOT NULL DEFAULT '',
  success      TINYINT(1)   NOT NULL DEFAULT 0,
  attempted_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_try_ip   (ip, attempted_at),
  INDEX idx_try_user (username, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Nhật ký thao tác ----------
-- Cơ quan nhà nước nên có vết ai làm gì, lúc nào.
CREATE TABLE IF NOT EXISTS audit_log (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT          NULL,
  username   VARCHAR(50)  NOT NULL DEFAULT '',
  action     VARCHAR(80)  NOT NULL,
  detail     TEXT         NULL,
  ip         VARCHAR(45)  NOT NULL DEFAULT '',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_time (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  Tài khoản cấp cao đầu tiên
--  KHÔNG đặt mật khẩu sẵn trong file này. Chạy api/setup.php một lần
--  để tạo tài khoản và nhập mật khẩu -> mật khẩu được băm bcrypt.
-- ============================================================
