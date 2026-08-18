/* ============================================================
   TRANG QUẢN TRỊ - LOGIC
   Kết nối máy chủ thật (PHP + MySQL) qua api/*.php — xem assets/js/api.js.
   Toàn quyền thêm / sửa / xóa mọi dữ liệu website theo phân quyền.
   ============================================================ */

function toast(msg, isErr = false) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = isErr ? "err show" : "show";
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 3500);
}

function deptName(id)   { const d = Store.get("departments", id); return d ? d.name : "—"; }
function doctorName(id) { const d = Store.get("doctors", id);     return d ? `${d.title}. ${d.name}` : "(chưa chọn)"; }

/* ================= ĐĂNG NHẬP (qua api/auth.php) ================= */
let CURRENT_USER = null;
function currentUser() { return CURRENT_USER; }

/** Hỏi máy chủ xem cookie phiên hiện tại có còn hợp lệ không */
async function refreshSession() {
  try {
    const r = await Api.get("auth.php?action=me");
    CURRENT_USER = r.user || null;
  } catch (e) {
    CURRENT_USER = null;
  }
  return CURRENT_USER;
}

async function showAdmin() {
  const loginBtn = document.querySelector("#login-form button[type=submit]");
  try {
    if (loginBtn) { loginBtn.disabled = true; loginBtn.textContent = "Đang tải dữ liệu..."; }
    await Store.loadAll();
  } catch (e) {
    toast("Không tải được dữ liệu từ máy chủ: " + e.message, true);
  } finally {
    if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = "Đăng nhập"; }
  }

  document.getElementById("login-screen").style.display = "none";
  document.getElementById("admin-shell").classList.add("active");
  const me = currentUser();
  document.getElementById("admin-name").textContent =
    me.fullName + (me.role === "superadmin" ? " · Cấp cao" : " · Tài khoản con");
  document.getElementById("today-str").textContent =
    new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
  fillSettingsForms();
  renderAll();
  applyRolePermissions();
}

document.getElementById("login-form").onsubmit = async (ev) => {
  ev.preventDefault();
  const u = document.getElementById("login-user").value.trim();
  const p = document.getElementById("login-pass").value;
  if (!u || !p) { toast("Nhập tên đăng nhập và mật khẩu.", true); return; }
  try {
    const r = await Api.post("auth.php?action=login", { username: u, password: p });
    CURRENT_USER = r.user;
    showAdmin();
  } catch (e) {
    toast(e.message, true);
  }
};

/* ================= STORE: KẾT NỐI MÁY CHỦ THẬT (thay cho localStorage) =================
   Gán lại biến "Store" (khai báo "let" trong data.js) bằng bản đọc/ghi qua api/*.php.
   Các mục nội dung (departments/doctors/services/news/hero) đi qua content.php;
   "files" đi qua upload.php; "appointments" chưa có backend (đặt lịch còn là demo,
   chờ tích hợp HIS riêng) nên chỉ giữ tạm trong bộ nhớ, không lưu máy chủ. */
const CONTENT_COLLECTIONS = ["departments", "doctors", "services", "news", "hero"];

const DEFAULT_SETTINGS = {
  siteName: "", slogan: "", address: "", hotline: "", hotlineDept: "",
  email: "", workingHours: "", announcement: "",
  featuredDoctors: [], aboutSections: [],
  his: { mode: "mock", endpoint: "", apiKey: "", facilityCode: "", timeout: 15000 }
};

/** Chuẩn hoá bản ghi tệp từ upload.php (orig_name/stored_path/mime...) về đúng
    hình dạng cũ (name/dataUrl/type/size/uploadedAt) để không phải sửa mọi nơi dùng nó. */
function normalizeFile(f) {
  return {
    id: f.id, name: f.orig_name, type: f.mime || "application/octet-stream",
    size: f.size_bytes, uploadedAt: f.uploaded_at, dataUrl: f.stored_path,
  };
}

Store = {
  _cache: {
    settings: { ...DEFAULT_SETTINGS },
    departments: [], doctors: [], services: [], news: [], hero: [],
    files: [], appointments: [], users: [],
  },

  /** Tải toàn bộ dữ liệu quản trị từ máy chủ — gọi 1 lần sau khi đăng nhập */
  async loadAll() {
    try {
      const r = await Api.get("content.php?action=settings");
      this._cache.settings = { ...DEFAULT_SETTINGS, ...(r.settings || {}) };
    } catch (e) {
      toast("Không tải được cài đặt: " + e.message, true);
    }

    for (const col of CONTENT_COLLECTIONS) {
      try {
        const r = await Api.get("content.php?collection=" + col);
        this._cache[col] = r.items || [];
      } catch (e) {
        toast(`Không tải được mục "${col}": ` + e.message, true);
      }
    }

    try {
      const r = await Api.get("upload.php");
      this._cache.files = (r.files || []).map(normalizeFile);
    } catch (e) {
      // Tài khoản không có quyền "files" sẽ bị chặn (403) -> bỏ qua yên lặng
    }

    if ((currentUser() || {}).role === "superadmin") {
      try {
        const r = await Api.get("users.php");
        this._cache.users = (r.users || []).map(u => ({
          id: u.id, username: u.username, fullName: u.full_name,
          role: u.role, perms: u.perms, isActive: u.is_active,
        }));
      } catch (e) {
        toast("Không tải được danh sách tài khoản: " + e.message, true);
      }
    }
  },

  all(col)     { return this._cache[col] || []; },
  get(col, id) { return this.all(col).find(x => x.id === id); },

  /** Thêm mục mới — cập nhật giao diện ngay (lạc quan), lưu máy chủ chạy nền phía sau */
  add(col, item) {
    item.id = item.id || (col.slice(0, 2) + Date.now().toString(36) + Math.floor(Math.random() * 1000));
    (this._cache[col] = this._cache[col] || []).push(item);
    if (CONTENT_COLLECTIONS.includes(col)) this._persist(col, item);
    return item;
  },

  update(col, id, patch) {
    const item = this.get(col, id);
    if (!item) return item;
    Object.assign(item, patch);
    if (CONTENT_COLLECTIONS.includes(col)) this._persist(col, item);
    return item;
  },

  remove(col, id) {
    this._cache[col] = (this._cache[col] || []).filter(x => x.id !== id);
    if (CONTENT_COLLECTIONS.includes(col)) {
      Api.post("content.php?action=delete&collection=" + col, { key: id })
        .catch(e => toast("Không xoá được trên máy chủ: " + e.message, true));
    } else if (col === "files") {
      Api.post("upload.php?action=delete", { id })
        .catch(e => toast("Không xoá được tệp trên máy chủ: " + e.message, true));
    }
  },

  /** Lưu lại thứ tự sau khi kéo/di chuyển (vd. sắp xếp ảnh Hero) */
  async reorder(col, keys) {
    try {
      await Api.post("content.php?action=reorder&collection=" + col, { keys });
    } catch (e) {
      toast("Không lưu được thứ tự: " + e.message, true);
    }
  },

  _persist(col, item) {
    Api.post("content.php?action=save&collection=" + col, { key: item.id, data: item })
      .catch(e => toast("Không lưu được lên máy chủ: " + e.message, true));
  },

  settings() { return this._cache.settings; },
  saveSettings(patch) {
    Object.assign(this._cache.settings, patch);
    Api.post("content.php?action=settings", { settings: this._cache.settings })
      .catch(e => toast("Không lưu được cài đặt lên máy chủ: " + e.message, true));
  },

  export() { return JSON.stringify(this._cache, null, 2); },
  reset() {
    toast("Chức năng khôi phục dữ liệu mẫu đã tắt trên bản chính thức (an toàn dữ liệu thật).", true);
  },
  import() {
    toast("Nhập từ file JSON đã tắt trên bản chính thức. Hãy sửa từng mục trong các trang quản lý.", true);
  },
};

/* ================= PHÂN QUYỀN THEO VAI TRÒ ================= */
// Các mục tài khoản con CÓ THỂ được cấp quyền quản lý
const GRANTABLE_PANELS = [
  ["dashboard", "📊 Tổng quan"], ["appointments", "📅 Lịch hẹn khám"],
  ["doctors", "👨‍⚕️ Bác sĩ"], ["featured", "⭐ BS tiêu biểu"],
  ["departments", "🏥 Khoa phòng"], ["services", "💰 Dịch vụ & giá"],
  ["news", "📰 Tin tức"], ["hero", "🖼️ Ảnh Hero"], ["files", "📁 Kho tệp"]
];
// Chỉ tài khoản cấp cao (superadmin) mới vào được
const SUPERADMIN_ONLY = ["users", "settings", "backup"];

function applyRolePermissions() {
  const me = currentUser() || {};
  const isSuper = me.role === "superadmin";
  const perms = me.perms || [];
  let firstVisible = null;
  document.querySelectorAll("#admin-nav button[data-panel]").forEach(btn => {
    const p = btn.dataset.panel;
    const ok = isSuper ? true : (SUPERADMIN_ONLY.includes(p) ? false : perms.includes(p));
    btn.style.display = ok ? "" : "none";
    if (ok && !firstVisible) firstVisible = btn;
  });
  // Nếu panel đang mở bị ẩn (hoặc chưa chọn) -> nhảy về mục hợp lệ đầu tiên
  const active = document.querySelector("#admin-nav button.active");
  if ((!active || active.style.display === "none") && firstVisible) firstVisible.click();
}

document.getElementById("btn-logout").onclick = async (ev) => {
  ev.preventDefault();
  try { await Api.post("auth.php?action=logout", {}); } catch (e) { /* vẫn thoát dù lỗi mạng */ }
  CURRENT_USER = null;
  location.reload();
};

