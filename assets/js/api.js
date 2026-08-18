/* ============================================================
   TTYT KHU VỰC SƠN DƯƠNG — Lớp gọi API backend (chỉ dùng trong trang quản trị)
   Mọi request gửi kèm cookie phiên (credentials: "include").
   ============================================================ */

const Api = {
  async _req(path, opts = {}) {
    const res = await fetch("api/" + path, {
      credentials: "include",
      ...opts,
    });
    let data = null;
    try { data = await res.json(); } catch { /* phản hồi không phải JSON */ }

    if (!res.ok || !data || data.ok === false) {
      const msg = (data && data.error) || `Lỗi máy chủ (HTTP ${res.status}).`;
      throw new Error(msg);
    }
    return data;
  },

  get(path) {
    return this._req(path);
  },

  post(path, body) {
    return this._req(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
  },

  /** Gửi tệp (multipart/form-data) — dùng cho tải tệp lên upload.php */
  postForm(path, formData) {
    return this._req(path, { method: "POST", body: formData });
  },
};
