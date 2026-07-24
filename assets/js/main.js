/* ============================================================
   TTYT KHU VỰC SƠN DƯƠNG - JS TRANG CÔNG KHAI
   Header/footer dùng chung được render tại đây; mỗi trang khai
   báo <body data-page="..."> để chạy phần render riêng.
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
function doctorName(id) { const d = Store.get("doctors", id);     return d ? `${d.title}. ${d.name}` : "—"; }

/* ---------------- HEADER / FOOTER CHUNG ---------------- */
function renderLayout(activePage) {
  const s = Store.settings();
  const nav = [
    ["index.html",      "Trang chủ",     "home"],
    ["gioi-thieu.html", "Giới thiệu",    "about"],
    ["khoa-phong.html", "Khoa phòng",    "departments"],
    ["bac-si.html",     "Đội ngũ bác sĩ","doctors"],
    ["dich-vu.html",    "Bảng giá dịch vụ", "services"],
    ["tin-tuc.html",    "Tin tức",       "news"],
    ["lien-he.html",    "Liên hệ",       "contact"]
  ];

  document.getElementById("site-header").innerHTML = `
    <div class="topbar">
      <div class="container">
        <span>🕐 ${Fmt.esc(s.workingHours)}</span>
        <span>✉️ <a href="mailto:${Fmt.esc(s.email)}">${Fmt.esc(s.email)}</a> &nbsp;|&nbsp; <a href="admin.html">Quản trị</a></span>
      </div>
    </div>
    <div class="container header-main">
      <img src="img/logo.jpg" alt="Logo ${Fmt.esc(s.siteName)}" class="logo-img">
      <div class="brand">
        <h1>${Fmt.esc(s.siteName)}</h1>
        <p>${Fmt.esc(s.slogan)}</p>
      </div>
      <div class="header-cta">
        <a href="dat-lich.html" class="btn btn-primary header-book ${activePage === "booking" ? "active" : ""}">📅 Đặt lịch khám</a>
      </div>
    </div>
    <nav class="main-nav">
      <div class="container" style="display:flex;align-items:center">
        <button class="nav-toggle" onclick="document.getElementById('nav-menu').classList.toggle('open')">☰ Menu</button>
        <ul id="nav-menu">
          ${nav.map(([href, label, key]) =>
            `<li><a href="${href}" class="${key === activePage ? "active" : ""}">${label}</a></li>`).join("")}
        </ul>
      </div>
    </nav>
    ${s.announcement ? `<div class="announce"><span>📢 ${Fmt.esc(s.announcement)}</span></div>` : ""}`;

  document.getElementById("site-footer").innerHTML = `
    <div class="container footer-grid">
      <div>
        <div class="footer-logo">
          <img src="img/logo.jpg" alt="Logo" class="logo-img">
          <strong>${Fmt.esc(s.siteName)}</strong>
        </div>
        <p>📍 ${Fmt.esc(s.address)}</p>
        <p>📞 Điện thoại: ${Fmt.esc(s.phone)} — Cấp cứu: ${Fmt.esc(s.emergency)}</p>
        <p>✉️ ${Fmt.esc(s.email)}</p>
      </div>
      <div>
        <h5>Liên kết nhanh</h5>
        <ul>
          <li><a href="dat-lich.html">Đặt lịch khám bệnh</a></li>
          <li><a href="dich-vu.html">Bảng giá dịch vụ</a></li>
          <li><a href="bac-si.html">Đội ngũ bác sĩ</a></li>
          <li><a href="tin-tuc.html">Tin tức - Thông báo</a></li>
        </ul>
      </div>
      <div>
        <h5>Giờ làm việc</h5>
        <p>${Fmt.esc(s.workingHours)}</p>
        <p>Hotline: <strong style="color:#fff">${Fmt.esc(s.hotline)}</strong></p>
      </div>
    </div>
    <div class="footer-bottom container">
      © ${new Date().getFullYear()} ${Fmt.esc(s.siteName)}. Bản demo với dữ liệu giả — phục vụ trình diễn.
    </div>`;
}