/* ================= ĐIỀU HƯỚNG PANEL ================= */
const PANEL_TITLES = {
  dashboard: "Tổng quan", appointments: "Lịch hẹn khám", doctors: "Quản lý bác sĩ",
  featured: "Bác sĩ tiêu biểu (trang chủ)",
  departments: "Quản lý khoa phòng", services: "Dịch vụ & bảng giá",
  news: "Quản lý tin tức", hero: "Ảnh Hero — trình chiếu đầu trang chủ",
  files: "Kho tệp — thư mục nhận file",
  users: "Quản lý tài khoản",
  settings: "Cài đặt & kết nối HIS", backup: "Sao lưu dữ liệu"
};

document.getElementById("admin-nav").addEventListener("click", (ev) => {
  const btn = ev.target.closest("button[data-panel]");
  if (!btn) return;
  document.querySelectorAll("#admin-nav button").forEach(b => b.classList.toggle("active", b === btn));
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  document.getElementById("panel-" + btn.dataset.panel).classList.add("active");
  document.getElementById("panel-title").textContent = PANEL_TITLES[btn.dataset.panel];
});

/* ================= MODAL DÙNG CHUNG ================= */
let modalSubmit = null;

function openModal(title, bodyHTML, onSubmit) {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-body").innerHTML = bodyHTML;
  modalSubmit = onSubmit;
  document.getElementById("modal-overlay").classList.add("open");
}
function closeModal() {
  document.getElementById("modal-overlay").classList.remove("open");
  modalSubmit = null;
}
document.getElementById("modal-form").onsubmit = (ev) => {
  ev.preventDefault();
  if (modalSubmit) modalSubmit(new FormData(ev.target));
};
document.getElementById("modal-overlay").addEventListener("click", (ev) => {
  if (ev.target.id === "modal-overlay") closeModal();
});

function fld(label, name, value = "", opts = {}) {
  const { type = "text", required = false, full = false, placeholder = "" } = opts;
  const input = type === "textarea"
    ? `<textarea name="${name}" rows="${opts.rows || 4}" ${required ? "required" : ""} placeholder="${placeholder}">${Fmt.esc(value)}</textarea>`
    : `<input type="${type}" name="${name}" value="${Fmt.esc(value)}" ${required ? "required" : ""} placeholder="${placeholder}">`;
  return `<div class="${full ? "full" : ""}"><label class="fld">${label}${required ? ' <span class="req">*</span>' : ""}</label>${input}</div>`;
}

function deptOptions(selected) {
  return Store.all("departments").map(d =>
    `<option value="${d.id}" ${d.id === selected ? "selected" : ""}>${Fmt.esc(d.name)}</option>`).join("");
}

/* ================= TỔNG QUAN ================= */
function renderDashboard() {
  const appts = Store.all("appointments");
  const pending = appts.filter(a => a.status === "pending");
  const todayISO = new Date().toISOString().slice(0, 10);

  document.getElementById("dash-stats").innerHTML = `
    <div class="dash-card amber"><div class="num">${pending.length}</div><div class="lbl">Lịch hẹn chờ xác nhận</div></div>
    <div class="dash-card green"><div class="num">${appts.filter(a => a.date >= todayISO && a.status === "confirmed").length}</div><div class="lbl">Lịch đã xác nhận sắp tới</div></div>
    <div class="dash-card"><div class="num">${Store.all("doctors").length}</div><div class="lbl">Bác sĩ</div></div>
    <div class="dash-card violet"><div class="num">${Store.all("services").length}</div><div class="lbl">Dịch vụ niêm yết</div></div>`;

  document.getElementById("dash-pending").innerHTML = pending.length ? `
    <table class="data">
      <thead><tr><th>Mã</th><th>Người khám</th><th>Khoa / Ngày / Giờ</th><th>Thao tác</th></tr></thead>
      <tbody>${pending.map(a => `
        <tr>
          <td>${a.code}</td>
          <td>${Fmt.esc(a.name)}<div class="cell-sub">📞 ${Fmt.esc(a.phone)}</div></td>
          <td>${Fmt.esc(deptName(a.dept))}<div class="cell-sub">${Fmt.date(a.date)} · ${a.slot}</div></td>
          <td><div class="row-actions">
            <button class="icon-btn" onclick="setApptStatus('${a.id}','confirmed')">✅ Xác nhận</button>
            <button class="icon-btn danger" onclick="setApptStatus('${a.id}','cancelled')">❌ Hủy</button>
          </div></td>
        </tr>`).join("")}</tbody>
    </table>` : `<div class="empty-note">Không có lịch hẹn nào chờ xác nhận. 🎉</div>`;
}

/* ================= LỊCH HẸN ================= */
function renderAppointments() {
  const st = document.getElementById("appt-status-filter").value;
  const q = document.getElementById("appt-search").value.toLowerCase();
  const list = [...Store.all("appointments")]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .filter(a => (!st || a.status === st) &&
      (!q || a.name.toLowerCase().includes(q) || a.phone.includes(q) || (a.code || "").toLowerCase().includes(q)));

  document.getElementById("appt-table").innerHTML = list.length ? `
    <table class="data">
      <thead><tr>
        <th>Mã đặt lịch</th><th>Người khám</th><th>Khám</th><th>Lý do</th><th>HIS</th><th>Trạng thái</th><th>Thao tác</th>
      </tr></thead>
      <tbody>${list.map(a => {
        const s = APPT_STATUS[a.status] || APPT_STATUS.pending;
        return `
        <tr>
          <td>${a.code || "—"}<div class="cell-sub">${Fmt.date(a.createdAt)}</div></td>
          <td>${Fmt.esc(a.name)}
            <div class="cell-sub">🎂 ${Fmt.date(a.dob)} · 📞 ${Fmt.esc(a.phone)}</div>
            ${a.bhyt ? `<div class="cell-sub">🪪 BHYT: ${Fmt.esc(a.bhyt)}</div>` : ""}</td>
          <td>${Fmt.esc(deptName(a.dept))}
            <div class="cell-sub">${Fmt.esc(doctorName(a.doctor))}</div>
            <div class="cell-sub">${Fmt.date(a.date)} · ${a.slot}</div></td>
          <td style="max-width:200px;font-size:13px">${Fmt.esc(a.symptom)}</td>
          <td>${a.hisCode ? `<span class="badge badge-info">${a.hisCode}</span>` : '<span class="cell-sub">chưa đồng bộ</span>'}</td>
          <td><span class="badge ${s.cls}">${s.label}</span></td>
          <td><div class="row-actions">
            ${a.status === "pending" ? `<button class="icon-btn" title="Xác nhận" onclick="setApptStatus('${a.id}','confirmed')">✅</button>` : ""}
            ${a.status === "confirmed" ? `<button class="icon-btn" title="Đã khám xong" onclick="setApptStatus('${a.id}','done')">🏁</button>` : ""}
            ${a.status !== "cancelled" && a.status !== "done" ? `<button class="icon-btn" title="Hủy lịch" onclick="cancelAppt('${a.id}')">❌</button>` : ""}
            <button class="icon-btn danger" title="Xóa bản ghi" onclick="removeItem('appointments','${a.id}','lịch hẹn của ${Fmt.esc(a.name)}')">🗑</button>
          </div></td>
        </tr>`;
      }).join("")}</tbody>
    </table>` : `<div class="empty-note">Không có lịch hẹn phù hợp.</div>`;
}

function setApptStatus(id, status) {
  Store.update("appointments", id, { status });
  toast("Đã cập nhật trạng thái lịch hẹn.");
  renderAll();
}

async function cancelAppt(id) {
  const a = Store.get("appointments", id);
  if (!confirm(`Hủy lịch hẹn ${a.code} của ${a.name}?`)) return;
  try {
    if (a.hisCode) await HIS.cancelAppointment(a.hisCode); // báo hủy sang HIS
    Store.update("appointments", id, { status: "cancelled" });
    toast("Đã hủy lịch hẹn" + (a.hisCode ? " và đồng bộ sang HIS." : "."));
  } catch (e) {
    toast("Lỗi khi báo hủy sang HIS: " + e.message, true);
  }
  renderAll();
}

document.getElementById("appt-status-filter").onchange = renderAppointments;
document.getElementById("appt-search").oninput = renderAppointments;

/* ================= XÓA DÙNG CHUNG ================= */
function removeItem(col, id, label) {
  if (!confirm(`Xóa vĩnh viễn ${label}?`)) return;
  Store.remove(col, id);
  toast("Đã xóa.");
  renderAll();
}

/* ================= KHO TỆP (thư mục nhận file) ================= */
/* Import file dùng chung: mọi ảnh/tệp tải lên đều đi vào Kho tệp,
   các nơi khác (ảnh bác sĩ, ảnh bài viết, đính kèm) tham chiếu từ đây. */

let filePickCb = null;

function pickFile(accept, multiple, cb) {
  const inp = document.getElementById("file-pick-input");
  inp.accept = accept;
  inp.multiple = multiple;
  inp.value = "";
  filePickCb = cb;
  inp.click();
}

function readAsDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error("Không đọc được tệp " + file.name));
    r.readAsDataURL(file);
  });
}

/* Nén ảnh về tối đa 900px, JPEG - tránh đầy localStorage */
function shrinkImage(dataUrl, maxW = 900, quality = 0.82, maxH = 1200) {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      // Giới hạn CẢ chiều rộng và chiều cao -> ảnh dọc (chụp màn hình điện thoại)
      // không bị lưu ở kích thước quá lớn
      const scale = Math.min(1, maxW / img.width, maxH / img.height);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff";               // nền trắng cho ảnh PNG trong suốt
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => res(dataUrl);
    img.src = dataUrl;
  });
}

