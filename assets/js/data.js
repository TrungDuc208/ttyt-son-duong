/* ============================================================
   TTYT KHU VỰC SƠN DƯƠNG - LỚP DỮ LIỆU (DEMO)
   Dữ liệu giả lưu trong localStorage, mô phỏng database.
   Khi triển khai thật: thay Store bằng các lời gọi API backend.
   ============================================================ */

const DB_KEY = "ttyt_sonduong_db_v1";

/* ---------------- DỮ LIỆU MẪU (SEED) ---------------- */
const SEED = {
  settings: {
    siteName: "Trung tâm Y tế khu vực Sơn Dương",
    slogan: "Tận tâm chăm sóc - Vững bước niềm tin",
    address: "Tổ dân phố Tân Phúc, thị trấn Sơn Dương, huyện Sơn Dương, tỉnh Tuyên Quang",
    phone: "0207 3835 215",
    hotline: "1900 9095",
    emergency: "0207 3835 115",
    email: "ttytsonduong@tuyenquang.gov.vn",
    workingHours: "Thứ 2 - Thứ 6: 7h00 - 17h00 | Cấp cứu 24/7",
    announcement: "Trung tâm triển khai đăng ký khám bệnh trực tuyến - Quý khách vui lòng đặt lịch trước để giảm thời gian chờ đợi.",
    his: {
      mode: "mock",                 // "mock" = demo | "real" = kết nối HIS thật
      endpoint: "https://his.ttytsonduong.vn/api/v1",
      apiKey: "",
      facilityCode: "08014",        // Mã cơ sở KCB
      timeout: 15000
    }
  },

  // Ảnh trình chiếu đầu trang chủ (hero). Mỗi ảnh là 1 "slide".
  // image: đường dẫn hoặc dữ liệu base64; position: căn nền (object background-position).
  hero: [
    {
      id: "h1",
      image: "img/background.jpg",
      position: "center 30%",
      title: "Tận tâm chăm sóc sức khỏe nhân dân khu vực Sơn Dương",
      subtitle: "Đội ngũ y bác sĩ giàu kinh nghiệm, trang thiết bị hiện đại, quy trình khám chữa bệnh nhanh gọn. Đặt lịch khám trực tuyến để không phải chờ đợi.",
      btn1Text: "Đặt lịch khám ngay", btn1Link: "dat-lich.html",
      btn2Text: "Xem bảng giá dịch vụ", btn2Link: "dich-vu.html"
    },
    {
      id: "h2",
      image: "img/background.jpg",
      position: "center 55%",
      title: "Đặt lịch khám trực tuyến — không phải xếp hàng chờ đợi",
      subtitle: "Chọn khoa, bác sĩ và khung giờ mong muốn; nhận ngay mã hồ sơ và số thứ tự dự kiến. Tiện lợi cho người cao tuổi và người bệnh tái khám định kỳ.",
      btn1Text: "Đặt lịch ngay", btn1Link: "dat-lich.html",
      btn2Text: "Tìm bác sĩ", btn2Link: "bac-si.html"
    }
  ],

  departments: [
    { id: "d1",  name: "Khoa Khám bệnh",                    icon: "🩺", desc: "Tiếp đón, khám và phân loại người bệnh; khám sức khỏe định kỳ, khám BHYT." },
    { id: "d2",  name: "Khoa Nội tổng hợp",                 icon: "❤️", desc: "Điều trị các bệnh lý nội khoa: tim mạch, hô hấp, tiêu hóa, nội tiết, cơ xương khớp." },
    { id: "d3",  name: "Khoa Ngoại tổng hợp",               icon: "🔪", desc: "Phẫu thuật tiêu hóa, tiết niệu, chấn thương chỉnh hình; điều trị ngoại khoa." },
    { id: "d4",  name: "Khoa Phụ sản",                      icon: "🤰", desc: "Khám thai, quản lý thai nghén, đỡ đẻ, phẫu thuật sản phụ khoa, KHHGĐ." },
    { id: "d5",  name: "Khoa Nhi",                          icon: "👶", desc: "Khám và điều trị bệnh lý trẻ em, tư vấn dinh dưỡng, tiêm chủng mở rộng." },
    { id: "d6",  name: "Khoa Cấp cứu - Hồi sức tích cực",   icon: "🚑", desc: "Cấp cứu 24/7, hồi sức tích cực và chống độc." },
    { id: "d7",  name: "Khoa Y học cổ truyền - PHCN",       icon: "🌿", desc: "Châm cứu, xoa bóp bấm huyệt, thuốc y học cổ truyền, vật lý trị liệu - phục hồi chức năng." },
    { id: "d8",  name: "Liên chuyên khoa RHM - Mắt - TMH",  icon: "👁️", desc: "Khám chữa răng hàm mặt, mắt, tai mũi họng." },
    { id: "d9",  name: "Khoa Chẩn đoán hình ảnh",           icon: "📷", desc: "X-quang kỹ thuật số, siêu âm màu 4D, nội soi tiêu hóa, điện tim, điện não." },
    { id: "d10", name: "Khoa Xét nghiệm",                   icon: "🧪", desc: "Xét nghiệm huyết học, sinh hóa, vi sinh, nước tiểu; xét nghiệm nhanh." }
  ],

  doctors: [
    { id: "bs1",  name: "Nguyễn Văn Hùng",   title: "BSCKII", dept: "d3",  position: "Giám đốc Trung tâm",            exp: 28, phone: "0912 345 678", intro: "Hơn 28 năm kinh nghiệm ngoại khoa, chuyên sâu phẫu thuật tiêu hóa và tiết niệu.", schedule: "Thứ 2, Thứ 4 (sáng)" },
    { id: "bs2",  name: "Trần Thị Minh Hà",  title: "BSCKI",  dept: "d2",  position: "Phó Giám đốc",                  exp: 22, phone: "0913 456 789", intro: "Chuyên khoa Nội tim mạch, quản lý điều trị tăng huyết áp, đái tháo đường.", schedule: "Thứ 2 - Thứ 6" },
    { id: "bs3",  name: "Phạm Đức Long",     title: "BSCKI",  dept: "d1",  position: "Trưởng khoa Khám bệnh",          exp: 18, phone: "0914 567 890", intro: "Kinh nghiệm khám nội tổng quát, khám sức khỏe định kỳ và quản lý bệnh mạn tính.", schedule: "Thứ 2 - Thứ 6" },
    { id: "bs4",  name: "Lê Thị Thu Hằng",   title: "BSCKII", dept: "d4",  position: "Trưởng khoa Phụ sản",            exp: 20, phone: "0915 678 901", intro: "Chuyên sâu sản khoa, siêu âm thai 4D, phẫu thuật sản phụ khoa nội soi.", schedule: "Thứ 3, Thứ 5, Thứ 6" },
    { id: "bs5",  name: "Hoàng Minh Tuấn",   title: "ThS.BS", dept: "d5",  position: "Trưởng khoa Nhi",                exp: 15, phone: "0916 789 012", intro: "Thạc sĩ Nhi khoa, chuyên bệnh lý hô hấp và tiêu hóa trẻ em.", schedule: "Thứ 2 - Thứ 6" },
    { id: "bs6",  name: "Vũ Thị Lan Anh",    title: "BSCKI",  dept: "d6",  position: "Trưởng khoa Cấp cứu - HSTC",     exp: 16, phone: "0917 890 123", intro: "Chuyên hồi sức cấp cứu, chống độc; chứng chỉ hồi sức tích cực nâng cao.", schedule: "Trực theo ca 24/7" },
    { id: "bs7",  name: "Đặng Quốc Bảo",     title: "BS.YHCT",dept: "d7",  position: "Trưởng khoa YHCT - PHCN",        exp: 14, phone: "0918 901 234", intro: "Châm cứu, cấy chỉ, điều trị đau vai gáy, thoái hóa cột sống bằng YHCT kết hợp PHCN.", schedule: "Thứ 2 - Thứ 6" },
    { id: "bs8",  name: "Ngô Thị Phương",    title: "BSCKI",  dept: "d8",  position: "Phụ trách Liên chuyên khoa",     exp: 12, phone: "0919 012 345", intro: "Chuyên khoa Tai Mũi Họng, nội soi TMH, phẫu thuật amidan.", schedule: "Thứ 2, Thứ 3, Thứ 5" },
    { id: "bs9",  name: "Bùi Văn Sơn",       title: "BSCKI",  dept: "d9",  position: "Trưởng khoa Chẩn đoán hình ảnh", exp: 17, phone: "0920 123 456", intro: "Siêu âm tổng quát, siêu âm tim, nội soi tiêu hóa can thiệp.", schedule: "Thứ 2 - Thứ 6" },
    { id: "bs10", name: "Đỗ Thị Kim Oanh",   title: "ThS.BS", dept: "d10", position: "Trưởng khoa Xét nghiệm",         exp: 13, phone: "0921 234 567", intro: "Thạc sĩ Xét nghiệm y học, quản lý chất lượng phòng xét nghiệm ISO 15189.", schedule: "Thứ 2 - Thứ 6" },
    { id: "bs11", name: "Lý Văn Thành",      title: "BS",     dept: "d2",  position: "Bác sĩ điều trị",               exp: 8,  phone: "0922 345 678", intro: "Bác sĩ nội khoa, chuyên theo dõi điều trị bệnh phổi tắc nghẽn mạn tính.", schedule: "Thứ 2 - Thứ 6" },
    { id: "bs12", name: "Chu Thị Hồng Nhung",title: "BS",     dept: "d5",  position: "Bác sĩ điều trị",               exp: 6,  phone: "0923 456 789", intro: "Bác sĩ nhi khoa, tư vấn dinh dưỡng và tiêm chủng cho trẻ.", schedule: "Thứ 3 - Thứ 7" }
  ],

  services: [
    { id: "s1",  code: "KB01",  group: "Khám bệnh",            name: "Khám bệnh (BSCKII, ThS)",                       price: 45000,   bhyt: true,  note: "Giá theo Thông tư 22/2023/TT-BYT" },
    { id: "s2",  code: "KB02",  group: "Khám bệnh",            name: "Khám bệnh (BSCKI, BS)",                         price: 42100,   bhyt: true,  note: "" },
    { id: "s3",  code: "KB03",  group: "Khám bệnh",            name: "Khám sức khỏe định kỳ (theo yêu cầu)",           price: 250000,  bhyt: false, note: "Trọn gói khám lâm sàng" },
    { id: "s4",  code: "KB04",  group: "Khám bệnh",            name: "Khám cấp giấy khám sức khỏe lái xe",             price: 360000,  bhyt: false, note: "Theo Thông tư liên tịch 24" },
    { id: "s5",  code: "XN01",  group: "Xét nghiệm",           name: "Tổng phân tích tế bào máu ngoại vi (máy đếm laser)", price: 46200, bhyt: true, note: "" },
    { id: "s6",  code: "XN02",  group: "Xét nghiệm",           name: "Định lượng Glucose máu",                        price: 21500,   bhyt: true,  note: "" },
    { id: "s7",  code: "XN03",  group: "Xét nghiệm",           name: "Định lượng Cholesterol toàn phần",               price: 26900,   bhyt: true,  note: "" },
    { id: "s8",  code: "XN04",  group: "Xét nghiệm",           name: "Tổng phân tích nước tiểu (10 thông số)",         price: 27400,   bhyt: true,  note: "" },
    { id: "s9",  code: "XN05",  group: "Xét nghiệm",           name: "Xét nghiệm HbA1c",                              price: 101000,  bhyt: true,  note: "" },
    { id: "s10", code: "CDHA01",group: "Chẩn đoán hình ảnh",   name: "Chụp X-quang số hóa 1 phim",                    price: 65400,   bhyt: true,  note: "" },
    { id: "s11", code: "CDHA02",group: "Chẩn đoán hình ảnh",   name: "Siêu âm ổ bụng tổng quát",                      price: 43900,   bhyt: true,  note: "" },
    { id: "s12", code: "CDHA03",group: "Chẩn đoán hình ảnh",   name: "Siêu âm thai 4D",                               price: 250000,  bhyt: false, note: "Theo yêu cầu" },
    { id: "s13", code: "CDHA04",group: "Chẩn đoán hình ảnh",   name: "Nội soi thực quản - dạ dày - tá tràng",          price: 244000,  bhyt: true,  note: "" },
    { id: "s14", code: "CDHA05",group: "Chẩn đoán hình ảnh",   name: "Điện tim thường (ECG)",                         price: 32800,   bhyt: true,  note: "" },
    { id: "s15", code: "TT01",  group: "Thủ thuật - Phẫu thuật",name: "Cắt amidan (gây mê nội khí quản)",              price: 1846000, bhyt: true,  note: "" },
    { id: "s16", code: "TT02",  group: "Thủ thuật - Phẫu thuật",name: "Phẫu thuật cắt ruột thừa nội soi",              price: 2953000, bhyt: true,  note: "" },
    { id: "s17", code: "TT03",  group: "Thủ thuật - Phẫu thuật",name: "Khâu vết thương phần mềm (dưới 10cm)",          price: 199000,  bhyt: true,  note: "" },
    { id: "s18", code: "YHCT01",group: "Y học cổ truyền",      name: "Điện châm (1 lần)",                             price: 79100,   bhyt: true,  note: "" },
    { id: "s19", code: "YHCT02",group: "Y học cổ truyền",      name: "Xoa bóp bấm huyệt (30 phút)",                   price: 71400,   bhyt: true,  note: "" },
    { id: "s20", code: "GB01",  group: "Giường bệnh",          name: "Giường điều trị nội khoa (ngày)",               price: 195100,  bhyt: true,  note: "Hạng III" },
    { id: "s21", code: "GB02",  group: "Giường bệnh",          name: "Giường dịch vụ phòng 2 giường (ngày)",          price: 350000,  bhyt: false, note: "Theo yêu cầu" }
  ],

  news: [
    { id: "n1", cat: "Thông báo",     date: "2026-07-10", title: "Triển khai đăng ký khám bệnh trực tuyến từ tháng 7/2026",
      summary: "Người dân có thể đặt lịch khám qua website, giảm thời gian chờ đợi tại quầy tiếp đón.",
      content: "Từ ngày 15/7/2026, Trung tâm Y tế khu vực Sơn Dương chính thức triển khai hệ thống đăng ký khám bệnh trực tuyến kết nối với phần mềm quản lý bệnh viện (HIS).\n\nNgười dân chỉ cần truy cập website, chọn khoa khám, bác sĩ và khung giờ mong muốn. Hệ thống sẽ cấp mã hồ sơ và số thứ tự, khi đến khám chỉ cần đọc mã tại quầy tiếp đón.\n\nViệc này giúp giảm 60-70% thời gian chờ đợi, đặc biệt hữu ích cho người cao tuổi và người bệnh mạn tính tái khám định kỳ." },
    { id: "n2", cat: "Hoạt động",     date: "2026-07-05", title: "Khám bệnh, cấp thuốc miễn phí cho gia đình chính sách",
      summary: "Nhân kỷ niệm Ngày Thương binh - Liệt sĩ 27/7, Trung tâm tổ chức khám và cấp thuốc miễn phí.",
      content: "Hướng tới kỷ niệm Ngày Thương binh - Liệt sĩ 27/7, Trung tâm Y tế khu vực Sơn Dương phối hợp với các xã, thị trấn tổ chức chương trình khám bệnh, tư vấn sức khỏe và cấp thuốc miễn phí cho hơn 300 người thuộc gia đình chính sách, người có công với cách mạng trên địa bàn.\n\nChương trình gồm: khám nội tổng quát, đo huyết áp, thử đường máu, siêu âm ổ bụng và cấp thuốc điều trị các bệnh thông thường." },
    { id: "n3", cat: "Y tế dự phòng", date: "2026-06-28", title: "Tăng cường phòng chống sốt xuất huyết mùa mưa",
      summary: "Khuyến cáo người dân diệt lăng quăng, ngủ màn và đến cơ sở y tế ngay khi sốt cao liên tục.",
      content: "Mùa mưa là thời điểm dịch sốt xuất huyết dễ bùng phát. Trung tâm Y tế khu vực Sơn Dương khuyến cáo người dân:\n\n1. Đậy kín các dụng cụ chứa nước, thả cá diệt lăng quăng.\n2. Lật úp các vật dụng phế thải đọng nước quanh nhà.\n3. Ngủ màn kể cả ban ngày, mặc quần áo dài tay.\n4. Khi có dấu hiệu sốt cao đột ngột 2-7 ngày, đau đầu, đau hốc mắt, cần đến ngay cơ sở y tế, không tự ý truyền dịch tại nhà." },
    { id: "n4", cat: "Kỹ thuật mới",  date: "2026-06-15", title: "Đưa vào hoạt động hệ thống nội soi tiêu hóa thế hệ mới",
      summary: "Hệ thống nội soi độ phân giải cao giúp phát hiện sớm tổn thương và ung thư đường tiêu hóa.",
      content: "Trung tâm vừa đưa vào sử dụng hệ thống nội soi tiêu hóa độ phân giải cao với chức năng nhuộm màu ảo (NBI), cho phép phát hiện sớm các tổn thương tiền ung thư và ung thư sớm đường tiêu hóa.\n\nKỹ thuật được thực hiện bởi ê-kíp bác sĩ đã được đào tạo tại Bệnh viện Bạch Mai. Người bệnh có BHYT được quỹ BHYT chi trả theo quy định." },
    { id: "n5", cat: "Thông báo",     date: "2026-06-01", title: "Lịch tiêm chủng mở rộng tháng 6/2026",
      summary: "Tiêm chủng mở rộng cho trẻ em được tổ chức vào các ngày 5, 15 và 25 hằng tháng.",
      content: "Trung tâm Y tế khu vực Sơn Dương thông báo lịch tiêm chủng mở rộng tháng 6/2026 tại Trung tâm và các trạm y tế xã:\n\n- Ngày 05/6: Tiêm vắc xin 5 trong 1, bại liệt (IPV), viêm gan B.\n- Ngày 15/6: Tiêm vắc xin sởi, sởi - rubella (MR).\n- Ngày 25/6: Tiêm vét cho trẻ hoãn tiêm các đợt trước.\n\nPhụ huynh mang theo sổ tiêm chủng và cho trẻ ăn no trước khi tiêm." },
    { id: "n6", cat: "Hoạt động",     date: "2026-05-20", title: "Tập huấn cấp cứu ngừng tuần hoàn cho y tế cơ sở",
      summary: "Hơn 50 cán bộ trạm y tế xã được tập huấn kỹ năng cấp cứu ngừng tuần hoàn cơ bản.",
      content: "Trong 2 ngày 18-19/5, Trung tâm Y tế khu vực Sơn Dương tổ chức lớp tập huấn 'Cấp cứu ngừng tuần hoàn cơ bản và vận chuyển người bệnh an toàn' cho hơn 50 cán bộ y tế các trạm y tế xã, thị trấn.\n\nHọc viên được thực hành ép tim ngoài lồng ngực, bóp bóng qua mặt nạ và sử dụng máy khử rung tự động (AED) trên mô hình." }
  ],

  appointments: [
    { id: "a1", code: "SD-260714-001", name: "Nguyễn Thị Mai", dob: "1968-03-12", phone: "0987654321", cccd: "008168001234", bhyt: "GD4080812345678", dept: "d2", doctor: "bs2", date: "2026-07-17", slot: "07:30 - 08:00", symptom: "Tái khám tăng huyết áp, lấy thuốc định kỳ", status: "confirmed", hisCode: "HIS-45012", createdAt: "2026-07-14T08:15:00" },
    { id: "a2", code: "SD-260715-002", name: "Trần Văn Đức",   dob: "1990-11-05", phone: "0978123456", cccd: "008090005678", bhyt: "",                dept: "d8", doctor: "bs8", date: "2026-07-17", slot: "08:30 - 09:00", symptom: "Đau họng, ù tai trái 3 ngày", status: "pending", hisCode: "", createdAt: "2026-07-15T14:20:00" },
    { id: "a3", code: "SD-260715-003", name: "Lò Thị Hoa",     dob: "2019-06-20", phone: "0965234789", cccd: "",             bhyt: "TE1080819012345", dept: "d5", doctor: "bs5", date: "2026-07-18", slot: "09:00 - 09:30", symptom: "Trẻ ho, sốt nhẹ 2 ngày", status: "pending", hisCode: "", createdAt: "2026-07-15T16:45:00" }
  ],

  users: [
    // Demo: mật khẩu lưu dạng thường. Bản thật: băm bcrypt phía server.
    { username: "admin", password: "admin@123", fullName: "Quản trị viên", role: "admin" }
  ],

  // Kho tệp ("thư mục nhận file" của bản demo - lưu base64 trong localStorage;
  // bản thật: file lưu vào thư mục /uploads trên server)
  files: []
};