/* ---------------- CÁC KHỐI TÁI SỬ DỤNG ---------------- */
function doctorCardHTML(d, interactive = false) {
  // Lớp phủ ảnh: dùng d.photo nếu có, không thì nền màu + chữ cái đầu
  const photoStyle = d.photo
    ? `background-image:url('${Fmt.esc(d.photo)}')`
    : `background:linear-gradient(160deg, ${Fmt.avatarColor(d.name)}, #0a3a3f)`;
  const overlay = interactive ? `
      <div class="dc-overlay">
        <div class="dc-photo" style="${photoStyle}">${d.photo ? "" : Fmt.initials(d.name)}</div>
        <div class="dc-info">
          <strong>${Fmt.esc(d.title)}. ${Fmt.esc(d.name)}</strong>
          <span>${Fmt.esc(d.position)} · ${Fmt.esc(deptName(d.dept))}</span>
        </div>
      </div>` : "";
  // Avatar tròn: ảnh thật nếu có, không thì nền màu + chữ cái đầu
  const avatarHTML = d.avatar
    ? `<img class="avatar avatar-img" src="${Fmt.esc(d.avatar)}" alt="${Fmt.esc(d.name)}">`
    : `<div class="avatar" style="background:${Fmt.avatarColor(d.name)}">${Fmt.initials(d.name)}</div>`;
  return `
    <div class="doctor-card${interactive ? " flip" : ""}">
      ${avatarHTML}
      <div class="title">${Fmt.esc(d.title)}</div>
      <h4>${Fmt.esc(d.name)}</h4>
      <div class="meta">${Fmt.esc(d.position)} · ${Fmt.esc(deptName(d.dept))}<br>Kinh nghiệm: ${d.exp} năm</div>
      <p class="intro">${Fmt.esc(d.intro)}</p>
      <span class="chip">🗓 ${Fmt.esc(d.schedule)}</span>${overlay}
    </div>`;
}

/* Gắn hành vi cho thẻ bác sĩ tương tác:
   - Trỏ chuột giữ 2 giây -> hiện ảnh phủ
   - Click -> bật/tắt ngay lập tức */
function initDoctorCardReveal(containerId) {
  document.querySelectorAll(`#${containerId} .doctor-card.flip`).forEach(card => {
    let hoverTimer = null;
    card.addEventListener("mouseenter", () => {
      if (card.classList.contains("revealed")) return;
      hoverTimer = setTimeout(() => card.classList.add("revealed"), 2000);
    });
    card.addEventListener("mouseleave", () => clearTimeout(hoverTimer));
    card.addEventListener("click", () => {
      clearTimeout(hoverTimer);
      card.classList.toggle("revealed");
    });
  });
}

function newsCardHTML(n) {
  const icons = { "Thông báo": "📢", "Hoạt động": "🏥", "Y tế dự phòng": "🛡️", "Kỹ thuật mới": "🔬" };
  return `
    <div class="news-card">
      <div class="news-thumb">${icons[n.cat] || "📰"}</div>
      <div class="news-body">
        <span class="cat">${Fmt.esc(n.cat)}</span>
        <h4><a href="tin-tuc.html?id=${n.id}">${Fmt.esc(n.title)}</a></h4>
        <div class="date">🗓 ${Fmt.date(n.date)}</div>
        <p>${Fmt.esc(n.summary)}</p>
      </div>
    </div>`;
}

/* ---------------- HERO: TRÌNH CHIẾU ẢNH ĐẦU TRANG ---------------- */
function heroSlideHTML(h) {
  const bg = `background-image:url('${Fmt.esc(h.image)}');background-position:${Fmt.esc(h.position || "center 30%")}`;
  const btn = (text, link, cls) =>
    (text && text.trim())
      ? `<a href="${Fmt.esc(link || "#")}" class="btn ${cls}">${Fmt.esc(text)}</a>` : "";
  return `
    <div class="hero-slide" style="${bg}">
      <div class="container">
        <div class="hero-content">
          <h2>${Fmt.esc(h.title)}</h2>
          ${h.subtitle ? `<p>${Fmt.esc(h.subtitle)}</p>` : ""}
          <div class="hero-actions">
            ${btn(h.btn1Text, h.btn1Link, "btn-primary")}
            ${btn(h.btn2Text, h.btn2Link, "btn-outline")}
          </div>
        </div>
      </div>
    </div>`;
}