/** Chuyển ảnh dạng base64 (dataURL, đã nén) thành File để gửi lên máy chủ */
function dataUrlToFile(dataUrl, origName) {
  const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!m) throw new Error("Ảnh không hợp lệ.");
  const mime = m[1];
  const bin = atob(m[2]);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const ext = mime === "image/jpeg" ? "jpg" : (mime.split("/")[1] || "jpg");
  const base = (origName || "anh").replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "-") || "anh";
  return new File([arr], `${base}.${ext}`, { type: mime });
}

/* Ảnh: nén trước rồi tải lên máy chủ. Tệp khác: tải nguyên bản lên máy chủ.
   File thật nằm trong /uploads trên máy chủ (không phải base64 trong trình duyệt nữa). */
async function importToLibrary(file) {
  const isImage = file.type.startsWith("image/");
  if (!isImage && file.size > 100 * 1024 * 1024)
    throw new Error(`Tệp "${file.name}" vượt quá 100MB.`);

  let uploadFile = file;
  if (isImage) uploadFile = dataUrlToFile(await shrinkImage(await readAsDataURL(file)), file.name);

  const fd = new FormData();
  fd.append("file", uploadFile, uploadFile.name);
  const r = await Api.postForm("upload.php", fd);

  const rec = {
    id: r.id, name: r.name, type: uploadFile.type || file.type,
    size: r.size, uploadedAt: new Date().toISOString(), dataUrl: r.url,
  };
  Store._cache.files.unshift(rec);
  return rec;
}

document.getElementById("file-pick-input").onchange = async (ev) => {
  const files = [...ev.target.files];
  if (!files.length) return;
  const recs = [];
  for (const f of files) {
    try { recs.push(await importToLibrary(f)); }
    catch (e) { toast(e.message, true); }
  }
  if (recs.length) toast(`Đã nhận ${recs.length} tệp vào Kho tệp.`);
  renderFilesTable();
  if (filePickCb) { filePickCb(recs); filePickCb = null; }
};

function libUpload() { pickFile("*/*", true, null); }

function libImageOptions() {
  const imgs = Store.all("files").filter(f => f.type.startsWith("image/"));
  return `<option value="">🖼 Chọn ảnh từ kho tệp...</option>` +
    imgs.map(f => `<option value="${f.id}">${Fmt.esc(f.name)}</option>`).join("");
}

function libDownload(id) {
  const f = Store.get("files", id);
  if (!f) return;
  const a = document.createElement("a");
  a.href = f.dataUrl;
  a.download = f.name;
  a.click();
}

function renderFilesTable() {
  const list = [...Store.all("files")].sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || ""));
  document.getElementById("files-table").innerHTML = list.length ? `
    <table class="data">
      <thead><tr><th style="width:70px">Xem</th><th>Tên tệp</th><th>Loại</th><th>Dung lượng</th><th>Ngày nhận</th><th>Thao tác</th></tr></thead>
      <tbody>${list.map(f => `
        <tr>
          <td>${f.type.startsWith("image/")
            ? `<img src="${f.dataUrl}" style="width:52px;height:38px;object-fit:cover;border-radius:6px;border:1px solid var(--border)">`
            : `<span style="font-size:24px">📄</span>`}</td>
          <td><strong>${Fmt.esc(f.name)}</strong></td>
          <td style="font-size:12.5px;color:var(--muted)">${Fmt.esc(f.type)}</td>
          <td>${Fmt.bytes(f.size)}</td>
          <td>${Fmt.date(f.uploadedAt)}</td>
          <td><div class="row-actions">
            <button class="icon-btn" onclick="libDownload('${f.id}')">⬇️ Tải về</button>
            <button class="icon-btn danger" onclick="removeItem('files','${f.id}','tệp ${Fmt.esc(f.name)}')">🗑 Xóa</button>
          </div></td>
        </tr>`).join("")}</tbody>
    </table>` : `<div class="empty-note">Chưa có tệp nào. Bấm "Tải tệp lên" để nhận tệp vào kho.</div>`;
}

/* ================= ẢNH HERO (trình chiếu đầu trang chủ) ================= */
const HERO_PAGES = [
  ["dat-lich.html", "Đặt lịch khám"], ["dich-vu.html", "Bảng giá dịch vụ"],
  ["bac-si.html", "Đội ngũ bác sĩ"], ["khoa-phong.html", "Khoa phòng"],
  ["gioi-thieu.html", "Giới thiệu"], ["tin-tuc.html", "Tin tức"],
  ["lien-he.html", "Liên hệ"], ["index.html", "Trang chủ"]
];
const HERO_POS = [
  ["center 30%", "Mặc định (hơi lệch trên)"], ["center 20%", "Lấy phần trên"],
  ["center 50%", "Lấy phần giữa"], ["center 70%", "Lấy phần dưới"]
];

function heroLinkOptions(selected) {
  return `<option value="">— Không gắn nút —</option>` +
    HERO_PAGES.map(([v, l]) => `<option value="${v}" ${v === selected ? "selected" : ""}>${l}</option>`).join("");
}
function heroPosOptions(selected) {
  return HERO_POS.map(([v, l]) => `<option value="${v}" ${v === selected ? "selected" : ""}>${l}</option>`).join("");
}

function renderHeroTable() {
  const list = Store.all("hero");
  document.getElementById("hero-table").innerHTML = list.length ? `
    <table class="data">
      <thead><tr><th style="width:130px">Ảnh</th><th>Nội dung</th><th style="width:150px">Nút bấm</th><th style="width:170px">Thao tác</th></tr></thead>
      <tbody>${list.map((h, i) => `
        <tr>
          <td><div style="width:112px;height:46px;border-radius:6px;border:1px solid var(--border);background:#0a3a3f center/cover no-repeat url('${Fmt.esc(h.image)}');background-position:${Fmt.esc(h.position || "center 30%")}"></div></td>
          <td><strong>${Fmt.esc(h.title)}</strong><div style="font-size:12.5px;color:var(--muted);margin-top:3px">${Fmt.esc((h.subtitle || "").slice(0, 90))}${(h.subtitle || "").length > 90 ? "…" : ""}</div></td>
          <td style="font-size:12.5px">${h.btn1Text ? `▸ ${Fmt.esc(h.btn1Text)}<br>` : ""}${h.btn2Text ? `▸ ${Fmt.esc(h.btn2Text)}` : ""}${!h.btn1Text && !h.btn2Text ? '<span style="color:var(--muted)">—</span>' : ""}</td>
          <td><div class="row-actions">
            <button class="icon-btn" onclick="moveHero('${h.id}',-1)" ${i === 0 ? "disabled" : ""} title="Lên">⬆️</button>
            <button class="icon-btn" onclick="moveHero('${h.id}',1)" ${i === list.length - 1 ? "disabled" : ""} title="Xuống">⬇️</button>
            <button class="icon-btn" onclick="openHeroModal('${h.id}')">✏️ Sửa</button>
            <button class="icon-btn danger" onclick="removeItem('hero','${h.id}','ảnh hero này')">🗑</button>
          </div></td>
        </tr>`).join("")}</tbody>
    </table>` : `<div class="empty-note">Chưa có ảnh hero nào. Bấm "Thêm ảnh" để tạo slide đầu tiên.</div>`;
}

