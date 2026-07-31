-- ============================================================
--  TTYT KHU VỰC SƠN DƯƠNG — Lược đồ CSDL phần NỘI DUNG
--  Chạy sau schema.sql (phpMyAdmin > Import).
-- ============================================================

SET NAMES utf8mb4;

-- ---------- Nội dung dạng danh sách ----------
-- collection: news | doctors | departments | services | hero
-- item_key  : giữ đúng id cũ (n1, bs1, d1, s1, h1) để không phải sửa giao diện
-- data      : toàn bộ nội dung của mục, lưu dạng JSON
CREATE TABLE IF NOT EXISTS content_items (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  collection   VARCHAR(40)  NOT NULL,
  item_key     VARCHAR(64)  NOT NULL,
  data         LONGTEXT     NOT NULL,
  sort_order   INT          NOT NULL DEFAULT 0,
  is_published TINYINT(1)   NOT NULL DEFAULT 1,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by   INT          NULL,
  UNIQUE KEY uk_coll_key (collection, item_key),
  INDEX idx_coll_order (collection, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Cài đặt chung của website ----------
CREATE TABLE IF NOT EXISTS settings (
  k          VARCHAR(60) PRIMARY KEY,
  v          LONGTEXT    NULL,
  updated_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Kho tệp ----------
-- File thật lưu trong thư mục /uploads trên máy chủ (không nhét vào CSDL)
-- -> tải được tệp lớn, trang web nhẹ.
CREATE TABLE IF NOT EXISTS files (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  orig_name    VARCHAR(255) NOT NULL,
  stored_path  VARCHAR(255) NOT NULL,        -- vd: uploads/2026/07/abc123.jpg
  mime         VARCHAR(100) NOT NULL DEFAULT '',
  size_bytes   BIGINT       NOT NULL DEFAULT 0,
  uploaded_by  INT          NULL,
  uploaded_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_file_time (uploaded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