function renderHero() {
  const el = document.getElementById("hero");
  if (!el) return;
  const slides = Store.all("hero");

  if (!slides.length) { el.style.display = "none"; return; }

  const multi = slides.length > 1;
  el.innerHTML = `
    <div class="hero-slides">${slides.map(heroSlideHTML).join("")}</div>
    ${multi ? `
      <button class="hero-nav prev" type="button" aria-label="Ảnh trước">‹</button>
      <button class="hero-nav next" type="button" aria-label="Ảnh sau">›</button>
      <div class="hero-dots">
        ${slides.map((_, i) => `<button type="button" class="hero-dot${i === 0 ? " active" : ""}" data-i="${i}" aria-label="Ảnh ${i + 1}"></button>`).join("")}
      </div>` : ""}`;

  const track = el.querySelector(".hero-slides");
  const slideEls = [...el.querySelectorAll(".hero-slide")];
  const dotEls = [...el.querySelectorAll(".hero-dot")];
  slideEls[0].classList.add("active");

  let cur = 0, timer = null;
  const INTERVAL = 8000;

  function show(i) {
    cur = (i + slideEls.length) % slideEls.length;
    track.style.transform = `translateX(${-cur * 100}%)`;   // trượt ngang mượt
    slideEls.forEach((s, k) => s.classList.toggle("active", k === cur));
    dotEls.forEach((d, k) => d.classList.toggle("active", k === cur));
  }
  function next() { show(cur + 1); }
  function prev() { show(cur - 1); }
  function play() { if (multi) { stop(); timer = setInterval(next, INTERVAL); } }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  // Chuyển ảnh thủ công rồi khởi động lại đồng hồ 8s
  function go(fn) { fn(); play(); }

  if (multi) {
    el.querySelector(".hero-nav.next").addEventListener("click", () => go(next));
    el.querySelector(".hero-nav.prev").addEventListener("click", () => go(prev));
    dotEls.forEach(d => d.addEventListener("click", () => go(() => show(Number(d.dataset.i)))));
    el.addEventListener("mouseenter", stop);
    el.addEventListener("mouseleave", play);
    play();
  }
}

/* ---------------- TRANG CHỦ ---------------- */
function renderHome() {
  renderHero();
  const doctors = Store.all("doctors").slice(0, 4);
  const news = [...Store.all("news")].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

  document.getElementById("home-doctors").innerHTML = doctors.map(d => doctorCardHTML(d, true)).join("");
  initDoctorCardReveal("home-doctors");
  document.getElementById("home-news").innerHTML = news.map(newsCardHTML).join("");

  document.getElementById("home-stats").innerHTML = `
    <div class="stat-card"><div class="num">${Store.all("departments").length}</div><div class="lbl">Khoa, phòng chuyên môn</div></div>
    <div class="stat-card"><div class="num">${Store.all("doctors").length}+</div><div class="lbl">Bác sĩ, chuyên gia</div></div>
    <div class="stat-card"><div class="num">150+</div><div class="lbl">Giường bệnh</div></div>
    <div class="stat-card"><div class="num">24/7</div><div class="lbl">Cấp cứu thường trực</div></div>`;
}

/* ---------------- KHOA PHÒNG ---------------- */
function renderDepartments() {
  document.getElementById("dept-list").innerHTML =
    Store.all("departments").map(d => `
      <div class="dept-card">
        <div class="icon">${d.icon}</div>
        <h4>${Fmt.esc(d.name)}</h4>
        <p>${Fmt.esc(d.desc)}</p>
      </div>`).join("");
}

/* ---------------- BÁC SĨ ---------------- */
function renderDoctors() {
  const sel = document.getElementById("doctor-dept-filter");
  sel.innerHTML = `<option value="">— Tất cả khoa —</option>` +
    Store.all("departments").map(d => `<option value="${d.id}">${Fmt.esc(d.name)}</option>`).join("");

  const draw = () => {
    const q = document.getElementById("doctor-search").value.toLowerCase();
    const dept = sel.value;
    const list = Store.all("doctors").filter(d =>
      (!dept || d.dept === dept) &&
      (!q || d.name.toLowerCase().includes(q) || d.position.toLowerCase().includes(q)));
    document.getElementById("doctor-list").innerHTML =
      list.length ? list.map(d => doctorCardHTML(d, true)).join("")
                  : `<div class="empty-note">Không tìm thấy bác sĩ phù hợp.</div>`;
    initDoctorCardReveal("doctor-list");
  };
  sel.onchange = draw;
  document.getElementById("doctor-search").oninput = draw;
  draw();
}