function moveHero(id, dir) {
  const arr = Store.all("hero");
  const i = arr.findIndex(h => h.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  Store.reorder("hero", arr.map(h => h.id));
  renderHeroTable();
}

function openHeroModal(id) {
  const h = id ? Store.get("hero", id) : {};
  openModal(id ? "Sửa ảnh Hero" : "Thêm ảnh Hero", `
    <div class="form-grid">
      ${photoFieldHTML("image", "Ảnh nền — tải lên rồi cắt/căn vị trí cho vừa khung ngang", h.image)}
      <div><label class="fld">Vị trí hiển thị ảnh</label>
        <select name="position">${heroPosOptions(h.position || "center 30%")}</select></div>
      <div></div>
      ${fld("Tiêu đề lớn", "title", h.title || "", { required: true, full: true, placeholder: "Tận tâm chăm sóc sức khỏe nhân dân..." })}
      ${fld("Mô tả ngắn", "subtitle", h.subtitle || "", { type: "textarea", rows: 2, full: true })}
      ${fld("Chữ trên nút 1", "btn1Text", h.btn1Text || "", { placeholder: "Đặt lịch khám ngay" })}
      <div><label class="fld">Nút 1 dẫn tới trang</label>
        <select name="btn1Link">${heroLinkOptions(h.btn1Link || "dat-lich.html")}</select></div>
      ${fld("Chữ trên nút 2", "btn2Text", h.btn2Text || "", { placeholder: "Xem bảng giá dịch vụ" })}
      <div><label class="fld">Nút 2 dẫn tới trang</label>
        <select name="btn2Link">${heroLinkOptions(h.btn2Link || "dich-vu.html")}</select></div>
    </div>`,
    (f) => {
      const data = {
        image: f.get("image").trim(),
        position: f.get("position"),
        title: f.get("title").trim(),
        subtitle: f.get("subtitle").trim(),
        btn1Text: f.get("btn1Text").trim(), btn1Link: f.get("btn1Link"),
        btn2Text: f.get("btn2Text").trim(), btn2Link: f.get("btn2Link")
      };
      if (!data.image) { toast("Hãy tải ảnh nền cho hero.", true); return; }
      id ? Store.update("hero", id, data) : Store.add("hero", data);
      toast(id ? "Đã cập nhật ảnh hero." : "Đã thêm ảnh hero.");
      closeModal(); renderHeroTable();
    });
}

/* ================= BÁC SĨ TIÊU BIỂU (trang chủ) ================= */
function featuredIds() {
  const ids = Store.settings().featuredDoctors || [];
  // Bỏ id của bác sĩ đã xóa
  return ids.filter(id => Store.get("doctors", id));
}
function saveFeatured(ids) { Store.saveSettings({ featuredDoctors: ids }); }

function renderFeaturedTable() {
  const wrap = document.getElementById("featured-table");
  if (!wrap) return;
  const ids = featuredIds();
  const docs = ids.map(id => Store.get("doctors", id));

  // Ô chọn thêm: các bác sĩ chưa nằm trong danh sách
  const sel = document.getElementById("feat-add-select");
  if (sel) {
    const rest = Store.all("doctors").filter(d => !ids.includes(d.id));
    sel.innerHTML = `<option value="">— Chọn bác sĩ để thêm —</option>` +
      rest.map(d => `<option value="${d.id}">${Fmt.esc(d.name)}${d.position ? " — " + Fmt.esc(d.position) : ""}</option>`).join("");
  }
  const countEl = document.getElementById("feat-count");
  if (countEl) countEl.textContent = `${docs.length} bác sĩ · ${Math.ceil(docs.length / 4) || 0} slide (4 bác sĩ/slide)`;

  wrap.innerHTML = docs.length ? `
    <table class="data">
      <thead><tr><th style="width:56px">#</th><th>Bác sĩ</th><th>Chức danh</th><th style="width:170px">Thao tác</th></tr></thead>
      <tbody>${docs.map((d, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${Fmt.esc(d.name)}</strong></td>
          <td style="font-size:13px">${Fmt.esc(d.position || "—")}</td>
          <td><div class="row-actions">
            <button class="icon-btn" onclick="featMove('${d.id}',-1)" ${i === 0 ? "disabled" : ""} title="Lên">⬆️</button>
            <button class="icon-btn" onclick="featMove('${d.id}',1)" ${i === docs.length - 1 ? "disabled" : ""} title="Xuống">⬇️</button>
            <button class="icon-btn danger" onclick="featRemove('${d.id}')">🗑 Bỏ</button>
          </div></td>
        </tr>`).join("")}</tbody>
    </table>` : `<div class="empty-note">Chưa chọn bác sĩ tiêu biểu nào. Chọn bác sĩ ở ô trên rồi bấm "Thêm vào danh sách".</div>`;
}

function featAddSelected() {
  const sel = document.getElementById("feat-add-select");
  const id = sel.value;
  if (!id) { toast("Hãy chọn một bác sĩ để thêm.", true); return; }
  const ids = featuredIds();
  if (ids.includes(id)) return;
  ids.push(id);
  saveFeatured(ids);
  renderFeaturedTable();
  toast("Đã thêm vào danh sách tiêu biểu.");
}
function featRemove(id) {
  saveFeatured(featuredIds().filter(x => x !== id));
  renderFeaturedTable();
}
function featMove(id, dir) {
  const ids = featuredIds();
  const i = ids.indexOf(id), j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  saveFeatured(ids);
  renderFeaturedTable();
}

/* Xuất dòng cấu hình để dán vào data.js (settings) -> đưa danh sách này lên web thật */
function featCopyForPublish() {
  const ids = featuredIds();
  const names = ids.map(id => (Store.get("doctors", id) || {}).name).filter(Boolean).join(", ");
  const line = `    featuredDoctors: ${JSON.stringify(ids)},  // ${names}`;
  const done = () => toast("Đã sao chép dòng cấu hình. Dán vào data.js (mục settings) rồi commit để đưa lên web.");
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(line).then(done, () => prompt("Sao chép dòng dưới đây vào data.js (mục settings):", line));
  } else {
    prompt("Sao chép dòng dưới đây vào data.js (mục settings):", line);
  }
}

/* ================= QUẢN LÝ TÀI KHOẢN (chỉ tài khoản cấp cao) ================= */
function permLabels(perms) {
  if (!perms || !perms.length) return "—";
  return perms.map(p => {
    const g = GRANTABLE_PANELS.find(x => x[0] === p);
    return g ? g[1].replace(/^\S+\s/, "") : p;   // bỏ icon, giữ chữ
  }).join(", ");
}

function renderUsersTable() {
  const wrap = document.getElementById("users-table");
  if (!wrap) return;
  const me = currentUser() || {};
  const list = Store.all("users");
  wrap.innerHTML = `
    <table class="data">
      <thead><tr><th>Tài khoản</th><th>Họ tên</th><th>Vai trò</th><th>Được phép quản lý</th><th>Thao tác</th></tr></thead>
      <tbody>${list.map(u => {
        const isSuper = u.role === "superadmin";
        return `
        <tr>
          <td><strong>${Fmt.esc(u.username)}</strong>${u.username === me.username ? ' <span class="cell-sub">(bạn)</span>' : ""}</td>
          <td>${Fmt.esc(u.fullName || "")}</td>
          <td>${isSuper ? '<span class="badge badge-danger">Cấp cao</span>' : '<span class="badge badge-info">Tài khoản con</span>'}</td>
          <td style="font-size:12.5px">${isSuper ? "Toàn quyền" : Fmt.esc(permLabels(u.perms))}</td>
          <td><div class="row-actions">
            <button class="icon-btn" onclick="openUserModal('${u.id}')">✏️ ${isSuper ? "Đổi mật khẩu" : "Sửa"}</button>
            ${isSuper ? "" : `<button class="icon-btn danger" onclick="removeUser('${u.id}')">🗑</button>`}
          </div></td>
        </tr>`;
      }).join("")}</tbody>
    </table>`;
}

/** Nạp lại danh sách tài khoản từ máy chủ (sau khi tạo/sửa/xoá) */
async function reloadUsersCache() {
  const r = await Api.get("users.php");
  Store._cache.users = (r.users || []).map(u => ({
    id: u.id, username: u.username, fullName: u.full_name,
    role: u.role, perms: u.perms, isActive: u.is_active,
  }));
}

function openUserModal(id) {
  const editing = id ? Store.get("users", id) : null;
  const isSuper = editing && editing.role === "superadmin";
  const perms = (editing && editing.perms) || [];
  const permChecks = GRANTABLE_PANELS.map(([key, label]) =>
    `<label class="perm-item"><input type="checkbox" name="perm_${key}" ${perms.includes(key) ? "checked" : ""}> ${label}</label>`).join("");

  openModal(editing ? (isSuper ? "Đổi mật khẩu tài khoản cấp cao" : "Sửa tài khoản con") : "Tạo tài khoản con", `
    <div class="form-grid">
      ${editing
        ? `<div class="full"><label class="fld">Tên đăng nhập</label><input value="${Fmt.esc(editing.username)}" disabled></div>`
        : fld("Tên đăng nhập", "username", "", { required: true, full: true, placeholder: "vd: bientap01" })}
      ${fld("Họ tên hiển thị", "fullName", editing ? (editing.fullName || "") : "", { full: true })}
      ${fld("Mật khẩu" + (editing ? " (để trống nếu giữ nguyên)" : "") + " — tối thiểu 10 ký tự", "password", "",
        { type: "password", full: true, required: !editing })}
      ${isSuper ? "" : `
        <div class="full">
          <label class="fld">Cho phép tài khoản này quản lý các mục:</label>
          <div class="perm-grid">${permChecks}</div>
          <div class="form-note">Chỉ những mục được tích, tài khoản con mới thấy và sửa được. Cài đặt, Sao lưu, Tài khoản luôn thuộc riêng cấp cao.</div>
        </div>`}
    </div>`,
    async (f) => {
      const fullName = f.get("fullName").trim();
      const password = f.get("password");
      const perms = GRANTABLE_PANELS.filter(([k]) => f.get("perm_" + k)).map(([k]) => k);
      try {
        if (!editing) {
          const username = f.get("username").trim();
          if (!username) { toast("Nhập tên đăng nhập.", true); return; }
          if (!password) { toast("Nhập mật khẩu cho tài khoản con.", true); return; }
          await Api.post("users.php?action=create", { username, full_name: fullName, password, perms });
          toast("Đã tạo tài khoản con.");
        } else {
          const patch = { id: editing.id, full_name: fullName };
          if (!isSuper) patch.perms = perms;   // không đổi quyền tài khoản cấp cao
          await Api.post("users.php?action=update", patch);
          if (password) await Api.post("users.php?action=reset-pw", { id: editing.id, password });
          toast("Đã cập nhật tài khoản.");
        }
        await reloadUsersCache();
        closeModal();
        renderUsersTable();
      } catch (e) {
        toast(e.message, true);
      }
    });
}

async function removeUser(id) {
  const u = Store.get("users", id);
  if (!u) return;
  if (u.role === "superadmin") { toast("Không thể xóa tài khoản cấp cao.", true); return; }
  if (u.username === (currentUser() || {}).username) { toast("Không thể xóa tài khoản đang đăng nhập.", true); return; }
  if (!confirm(`Xóa tài khoản "${u.username}"?`)) return;
  try {
    await Api.post("users.php?action=delete", { id });
    await reloadUsersCache();
    toast("Đã xóa tài khoản.");
    renderUsersTable();
  } catch (e) {
    toast(e.message, true);
  }
}

/* ================= BÁC SĨ ================= */
function renderDoctorTable() {
  const list = Store.all("doctors");
  document.getElementById("doctor-table").innerHTML = list.length ? `
    <table class="data">
      <thead><tr><th>Họ tên</th><th>Khoa</th><th>Chức vụ</th><th>KN</th><th>Lịch khám</th><th>Thao tác</th></tr></thead>
      <tbody>${list.map(d => `
        <tr>
          <td>
            <div style="display:flex;gap:10px;align-items:center">
              ${d.avatar
                ? `<img src="${Fmt.esc(d.avatar)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid var(--border);flex-shrink:0">`
                : `<span style="width:36px;height:36px;border-radius:50%;background:${Fmt.avatarColor(d.name)};color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0">${Fmt.initials(d.name)}</span>`}
              <div><strong>${Fmt.esc(d.title)}. ${Fmt.esc(d.name)}</strong><div class="cell-sub">📞 ${Fmt.esc(d.phone || "")}</div></div>
            </div>
          </td>
          <td>${Fmt.esc(deptName(d.dept))}</td>
          <td>${Fmt.esc(d.position)}</td>
          <td>${d.exp} năm</td>
          <td style="font-size:13px">${Fmt.esc(d.schedule)}</td>
          <td><div class="row-actions">
            <button class="icon-btn" onclick="openDoctorModal('${d.id}')">✏️ Sửa</button>
            <button class="icon-btn danger" onclick="removeItem('doctors','${d.id}','bác sĩ ${Fmt.esc(d.name)}')">🗑 Xóa</button>
          </div></td>
        </tr>`).join("")}</tbody>
    </table>` : `<div class="empty-note">Chưa có bác sĩ nào.</div>`;
}