/* ---------------- STORE: CRUD trên localStorage ---------------- */
const Store = {
  _cache: null,

  _load() {
    if (this._cache) return this._cache;
    try {
      const raw = localStorage.getItem(DB_KEY);
      this._cache = raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(SEED));
    } catch (e) {
      this._cache = JSON.parse(JSON.stringify(SEED));
    }
    // Nạp bù các collection mới cho DB cũ đã lưu trước đây (vd: hero)
    if (!Array.isArray(this._cache.hero)) {
      this._cache.hero = JSON.parse(JSON.stringify(SEED.hero));
    }
    return this._cache;
  },

  _save() {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(this._cache));
    } catch (e) {
      throw new Error("Bộ nhớ trình duyệt đã đầy. Hãy xóa bớt tệp trong Kho tệp hoặc xuất dữ liệu ra file.");
    }
  },

  all(col)      { return this._load()[col] || []; },
  get(col, id)  { return this.all(col).find(x => x.id === id); },

  add(col, item) {
    item.id = item.id || (col.slice(0, 2) + Date.now().toString(36) + Math.floor(Math.random() * 1000));
    const db = this._load();
    (db[col] = db[col] || []).push(item); // DB cũ có thể chưa có collection mới
    this._save();
    return item;
  },

  update(col, id, patch) {
    const item = this.get(col, id);
    if (item) { Object.assign(item, patch); this._save(); }
    return item;
  },

  remove(col, id) {
    const db = this._load();
    db[col] = db[col].filter(x => x.id !== id);
    this._save();
  },

  settings()        { return this._load().settings; },
  saveSettings(s)   { Object.assign(this._load().settings, s); this._save(); },

  reset()  { localStorage.removeItem(DB_KEY); this._cache = null; },
  export() { return JSON.stringify(this._load(), null, 2); },
  import(json) {
    const data = JSON.parse(json); // ném lỗi nếu JSON hỏng
    this._cache = data;
    this._save();
  }
};