/* ---------------- BẢNG GIÁ DỊCH VỤ ---------------- */
function renderServices() {
  const draw = () => {
    const q = document.getElementById("svc-search").value.toLowerCase();
    const services = Store.all("services").filter(s =>
      !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));

    const groups = {};
    for (const s of services) (groups[s.group] = groups[s.group] || []).push(s);

    let html = "";
    for (const [g, items] of Object.entries(groups)) {
      html += `<tr class="group-row"><td colspan="5">▸ ${Fmt.esc(g)}</td></tr>`;
      html += items.map(s => `
        <tr>
          <td>${Fmt.esc(s.code)}</td>
          <td>${Fmt.esc(s.name)}</td>
          <td class="price">${Fmt.money(s.price)}</td>
          <td>${s.bhyt ? '<span class="badge badge-ok">Có BHYT</span>' : '<span class="badge badge-warn">Dịch vụ</span>'}</td>
          <td style="color:var(--muted);font-size:13px">${Fmt.esc(s.note)}</td>
        </tr>`).join("");
    }
    document.getElementById("svc-body").innerHTML =
      html || `<tr><td colspan="5" class="empty-note">Không tìm thấy dịch vụ.</td></tr>`;
  };
  document.getElementById("svc-search").oninput = draw;
  draw();
}

/* ---------------- TIN TỨC (danh sách + chi tiết) ---------------- */
function renderNews() {
  const id = new URLSearchParams(location.search).get("id");
  const listEl = document.getElementById("news-list-wrap");
  const artEl = document.getElementById("news-article-wrap");

  if (id) {
    const n = Store.get("news", id);
    listEl.style.display = "none";
    artEl.style.display = "";
    // Bài mới lưu theo phần (sections); bài cũ chỉ có content dạng text
    const bodyHTML = (n && n.sections && n.sections.length)
      ? n.sections.map(sec => `
          ${sec.heading ? `<h3>${Fmt.esc(sec.heading)}</h3>` : ""}
          ${sec.body ? sec.body.split(/\n+/).map(p => `<p>${Fmt.esc(p)}</p>`).join("") : ""}
          ${sec.image ? `<img class="art-img" src="${Fmt.esc(sec.image)}" alt="">` : ""}
          ${(sec.pdfPages && sec.pdfPages.length) ? `
            <div class="art-pdf">
              ${sec.pdfName ? `<div class="art-pdf-name">📄 ${Fmt.esc(sec.pdfName)}</div>` : ""}
              ${sec.pdfPages.map(p => `<img class="art-pdf-page" src="${p}" alt="Trang tài liệu">`).join("")}
            </div>` : ""}`).join("")
      : (n ? n.content.split(/\n+/).map(p => `<p>${Fmt.esc(p)}</p>`).join("") : "");

    const attachHTML = (n && n.attachments && n.attachments.length) ? `
      <div class="attach-list">
        <h4>📎 Tệp đính kèm</h4>
        ${n.attachments.map(a =>
          `<a class="attach-item" href="${Fmt.esc(a.src)}" download="${Fmt.esc(a.name)}">📄 ${Fmt.esc(a.name)}</a>`).join("")}
      </div>` : "";

    artEl.innerHTML = n ? `
      <div class="article">
        <h2>${Fmt.esc(n.title)}</h2>
        <div class="meta">${Fmt.esc(n.cat)} · 🗓 ${Fmt.date(n.date)}</div>
        <div class="content">${bodyHTML}</div>
        ${attachHTML}
        <a href="tin-tuc.html" class="btn btn-ghost btn-sm">← Quay lại danh sách tin</a>
      </div>` :
      `<div class="empty-note">Không tìm thấy bài viết. <a href="tin-tuc.html">Quay lại</a></div>`;
    return;
  }

  const news = [...Store.all("news")].sort((a, b) => b.date.localeCompare(a.date));

  // Danh sách chuyên mục (theo thứ tự xuất hiện)
  const cats = [];
  for (const n of news) if (n.cat && !cats.includes(n.cat)) cats.push(n.cat);

  listEl.innerHTML = `
    <div class="news-filter">
      <input id="news-search" placeholder="🔍 Tìm bài viết theo tiêu đề hoặc từ khóa...">
      <div class="news-cats" id="news-cats">
        <button class="news-cat active" data-cat="">Tất cả</button>
        ${cats.map(c => `<button class="news-cat" data-cat="${Fmt.esc(c)}">${Fmt.esc(c)}</button>`).join("")}
      </div>
    </div>
    <div class="news-grid" id="news-list"></div>`;

  let curCat = "";
  const searchEl = document.getElementById("news-search");
  const catWrap = document.getElementById("news-cats");

  const draw = () => {
    const q = searchEl.value.trim().toLowerCase();
    const list = news.filter(n => {
      if (curCat && n.cat !== curCat) return false;
      if (!q) return true;
      const hay = `${n.title} ${n.summary || ""} ${n.content || ""}`.toLowerCase();
      return hay.includes(q);
    });
    document.getElementById("news-list").innerHTML =
      list.length ? list.map(newsCardHTML).join("")
                  : `<div class="empty-note">Không tìm thấy bài viết phù hợp.</div>`;
  };

  catWrap.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".news-cat");
    if (!btn) return;
    curCat = btn.dataset.cat;
    catWrap.querySelectorAll(".news-cat").forEach(b => b.classList.toggle("active", b === btn));
    draw();
  });
  searchEl.addEventListener("input", draw);
  draw();
}