function openDoctorModal(id) {
  const d = id ? Store.get("doctors", id) : {};
  openModal(id ? "Sửa thông tin bác sĩ" : "Thêm bác sĩ mới", `
    <div class="form-grid">
      ${fld("Họ và tên", "name", d.name || "", { required: true })}
      ${fld("Học hàm/chức danh (BS, BSCKI, ThS.BS...)", "title", d.title || "", { required: true, placeholder: "BSCKI" })}
      <div><label class="fld">Khoa <span class="req">*</span></label>
        <select name="dept" required>${deptOptions(d.dept)}</select></div>
      ${fld("Chức vụ", "position", d.position || "", { placeholder: "Bác sĩ điều trị" })}
      ${fld("Điện thoại", "phone", d.phone || "")}
      ${fld("Lịch khám", "schedule", d.schedule || "", { full: true, placeholder: "Thứ 2 - Thứ 6" })}
      ${photoFieldHTML("avatar", "Ảnh đại diện — ảnh tròn trên thẻ thông tin", d.avatar)}
      ${photoFieldHTML("photo", "Ảnh mở rộng — phủ toàn thẻ khi trỏ/click (trang chủ)", d.photo)}
      ${fld("Giới thiệu ngắn", "intro", d.intro || "", { type: "textarea", rows: 3, full: true })}
    </div>`,
    (f) => {
      const data = {
        name: f.get("name").trim(), title: f.get("title").trim(), dept: f.get("dept"),
        position: f.get("position").trim(),
        phone: f.get("phone").trim(), schedule: f.get("schedule").trim(),
        avatar: f.get("avatar").trim(), photo: f.get("photo").trim(),
        intro: f.get("intro").trim()
      };
      id ? Store.update("doctors", id, data) : Store.add("doctors", data);
      toast(id ? "Đã cập nhật bác sĩ." : "Đã thêm bác sĩ mới.");
      closeModal(); renderAll();
    });
}

/* ================= TRƯỜNG ẢNH CÓ CHỈNH SỬA (avatar tròn / ảnh fill thẻ) ================= */
const PP_CONF = {
  avatar: { mode: "avatar", empty: "👤" },  // 1:1, mặt nạ tròn
  photo:  { mode: "card",   empty: "🖼" },  // 3:4, phủ toàn thẻ
  image:  { mode: "hero",   empty: "🖼" }   // ~2.5:1, ảnh hero ngang
};

function photoFieldHTML(key, label, value) {
  const conf = PP_CONF[key];
  return `
    <div class="full">
      <label class="fld">${label}</label>
      <div class="photo-picker">
        <div class="pp-preview ${conf.mode === "avatar" ? "pp-round" : ""}" id="pp-prev-${key}">
          ${value ? `<img src="${Fmt.esc(value)}">` : conf.empty}
        </div>
        <div class="pp-actions">
          <button type="button" class="icon-btn" onclick="ppPick('${key}')">📤 Tải ảnh từ máy</button>
          <select onchange="ppFromLib('${key}', this)" style="max-width:200px">${libImageOptions()}</select>
          <button type="button" class="icon-btn" onclick="ppEdit('${key}')">✂️ Chỉnh sửa</button>
          <button type="button" class="icon-btn danger" onclick="ppSet('${key}','')">🗑</button>
        </div>
      </div>
      <input type="hidden" name="${key}" id="pp-in-${key}" value="${Fmt.esc(value || "")}">
    </div>`;
}

function ppSet(key, src) {
  document.getElementById("pp-in-" + key).value = src;
  document.getElementById("pp-prev-" + key).innerHTML =
    src ? `<img src="${src}">` : PP_CONF[key].empty;
}
function ppPick(key) {
  pickFile("image/*", false, recs => {
    if (recs[0]) cropOpen(recs[0].dataUrl, PP_CONF[key].mode, url => ppSet(key, url));
  });
}
function ppFromLib(key, sel) {
  const f = Store.get("files", sel.value);
  sel.value = "";
  if (f) cropOpen(f.dataUrl, PP_CONF[key].mode, url => ppSet(key, url));
}
function ppEdit(key) {
  const src = document.getElementById("pp-in-" + key).value;
  if (!src) { toast("Chưa có ảnh để chỉnh sửa — hãy tải ảnh lên trước.", true); return; }
  cropOpen(src, PP_CONF[key].mode, url => ppSet(key, url));
}

/* ================= TRÌNH CHỈNH SỬA ẢNH (kéo + zoom, kiểu mạng xã hội) =================
   mode "avatar": khung vuông + mặt nạ tròn, xuất 400x400
   mode "card":   khung 3:4 (đúng tỉ lệ thẻ bác sĩ), xuất 600x800
   mode "hero":   khung ngang ~2.5:1 (ảnh đầu trang chủ), xuất 1600x640 */
let Crop = null;

const CROP_VP = {
  avatar: { vw: 300, vh: 300 },
  card:   { vw: 285, vh: 380 },
  hero:   { vw: 380, vh: 152 }
};

function cropOpen(src, mode, cb) {
  const im = new Image();
  im.onload = () => {
    const vp0 = CROP_VP[mode] || CROP_VP.card;
    const vw = vp0.vw;
    const vh = vp0.vh;
    Crop = { mode, vw, vh, natW: im.naturalWidth, natH: im.naturalHeight, cb, zoom: 1 };
    Crop.cover = Math.max(vw / Crop.natW, vh / Crop.natH); // zoom 100% = ảnh vừa phủ kín khung
    const s = Crop.cover;
    Crop.left = (vw - Crop.natW * s) / 2;
    Crop.top = (vh - Crop.natH * s) / 2;

    const vp = document.getElementById("crop-viewport");
    vp.style.width = vw + "px";
    vp.style.height = vh + "px";
    document.getElementById("crop-mask").style.display = mode === "avatar" ? "" : "none";
    document.getElementById("crop-title").textContent =
      mode === "avatar" ? "Chỉnh sửa ảnh đại diện"
      : mode === "hero" ? "Cắt & căn vị trí ảnh Hero"
      : "Chỉnh sửa ảnh mở rộng";
    document.getElementById("crop-img").src = src;
    document.getElementById("crop-zoom").value = 100;
    cropRender();
    document.getElementById("crop-overlay").classList.add("open");
  };
  im.onerror = () => toast("Không tải được ảnh.", true);
  im.src = src;
}

function cropScale() { return Crop.cover * Crop.zoom; }

function cropRender() {
  // Giữ ảnh luôn phủ kín khung (không lộ nền)
  const s = cropScale(), dw = Crop.natW * s, dh = Crop.natH * s;
  Crop.left = Math.min(0, Math.max(Crop.vw - dw, Crop.left));
  Crop.top = Math.min(0, Math.max(Crop.vh - dh, Crop.top));
  const ci = document.getElementById("crop-img");
  ci.style.width = dw + "px";
  ci.style.height = dh + "px";
  ci.style.left = Crop.left + "px";
  ci.style.top = Crop.top + "px";
}

function cropZoomTo(zoom) {
  // Phóng to quanh tâm khung nhìn
  const s0 = cropScale();
  const cx = (Crop.vw / 2 - Crop.left) / s0;
  const cy = (Crop.vh / 2 - Crop.top) / s0;
  Crop.zoom = zoom;
  const s1 = cropScale();
  Crop.left = Crop.vw / 2 - cx * s1;
  Crop.top = Crop.vh / 2 - cy * s1;
  cropRender();
}

const CROP_OUT = {
  avatar: { w: 400,  h: 400 },
  card:   { w: 600,  h: 800 },
  hero:   { w: 1600, h: 640 }
};

function cropApply() {
  if (!Crop) return;                       // không có ảnh đang cắt -> bỏ qua an toàn
  const s = cropScale();
  const out = CROP_OUT[Crop.mode] || CROP_OUT.card;
  const outW = out.w;
  const outH = out.h;
  const c = document.createElement("canvas");
  c.width = outW; c.height = outH;
  let url;
  try {
    c.getContext("2d").drawImage(
      document.getElementById("crop-img"),
      -Crop.left / s, -Crop.top / s, Crop.vw / s, Crop.vh / s,
      0, 0, outW, outH);
    url = c.toDataURL("image/jpeg", 0.85);
  } catch (e) {
    // Xảy ra khi mở trang bằng file:// rồi cắt ảnh có sẵn (ảnh nền mẫu) -> canvas bị "nhiễm bẩn".
    // Ảnh tự tải lên từ máy (dạng dữ liệu) không bị lỗi này.
    toast("Không cắt được ảnh này khi mở bằng file://. Hãy bấm 'Tải ảnh từ máy' để chọn ảnh mới, hoặc chạy website qua máy chủ.", true);
    return;                                // giữ nguyên khung cắt để bấm Hủy hoặc thử ảnh khác
  }
  document.getElementById("crop-overlay").classList.remove("open");
  const cb = Crop.cb;
  Crop = null;
  cb(url);
}

function cropCancel() {
  document.getElementById("crop-overlay").classList.remove("open");
  Crop = null;
}