/* ---------------- TIỆN ÍCH CHUNG ---------------- */
const Fmt = {
  money(v)  { return Number(v).toLocaleString("vi-VN") + " đ"; },
  bytes(n) {
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / 1024 / 1024).toFixed(2) + " MB";
  },
  date(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("T")[0].split("-");
    return `${d}/${m}/${y}`;
  },
  esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  },
  initials(name) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[parts.length - 1][0] || "")).toUpperCase();
  },
  avatarColor(name) {
    const colors = ["#0e7490", "#0369a1", "#15803d", "#7c3aed", "#b45309", "#be185d", "#4338ca"];
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) % colors.length;
    return colors[h];
  }
};

const APPT_STATUS = {
  pending:   { label: "Chờ xác nhận", cls: "badge-warn" },
  confirmed: { label: "Đã xác nhận",  cls: "badge-ok" },
  done:      { label: "Đã khám",      cls: "badge-info" },
  cancelled: { label: "Đã hủy",       cls: "badge-danger" }
};

const TIME_SLOTS = [
  "07:00 - 07:30", "07:30 - 08:00", "08:00 - 08:30", "08:30 - 09:00",
  "09:00 - 09:30", "09:30 - 10:00", "10:00 - 10:30", "10:30 - 11:00",
  "13:30 - 14:00", "14:00 - 14:30", "14:30 - 15:00", "15:00 - 15:30",
  "15:30 - 16:00", "16:00 - 16:30"
];
