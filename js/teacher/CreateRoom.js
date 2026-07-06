// ============================================================
// COMPONENT: CreateRoom
// ============================================================
// Khi giáo viên chọn một bộ từ vựng và bấm "Tạo phòng thi":
//   - Tạo document mới trong Firestore (collection "rooms")
//   - Sinh mã PIN 6 chữ số + link trực tiếp dạng domain.com/student.html?pin=xxxxxx
//   - Hiển thị lên modal để giáo viên gửi cho học sinh

import { createRoom } from "../models/Session.js";
import { showToast } from "../utils.js";

export class CreateRoom {
  constructor({ modalEl, teacherId, onRoomCreated }) {
    this.modal = modalEl;
    this.teacherId = teacherId;
    this.onRoomCreated = onRoomCreated;
  }

  async createForQuizSet(quizSet) {
    this.modal.classList.remove("hidden");
    this.modal.querySelector("#room-pin-value").textContent = "......";
    this.modal.querySelector("#room-link-value").textContent = "Đang tạo phòng...";

    try {
      const pin = await createRoom(this.teacherId, quizSet);
      const studentLink = `${window.location.origin}${window.location.pathname.replace(
        "teacher.html",
        "student.html"
      )}?pin=${pin}`;
      const dashboardLink = `${window.location.origin}${window.location.pathname.replace(
        "teacher.html",
        "dashboard.html"
      )}?pin=${pin}`;

      this.modal.querySelector("#room-pin-value").textContent = pin;
      const linkEl = this.modal.querySelector("#room-link-value");
      linkEl.textContent = studentLink;
      linkEl.href = studentLink;

      this.modal.querySelector("#btn-copy-link").onclick = () => {
        navigator.clipboard.writeText(studentLink);
        showToast("Đã sao chép link cho học sinh vào clipboard!", "success");
      };

      const dashboardBtn = this.modal.querySelector("#btn-open-dashboard");
      dashboardBtn.onclick = () => window.open(dashboardLink, "_blank");

      this.onRoomCreated({ pin, quizSet });
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi tạo phòng thi.", "danger");
      this.close();
    }
  }

  close() {
    this.modal.classList.add("hidden");
  }
}