/* Kéo ảnh + lăn chuột để zoom */
(() => {
  const vp = document.getElementById("crop-viewport");
  const zoomInp = document.getElementById("crop-zoom");
  let dragging = false, px = 0, py = 0;

  vp.addEventListener("pointerdown", (e) => {
    if (!Crop) return;
    dragging = true; px = e.clientX; py = e.clientY;
    vp.setPointerCapture(e.pointerId);
  });
  vp.addEventListener("pointermove", (e) => {
    if (!dragging || !Crop) return;
    Crop.left += e.clientX - px;
    Crop.top += e.clientY - py;
    px = e.clientX; py = e.clientY;
    cropRender();
  });
  vp.addEventListener("pointerup", () => { dragging = false; });
  vp.addEventListener("wheel", (e) => {
    if (!Crop) return;
    e.preventDefault();
    const v = Math.min(300, Math.max(100, Number(zoomInp.value) - Math.sign(e.deltaY) * 15));
    zoomInp.value = v;
    cropZoomTo(v / 100);
  }, { passive: false });
  zoomInp.addEventListener("input", () => { if (Crop) cropZoomTo(Number(zoomInp.value) / 100); });
})();

/* ================= KHOA PHÒNG ================= */
function renderDeptTable() {
  const list = Store.all("departments");
  document.getElementById("dept-table").innerHTML = `
    <table class="data">
      <thead><tr><th style="width:60px">Icon</th><th>Tên khoa</th><th>Mô tả</th><th>Thao tác</th></tr></thead>
      <tbody>${list.map(d => `
        <tr>
          <td style="font-size:22px">${d.icon}</td>
          <td><strong>${Fmt.esc(d.name)}</strong></td>
          <td style="font-size:13px">${Fmt.esc(d.desc)}</td>
          <td><div class="row-actions">
            <button class="icon-btn" onclick="openDeptModal('${d.id}')">✏️ Sửa</button>
            <button class="icon-btn danger" onclick="removeItem('departments','${d.id}','khoa ${Fmt.esc(d.name)}')">🗑 Xóa</button>
          </div></td>
        </tr>`).join("")}</tbody>
    </table>`;
}

function openDeptModal(id) {
  const d = id ? Store.get("departments", id) : {};
  openModal(id ? "Sửa khoa phòng" : "Thêm khoa phòng", `
    <div class="form-grid">
      ${fld("Tên khoa", "name", d.name || "", { required: true, full: true })}
      ${fld("Biểu tượng (emoji)", "icon", d.icon || "🏥", { placeholder: "🩺" })}
      ${fld("Mô tả", "desc", d.desc || "", { type: "textarea", rows: 3, full: true })}
    </div>`,
    (f) => {
      const data = { name: f.get("name").trim(), icon: f.get("icon").trim() || "🏥", desc: f.get("desc").trim() };
      id ? Store.update("departments", id, data) : Store.add("departments", data);
      toast(id ? "Đã cập nhật khoa phòng." : "Đã thêm khoa phòng.");
      closeModal(); renderAll();
    });
}

/* ================= DỊCH VỤ ================= */
function renderServiceTable() {
  const list = Store.all("services");
  document.getElementById("svc-table").innerHTML = list.length ? `
    <table class="data">
      <thead><tr><th>Mã</th><th>Nhóm</th><th>Tên dịch vụ</th><th>Đơn giá</th><th>BHYT</th><th>Thao tác</th></tr></thead>
      <tbody>${list.map(s => `
        <tr>
          <td>${Fmt.esc(s.code)}</td>
          <td style="font-size:13px">${Fmt.esc(s.group)}</td>
          <td>${Fmt.esc(s.name)}${s.note ? `<div class="cell-sub">${Fmt.esc(s.note)}</div>` : ""}</td>
          <td class="price">${Fmt.money(s.price)}</td>
          <td>${s.bhyt ? '<span class="badge badge-ok">Có</span>' : '<span class="badge badge-warn">Không</span>'}</td>
          <td><div class="row-actions">
            <button class="icon-btn" onclick="openServiceModal('${s.id}')">✏️ Sửa</button>
            <button class="icon-btn danger" onclick="removeItem('services','${s.id}','dịch vụ ${Fmt.esc(s.name)}')">🗑 Xóa</button>
          </div></td>
        </tr>`).join("")}</tbody>
    </table>` : `<div class="empty-note">Chưa có dịch vụ nào.</div>`;
}

function openServiceModal(id) {
  const s = id ? Store.get("services", id) : {};
  openModal(id ? "Sửa dịch vụ" : "Thêm dịch vụ mới", `
    <div class="form-grid">
      ${fld("Mã dịch vụ", "code", s.code || "", { required: true, placeholder: "KB01" })}
      ${fld("Nhóm dịch vụ", "group", s.group || "", { required: true, placeholder: "Khám bệnh / Xét nghiệm..." })}
      ${fld("Tên dịch vụ", "name", s.name || "", { required: true, full: true })}
      ${fld("Đơn giá (VNĐ)", "price", s.price ?? "", { type: "number", required: true })}
      <div><label class="fld">BHYT chi trả</label>
        <select name="bhyt">
          <option value="1" ${s.bhyt ? "selected" : ""}>Có</option>
          <option value="0" ${s.bhyt === false ? "selected" : ""}>Không (dịch vụ)</option>
        </select></div>
      ${fld("Ghi chú", "note", s.note || "", { full: true })}
    </div>`,
    (f) => {
      const data = {
        code: f.get("code").trim(), group: f.get("group").trim(), name: f.get("name").trim(),
        price: Number(f.get("price")) || 0, bhyt: f.get("bhyt") === "1", note: f.get("note").trim()
      };
      id ? Store.update("services", id, data) : Store.add("services", data);
      toast(id ? "Đã cập nhật dịch vụ." : "Đã thêm dịch vụ.");
      closeModal(); renderAll();
    });
}

/* ================= TIN TỨC ================= */
function renderNewsTable() {
  const list = [...Store.all("news")].sort((a, b) => b.date.localeCompare(a.date));
  document.getElementById("news-table").innerHTML = list.length ? `
    <table class="data">
      <thead><tr><th>Ngày</th><th>Chuyên mục</th><th>Tiêu đề</th><th>Thao tác</th></tr></thead>
      <tbody>${list.map(n => `
        <tr>
          <td style="white-space:nowrap">${Fmt.date(n.date)}</td>
          <td><span class="badge badge-info">${Fmt.esc(n.cat)}</span></td>
          <td><strong>${Fmt.esc(n.title)}</strong><div class="cell-sub">${Fmt.esc(n.summary)}</div></td>
          <td><div class="row-actions">
            <button class="icon-btn" onclick="window.open('tin-tuc.html?id=${n.id}','_blank')">👁 Xem</button>
            <button class="icon-btn" onclick="openNewsModal('${n.id}')">✏️ Sửa</button>
            <button class="icon-btn danger" onclick="removeItem('news','${n.id}','bài viết này')">🗑 Xóa</button>
          </div></td>
        </tr>`).join("")}</tbody>
    </table>` : `<div class="empty-note">Chưa có bài viết nào.</div>`;
}

/* Bản nháp bài viết đang soạn trong modal: các phần (section) + tệp đính kèm */
let newsDraft = { sections: [], attachments: [] };