/* ---------------- ĐẶT LỊCH KHÁM ---------------- */
function renderBooking() {
  const deptSel = document.getElementById("bk-dept");
  const docSel = document.getElementById("bk-doctor");
  const dateInp = document.getElementById("bk-date");
  const slotSel = document.getElementById("bk-slot");
  const form = document.getElementById("booking-form");

  deptSel.innerHTML = `<option value="">— Chọn khoa khám —</option>` +
    Store.all("departments").map(d => `<option value="${d.id}">${d.icon} ${Fmt.esc(d.name)}</option>`).join("");

  // Ngày khám: từ ngày mai đến 30 ngày tới
  const tomorrow = new Date(Date.now() + 86400000);
  dateInp.min = tomorrow.toISOString().slice(0, 10);
  dateInp.max = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  deptSel.onchange = () => {
    const doctors = Store.all("doctors").filter(d => d.dept === deptSel.value);
    docSel.innerHTML = `<option value="">— Chọn bác sĩ (không bắt buộc) —</option>` +
      doctors.map(d => `<option value="${d.id}">${Fmt.esc(d.title)}. ${Fmt.esc(d.name)} — ${Fmt.esc(d.position)}</option>`).join("");
    loadSlots();
  };

  async function loadSlots() {
    slotSel.innerHTML = `<option value="">Đang tải khung giờ...</option>`;
    if (!dateInp.value) {
      slotSel.innerHTML = `<option value="">— Chọn ngày khám trước —</option>`;
      return;
    }
    try {
      // Lấy khung giờ trống từ HIS (mock trong demo)
      const slots = await HIS.getAvailableSlots(docSel.value || "any", dateInp.value);
      slotSel.innerHTML = `<option value="">— Chọn khung giờ —</option>` +
        slots.map(s => `<option>${s}</option>`).join("");
    } catch (e) {
      slotSel.innerHTML = `<option value="">Lỗi tải khung giờ từ HIS</option>`;
    }
  }
  docSel.onchange = loadSlots;
  dateInp.onchange = loadSlots;

  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const f = new FormData(form);
    const appt = {
      name: f.get("name").trim(),
      dob: f.get("dob"),
      phone: f.get("phone").trim(),
      cccd: f.get("cccd").trim(),
      bhyt: f.get("bhyt").trim(),
      dept: f.get("dept"),
      doctor: f.get("doctor"),
      date: f.get("date"),
      slot: f.get("slot"),
      symptom: f.get("symptom").trim(),
      status: "pending",
      createdAt: new Date().toISOString()
    };

    if (!/^0\d{9}$/.test(appt.phone)) {
      toast("Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0).", true);
      return;
    }

    const btn = document.getElementById("bk-submit");
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Đang gửi hồ sơ sang HIS...`;

    try {
      // Gửi sang HIS để lấy mã hồ sơ + số thứ tự
      const his = await HIS.registerAppointment(appt);
      appt.hisCode = his.hisCode;

      // Sinh mã đặt lịch nội bộ: SD-YYMMDD-XXX
      const d = new Date();
      const ymd = d.toISOString().slice(2, 10).replace(/-/g, "");
      const count = Store.all("appointments").length + 1;
      appt.code = `SD-${ymd}-${String(count).padStart(3, "0")}`;

      Store.add("appointments", appt);

      form.style.display = "none";
      document.getElementById("bk-result").innerHTML = `
        <div class="result-box">
          <p style="font-size:17px">✅ Đăng ký khám thành công!</p>
          <p style="margin-top:10px">Mã đặt lịch của bạn:</p>
          <div class="code">${appt.code}</div>
          <p class="queue">Mã hồ sơ HIS: <strong>${his.hisCode}</strong> · Số thứ tự dự kiến: <strong>${his.queueNumber}</strong></p>
          <p style="margin-top:12px;font-size:14px;color:var(--muted)">
            Khoa: <strong>${Fmt.esc(deptName(appt.dept))}</strong> ·
            Ngày: <strong>${Fmt.date(appt.date)}</strong> · Giờ: <strong>${appt.slot}</strong><br>
            Vui lòng đến quầy tiếp đón trước giờ hẹn 15 phút và đọc mã đặt lịch.
            Chúng tôi sẽ gọi điện xác nhận qua số ${Fmt.esc(appt.phone)}.
          </p>
          <button class="btn btn-blue" style="margin-top:14px" onclick="location.reload()">Đặt lịch mới</button>
        </div>`;
      document.getElementById("bk-result").scrollIntoView({ behavior: "smooth" });
    } catch (e) {
      toast("Không gửi được hồ sơ sang HIS: " + e.message, true);
      btn.disabled = false;
      btn.textContent = "Xác nhận đặt lịch";
    }
  };
}

/* ---------------- LIÊN HỆ ---------------- */
function renderContact() {
  const s = Store.settings();
  document.getElementById("contact-info").innerHTML = `
    <h4>Thông tin liên hệ</h4>
    <div class="contact-item"><span class="ci">📍</span><div><strong>Địa chỉ</strong><br>${Fmt.esc(s.address)}</div></div>
    <div class="contact-item"><span class="ci">📞</span><div><strong>Điện thoại</strong><br>${Fmt.esc(s.phone)}</div></div>
    <div class="contact-item"><span class="ci">🚑</span><div><strong>Cấp cứu 24/7</strong><br>${Fmt.esc(s.emergency)}</div></div>
    <div class="contact-item"><span class="ci">☎️</span><div><strong>Hotline đặt khám</strong><br>${Fmt.esc(s.hotline)}</div></div>
    <div class="contact-item"><span class="ci">✉️</span><div><strong>Email</strong><br>${Fmt.esc(s.email)}</div></div>
    <div class="contact-item"><span class="ci">🕐</span><div><strong>Giờ làm việc</strong><br>${Fmt.esc(s.workingHours)}</div></div>`;

  document.getElementById("contact-form").onsubmit = (ev) => {
    ev.preventDefault();
    toast("Đã gửi liên hệ. Trung tâm sẽ phản hồi trong 24h làm việc. (Demo)");
    ev.target.reset();
  };
}

/* ---------------- KHỞI CHẠY ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  renderLayout(page);
  const renderers = {
    home: renderHome,
    departments: renderDepartments,
    doctors: renderDoctors,
    services: renderServices,
    news: renderNews,
    booking: renderBooking,
    contact: renderContact
  };
  if (renderers[page]) renderers[page]();
});
