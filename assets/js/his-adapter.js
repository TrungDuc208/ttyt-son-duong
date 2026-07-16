/* ============================================================
   HIS ADAPTER - Lớp tích hợp phần mềm quản lý bệnh viện (HIS)
   ------------------------------------------------------------
   Mọi giao tiếp với HIS đều đi qua lớp này. Website không gọi
   HIS trực tiếp ở nơi khác, nên khi chuyển từ demo sang thật
   chỉ cần sửa duy nhất file này (hoặc đổi mode trong Cài đặt).

   - mode "mock": mô phỏng HIS cho bản demo (độ trễ giả, sinh mã
     hồ sơ + số thứ tự giả).
   - mode "real": gọi API HIS thật qua fetch(). Các HIS phổ biến
     tại Việt Nam (VNPT-HIS, Viettel HIS, FPT.eHospital, DHG...)
     đều cung cấp REST API hoặc cổng tích hợp HL7/FHIR — điền
     endpoint + apiKey trong trang Quản trị > Cài đặt, sau đó
     điều chỉnh đường dẫn/payload bên dưới theo tài liệu API của
     đơn vị cung cấp HIS.
   ============================================================ */

const HIS = {
  get config() { return Store.settings().his; },

  _delay(ms) { return new Promise(r => setTimeout(r, ms)); },

  async _call(path, options = {}) {
    const cfg = this.config;
    const res = await fetch(cfg.endpoint + path, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + cfg.apiKey,
        "X-Facility-Code": cfg.facilityCode
      },
      ...options
    });
    if (!res.ok) throw new Error("HIS trả về lỗi HTTP " + res.status);
    return res.json();
  },

  /* Kiểm tra kết nối HIS */
  async checkConnection() {
    if (this.config.mode === "mock") {
      await this._delay(600);
      return { ok: true, message: "Kết nối HIS (chế độ mô phỏng) thành công", version: "HIS Demo v1.0" };
    }
    const data = await this._call("/ping");
    return { ok: true, message: "Kết nối HIS thành công", version: data.version };
  },

  /* Lấy khung giờ còn trống của bác sĩ trong ngày.
     Bản thật: HIS trả về lịch thực tế; bản demo: loại các khung
     giờ đã có người đặt trên website. */
  async getAvailableSlots(doctorId, dateISO) {
    if (this.config.mode === "mock") {
      await this._delay(400);
      const taken = Store.all("appointments")
        .filter(a => a.doctor === doctorId && a.date === dateISO && a.status !== "cancelled")
        .map(a => a.slot);
      return TIME_SLOTS.filter(s => !taken.includes(s));
    }
    const data = await this._call(`/schedules?doctor=${doctorId}&date=${dateISO}`);
    return data.slots;
  },

  /* Gửi hồ sơ đăng ký khám sang HIS.
     Trả về: { hisCode, queueNumber } - mã hồ sơ và số thứ tự. */
  async registerAppointment(appt) {
    if (this.config.mode === "mock") {
      await this._delay(900);
      // Mô phỏng: HIS cấp mã hồ sơ và số thứ tự trong ngày
      const sameDay = Store.all("appointments").filter(a => a.date === appt.date).length;
      return {
        hisCode: "HIS-" + Math.floor(40000 + Math.random() * 9999),
        queueNumber: sameDay + 1
      };
    }
    const data = await this._call("/appointments", {
      method: "POST",
      body: JSON.stringify({
        patientName: appt.name,
        dateOfBirth: appt.dob,
        phone: appt.phone,
        idNumber: appt.cccd,
        insuranceNumber: appt.bhyt,
        departmentCode: appt.dept,
        doctorCode: appt.doctor,
        appointmentDate: appt.date,
        timeSlot: appt.slot,
        reason: appt.symptom
      })
    });
    return { hisCode: data.recordCode, queueNumber: data.queueNumber };
  },

  /* Hủy lịch hẹn trên HIS */
  async cancelAppointment(hisCode) {
    if (this.config.mode === "mock") {
      await this._delay(400);
      return { ok: true };
    }
    await this._call(`/appointments/${hisCode}/cancel`, { method: "POST" });
    return { ok: true };
  }
};