function openNewsModal(id) {
  const n = id ? Store.get("news", id) : {};
  const cats = NEWS_CATEGORIES;

  // Bài cũ chỉ có content dạng text -> chuyển thành 1 phần để sửa tiếp
  newsDraft = {
    sections: n.sections ? JSON.parse(JSON.stringify(n.sections))
      : [{ heading: "", body: n.content || "", image: "" }],
    attachments: n.attachments ? JSON.parse(JSON.stringify(n.attachments)) : []
  };

  openModal(id ? "Sửa bài viết" : "Viết bài mới", `
    <div class="form-grid">
      ${fld("Tiêu đề", "title", n.title || "", { required: true, full: true })}
      <div><label class="fld">Chuyên mục</label>
        <select name="cat">${cats.map(c => `<option ${n.cat === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
      ${fld("Ngày đăng", "date", n.date || new Date().toISOString().slice(0, 10), { type: "date", required: true })}
      ${fld("Tóm tắt (hiện ở danh sách tin)", "summary", n.summary || "", { type: "textarea", rows: 2, full: true })}
      <div class="full">
        <label class="fld">Nội dung bài viết — chia theo phần</label>
        <div id="ns-list"></div>
        <button type="button" class="btn btn-ghost btn-sm" onclick="nsAdd()">➕ Thêm phần mới</button>
      </div>
      <div class="full">
        <label class="fld">Tệp đính kèm (người đọc tải về ở cuối bài)</label>
        <div id="na-list" class="attach-chips"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">
          <button type="button" class="icon-btn" onclick="naUpload()">📤 Tải tệp lên</button>
          <select onchange="naFromLib(this)" style="max-width:240px">
            <option value="">📁 Chọn từ kho tệp...</option>
            ${Store.all("files").map(f => `<option value="${f.id}">${Fmt.esc(f.name)}</option>`).join("")}
          </select>
        </div>
      </div>
    </div>`,
    (f) => {
      const sections = newsDraft.sections
        .map(s => {
          const sec = { heading: s.heading.trim(), body: s.body.trim(), image: s.image };
          if (s.pdfPages && s.pdfPages.length) { sec.pdfPages = s.pdfPages; sec.pdfName = s.pdfName || ""; }
          if (s.embed) sec.embed = s.embed;
          return sec;
        })
        .filter(s => s.heading || s.body || s.image || s.embed || (s.pdfPages && s.pdfPages.length));
      if (!sections.length) { toast("Bài viết cần ít nhất một phần có nội dung.", true); return; }
      const data = {
        title: f.get("title").trim(), cat: f.get("cat"), date: f.get("date"),
        summary: f.get("summary").trim(),
        sections,
        attachments: newsDraft.attachments,
        // content dạng text giữ cho tương thích cũ (tìm kiếm, tóm tắt)
        content: sections.map(s => (s.heading ? s.heading + "\n" : "") + s.body).join("\n\n").trim()
      };
      id ? Store.update("news", id, data) : Store.add("news", data);
      toast(id ? "Đã cập nhật bài viết." : "Đã đăng bài mới.");
      closeModal(); renderAll();
    });

  nsRender();
  naRender();
}

/* ----- Trình soạn theo phần ----- */
function nsRender() {
  const wrap = document.getElementById("ns-list");
  if (!wrap) return;
  wrap.innerHTML = newsDraft.sections.map((s, i) => `
    <div class="ns-item">
      <div class="ns-head">
        <strong>Phần ${i + 1}</strong>
        <span class="row-actions">
          <button type="button" class="icon-btn" title="Chuyển lên" onclick="nsMove(${i},-1)" ${i === 0 ? "disabled" : ""}>↑</button>
          <button type="button" class="icon-btn" title="Chuyển xuống" onclick="nsMove(${i},1)" ${i === newsDraft.sections.length - 1 ? "disabled" : ""}>↓</button>
          <button type="button" class="icon-btn danger" title="Xóa phần" onclick="nsRemove(${i})">🗑</button>
        </span>
      </div>
      <input placeholder="Tiêu đề phần (không bắt buộc)" value="${Fmt.esc(s.heading)}"
             oninput="newsDraft.sections[${i}].heading = this.value">
      <textarea rows="4" placeholder="Nội dung phần này (mỗi đoạn cách nhau 1 dòng trống)..."
                oninput="newsDraft.sections[${i}].body = this.value">${Fmt.esc(s.body)}</textarea>
      <div class="ns-hint">💡 Tạo liên kết: bấm <strong>🔗 Chèn liên kết</strong>, hoặc gõ trực tiếp
        <code>[Chữ hiển thị](https://...)</code>. Dán link trần cũng tự thành liên kết.</div>
      <div class="ns-img-row">
        ${s.image ? `<img class="ns-thumb" src="${s.image}">` : ""}
        <button type="button" class="icon-btn" onclick="nsPickImage(${i})">📤 Ảnh minh họa</button>
        <select onchange="nsImageFromLib(${i}, this)" style="max-width:200px">${libImageOptions()}</select>
        ${s.image ? `<button type="button" class="icon-btn danger" onclick="nsSetImage(${i},'')">🗑 Bỏ ảnh</button>` : ""}
        <button type="button" class="icon-btn" onclick="nsPickPDF(${i})">📄 Chèn PDF (hiện thành ảnh)</button>
        <button type="button" class="icon-btn" onclick="nsAddLink(${i})">🔗 Chèn liên kết</button>
        <button type="button" class="icon-btn" onclick="nsToEmbed(${i})">📺 Nhúng khung xem (YouTube/Maps)</button>
      </div>
      ${s.embed ? `
        <div class="ns-embed-box">
          <span class="ns-embed-label">🔗 Đang nhúng trang:</span>
          <a href="${Fmt.esc(s.embed)}" target="_blank" rel="noopener">${Fmt.esc(s.embed)}</a>
          <button type="button" class="icon-btn danger" onclick="nsClearEmbed(${i})">🗑 Bỏ nhúng</button>
        </div>` : ""}
      ${(s.pdfPages && s.pdfPages.length) ? `
        <div class="ns-pdf-box">
          <span class="ns-pdf-name">📄 ${Fmt.esc(s.pdfName || "Tài liệu PDF")} — ${s.pdfPages.length} trang</span>
          <div class="ns-pdf-thumbs">${s.pdfPages.map(p => `<img src="${p}">`).join("")}</div>
          <button type="button" class="icon-btn danger" onclick="nsClearPDF(${i})">🗑 Bỏ PDF</button>
        </div>` : ""}
    </div>`).join("");
}
function nsAdd() {
  newsDraft.sections.push({ heading: "", body: "", image: "" });
  nsRender();
}
function nsRemove(i) {
  if (newsDraft.sections.length === 1) { toast("Bài viết cần ít nhất một phần.", true); return; }
  newsDraft.sections.splice(i, 1);
  nsRender();
}
function nsMove(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= newsDraft.sections.length) return;
  [newsDraft.sections[i], newsDraft.sections[j]] = [newsDraft.sections[j], newsDraft.sections[i]];
  nsRender();
}
function nsSetImage(i, src) { newsDraft.sections[i].image = src; nsRender(); }
function nsPickImage(i) {
  pickFile("image/*", false, recs => { if (recs[0]) nsSetImage(i, recs[0].dataUrl); });
}
function nsImageFromLib(i, sel) {
  const f = Store.get("files", sel.value);
  if (f) nsSetImage(i, f.dataUrl); else sel.value = "";
}

/* ----- Chèn PDF: chuyển từng trang PDF thành ảnh JPEG để hiển thị trên trang ----- */
const PDF_MAX_PAGES = 20;   // giới hạn số trang để tránh đầy bộ nhớ trình duyệt

function nsClearPDF(i) {
  delete newsDraft.sections[i].pdfPages;
  delete newsDraft.sections[i].pdfName;
  nsRender();
}

/* ----- Chèn liên kết: biến chữ thành đường link bấm vào chuyển trang -----
   Lưu dưới dạng [Chữ hiển thị](đường dẫn); trang công khai sẽ hiện thành link. */
const INTERNAL_PAGES = [
  ["dat-lich.html", "Đặt lịch khám"], ["dich-vu.html", "Bảng giá dịch vụ"],
  ["bac-si.html", "Đội ngũ bác sĩ"], ["khoa-phong.html", "Khoa phòng"],
  ["gioi-thieu.html", "Giới thiệu"], ["tin-tuc.html", "Tin tức"], ["lien-he.html", "Liên hệ"]
];

function nsAddLink(i) {
  const sec = newsDraft.sections[i];
  const goi = INTERNAL_PAGES.map((p, k) => `${k + 1}. ${p[1]}`).join("\n");
  let url = (prompt(
    "Dán đường dẫn cần liên kết tới.\n" +
    "• Trang ngoài: dán đầy đủ https://...\n" +
    "• Trang trong website: gõ số tương ứng\n" + goi,
    findUrl(sec.body) || "https://") || "").trim();
  if (!url) return;

  const pick = INTERNAL_PAGES[Number(url) - 1];      // cho phép gõ 1..7 chọn trang nội bộ
  if (pick) url = pick[0];

  if (!/^https?:\/\//i.test(url) && !/^[\w\-./]+\.html([?#].*)?$/i.test(url)) {
    toast("Đường dẫn không hợp lệ. Dùng https://... hoặc trang nội bộ dạng tin-tuc.html", true);
    return;
  }

  const label = (prompt("Chữ hiển thị cho liên kết (người đọc bấm vào chữ này):",
    pick ? pick[1] : "Xem chi tiết tại đây") || "").trim();
  if (!label) return;

  const snippet = `[${label}](${url})`;
  // Nếu đoạn văn đang chứa đúng đường dẫn đó thì thay thế, không thì nối vào cuối
  sec.body = (sec.body || "").includes(url)
    ? sec.body.replace(url, snippet)
    : ((sec.body || "").trim() ? sec.body.trim() + " " + snippet : snippet);
  nsRender();
  toast("Đã chèn liên kết. Người đọc bấm vào chữ sẽ chuyển trang.");
}

/* ----- Nhúng khung xem: biến đường dẫn thành khung hiển thị trực tiếp (YouTube/Maps) ----- */
function findUrl(text) {
  const m = String(text || "").match(/https?:\/\/[^\s<>"')]+/i);
  return m ? m[0] : "";
}

/* Chuyển link xem thường -> link nhúng được (YouTube, Google Maps, Google Drive/Docs) */
function toEmbedUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      if (id) return "https://www.youtube.com/embed/" + id;
    }
    if (host.endsWith("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return "https://www.youtube.com/embed/" + id;
      if (u.pathname.startsWith("/embed/")) return u.href;
    }
    if (host.endsWith("google.com") && u.pathname.startsWith("/maps")) {
      if (!u.searchParams.get("output")) u.searchParams.set("output", "embed");
      return u.href;
    }
    if (host === "drive.google.com" || host === "docs.google.com") {
      return u.href.replace(/\/(view|edit)(\?.*)?$/, "/preview");
    }
    return u.href;
  } catch {
    return "";
  }
}

function nsToEmbed(i) {
  const sec = newsDraft.sections[i];
  let url = findUrl(sec.body);
  if (!url) {
    url = (prompt("Phần này chưa có đường dẫn trong nội dung.\nDán đường dẫn trang web cần nhúng:", "https://") || "").trim();
  }
  if (!url) return;

  const embed = toEmbedUrl(url);
  if (!embed || !/^https?:\/\//i.test(embed)) {
    toast("Đường dẫn không hợp lệ. Cần bắt đầu bằng http:// hoặc https://", true);
    return;
  }
  if (/^http:\/\//i.test(embed) &&
      !confirm("Đường dẫn dùng http:// (không bảo mật) nên trình duyệt có thể chặn hiển thị trong trang https.\nVẫn nhúng?")) return;

  sec.embed = embed;
  // Bỏ đường dẫn khỏi phần chữ vì nó đã trở thành khung nhúng
  const original = findUrl(sec.body);
  if (original) {
    sec.body = sec.body.replace(original, "")
      .replace(/[ \t]{2,}/g, " ")      // gộp khoảng trắng thừa chỗ vừa gỡ link
      .replace(/ +([.,;!?])/g, "$1")   // tránh dấu câu bị tách rời
      .replace(/\n{3,}/g, "\n\n").trim();
  }
  nsRender();
  toast("Đã chuyển đường dẫn thành khung nhúng trang web.");
}

function nsClearEmbed(i) {
  delete newsDraft.sections[i].embed;
  nsRender();
}

async function pdfToImages(dataUrl, maxW = 1000, quality = 0.7) {
  if (!window.pdfjsLib) throw new Error("Chưa tải được thư viện đọc PDF (pdf.js).");
  const data = atob(dataUrl.split(",")[1]);
  const bytes = new Uint8Array(data.length);
  for (let k = 0; k < data.length; k++) bytes[k] = data.charCodeAt(k);

  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const total = Math.min(pdf.numPages, PDF_MAX_PAGES);
  const pages = [];
  for (let p = 1; p <= total; p++) {
    const page = await pdf.getPage(p);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(2, maxW / base.width);   // nét vừa phải, không quá to
    const vp = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    pages.push(canvas.toDataURL("image/jpeg", quality));
  }
  return { pages, total: pdf.numPages };
}

/* Chọn 1 tệp trực tiếp (không lưu vào Kho tệp) — dùng cho PDF vì ta chỉ giữ ảnh đã render */
function pickRawFile(accept, cb) {
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = accept;
  inp.onchange = () => { if (inp.files[0]) cb(inp.files[0]); };
  inp.click();
}

function nsPickPDF(i) {
  pickRawFile("application/pdf", async (file) => {
    if (!/pdf$/i.test(file.type) && !/\.pdf$/i.test(file.name)) {
      toast("Hãy chọn tệp định dạng PDF.", true); return;
    }
    toast("Đang chuyển PDF thành ảnh, vui lòng chờ...");
    try {
      const dataUrl = await readAsDataURL(file);
      const { pages, total } = await pdfToImages(dataUrl);
      if (!pages.length) { toast("PDF không có trang nào.", true); return; }
      newsDraft.sections[i].pdfPages = pages;
      newsDraft.sections[i].pdfName = file.name;
      nsRender();
      toast(total > pages.length
        ? `Đã chèn ${pages.length}/${total} trang (giới hạn ${PDF_MAX_PAGES} trang).`
        : `Đã chèn ${pages.length} trang PDF.`);
    } catch (e) {
      toast("Không đọc được PDF: " + e.message, true);
    }
  });
}

/* ----- Tệp đính kèm ----- */
function naRender() {
  const wrap = document.getElementById("na-list");
  if (!wrap) return;
  wrap.innerHTML = newsDraft.attachments.length
    ? newsDraft.attachments.map((a, i) => `
        <span class="attach-chip">📄 ${Fmt.esc(a.name)}
          <button type="button" onclick="naRemove(${i})" title="Gỡ tệp">×</button>
        </span>`).join("")
    : `<span style="font-size:12.5px;color:var(--muted)">Chưa có tệp đính kèm.</span>`;
}
function naAdd(rec) {
  if (newsDraft.attachments.some(a => a.fileId === rec.id)) return;
  newsDraft.attachments.push({ fileId: rec.id, name: rec.name, src: rec.dataUrl });
  naRender();
}
function naUpload() {
  pickFile("*/*", true, recs => recs.forEach(naAdd));
}
function naFromLib(sel) {
  const f = Store.get("files", sel.value);
  if (f) naAdd(f);
  sel.value = "";
}
function naRemove(i) {
  newsDraft.attachments.splice(i, 1);
  naRender();
}

/* ================= CÀI ĐẶT ================= */
/* Các trường cài đặt CÓ hiển thị trên website (đúng thứ tự trong form).
   Chỉ liệt kê trường thực sự dùng — tránh tình trạng sửa xong không thấy đổi gì. */
const SETTING_FIELDS = ["siteName", "slogan", "address", "hotline", "hotlineDept",
                        "email", "workingHours", "announcement"];

/* Xuất khối settings để dán vào data.js -> đưa thay đổi lên web thật cho mọi người */
function settingsCopyForPublish() {
  const s = Store.settings();
  const lines = SETTING_FIELDS.map(k => `    ${k}: ${JSON.stringify(s[k] || "", null, 0)},`);
  const text = lines.join("\n");
  const done = () => toast("Đã sao chép. Dán vào data.js (mục settings) rồi commit để lên web thật.");
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, () => prompt("Sao chép đoạn dưới đây vào data.js (mục settings):", text));
  } else {
    prompt("Sao chép đoạn dưới đây vào data.js (mục settings):", text);
  }
}

function fillSettingsForms() {
  const s = Store.settings();
  const sf = document.getElementById("settings-form");
  for (const k of SETTING_FIELDS) sf.elements[k].value = s[k] || "";

  const hf = document.getElementById("his-form");
  hf.elements.mode.value = s.his.mode;
  hf.elements.endpoint.value = s.his.endpoint || "";
  hf.elements.apiKey.value = s.his.apiKey || "";
  hf.elements.facilityCode.value = s.his.facilityCode || "";

  aboutDraft = JSON.parse(JSON.stringify(s.aboutSections || []));
  renderAboutEditor();
}

/* ---------- Trình sửa nội dung trang Giới thiệu ---------- */
let aboutDraft = [];

function renderAboutEditor() {
  const wrap = document.getElementById("about-editor");
  if (!wrap) return;
  wrap.innerHTML = aboutDraft.map((s, i) => `
    <div class="ns-item">
      <div class="ns-head">
        <strong>Phần ${i + 1}</strong>
        <span class="row-actions">
          <button type="button" class="icon-btn" title="Chuyển lên" onclick="abMove(${i},-1)" ${i === 0 ? "disabled" : ""}>↑</button>
          <button type="button" class="icon-btn" title="Chuyển xuống" onclick="abMove(${i},1)" ${i === aboutDraft.length - 1 ? "disabled" : ""}>↓</button>
          <button type="button" class="icon-btn danger" title="Xóa phần" onclick="abRemove(${i})">🗑</button>
        </span>
      </div>
      <input placeholder="Tiêu đề phần (không bắt buộc)" value="${Fmt.esc(s.heading)}"
             oninput="aboutDraft[${i}].heading = this.value">
      <textarea rows="4" placeholder="Nội dung phần này..."
                oninput="aboutDraft[${i}].body = this.value">${Fmt.esc(s.body)}</textarea>
    </div>`).join("") ||
    `<div class="empty-note">Chưa có nội dung. Bấm "Thêm phần" để tạo.</div>`;
}
function abAdd() { aboutDraft.push({ heading: "", body: "" }); renderAboutEditor(); }
function abRemove(i) { aboutDraft.splice(i, 1); renderAboutEditor(); }
function abMove(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= aboutDraft.length) return;
  [aboutDraft[i], aboutDraft[j]] = [aboutDraft[j], aboutDraft[i]];
  renderAboutEditor();
}
function abSave() {
  const clean = aboutDraft
    .map(s => ({ heading: s.heading.trim(), body: s.body.trim() }))
    .filter(s => s.heading || s.body);
  Store.saveSettings({ aboutSections: clean });
  aboutDraft = JSON.parse(JSON.stringify(clean));
  renderAboutEditor();
  toast("Đã lưu nội dung trang Giới thiệu.");
}

document.getElementById("settings-form").onsubmit = (ev) => {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const patch = {};
  for (const [k, v] of f.entries()) patch[k] = v.trim();
  Store.saveSettings(patch);
  toast("Đã lưu thông tin website.");
};

document.getElementById("his-form").onsubmit = (ev) => {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const s = Store.settings();
  Store.saveSettings({
    his: {
      ...s.his,
      mode: f.get("mode"),
      endpoint: f.get("endpoint").trim(),
      apiKey: f.get("apiKey").trim(),
      facilityCode: f.get("facilityCode").trim()
    }
  });
  toast("Đã lưu cấu hình HIS.");
};

document.getElementById("btn-test-his").onclick = async () => {
  const out = document.getElementById("his-test-result");
  out.textContent = "⏳ Đang kiểm tra...";
  out.style.color = "var(--muted)";
  try {
    const r = await HIS.checkConnection();
    out.textContent = "✅ " + r.message + (r.version ? ` (${r.version})` : "");
    out.style.color = "var(--green)";
  } catch (e) {
    out.textContent = "❌ Kết nối thất bại: " + e.message;
    out.style.color = "var(--red)";
  }
};

/* ================= SAO LƯU ================= */
document.getElementById("btn-export").onclick = () => {
  const blob = new Blob([Store.export()], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `ttyt-sonduong-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Đã xuất file sao lưu.");
};

document.getElementById("import-file").onchange = (ev) => {
  ev.target.value = "";
  toast("Nhập từ file JSON đã tắt trên bản chính thức (an toàn dữ liệu thật). "
      + "Sửa từng mục trong các trang quản lý, hoặc nhờ hỗ trợ kỹ thuật nếu cần khôi phục hàng loạt.", true);
};

document.getElementById("btn-reset").onclick = () => {
  toast("Chức năng khôi phục dữ liệu mẫu đã tắt trên bản chính thức (an toàn dữ liệu thật).", true);
};

/* ================= RENDER TỔNG ================= */
function renderAll() {
  renderDashboard();
  renderAppointments();
  renderDoctorTable();
  renderFeaturedTable();
  renderDeptTable();
  renderServiceTable();
  renderNewsTable();
  renderHeroTable();
  renderFilesTable();
  renderUsersTable();
}

/* ================= KHỞI CHẠY ================= */
document.addEventListener("DOMContentLoaded", async () => {
  const me = await refreshSession();     // hỏi máy chủ xem cookie phiên còn hợp lệ không
  if (me) showAdmin();                   // showAdmin() tự tải dữ liệu (Store.loadAll) rồi mới hiện giao diện
});
