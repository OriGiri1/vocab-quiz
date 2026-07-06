// ============================================================
// COMPONENT: StudentJoin
// ============================================================
// Xử lý 2 màn hình đầu tiên phía học sinh:
//   1. Lobby: nhập mã PIN (nếu chưa có sẵn từ URL) + nhập tên.
//   2. Rules: hiển thị luật thi + nút lớn để kích hoạt Fullscreen (bắt buộc
//      phải là hành động click trực tiếp của người dùng).
// Sau khi fullscreen được bật thành công, gọi onReady({ pin, studentName }).

import { getRoomByPin } from "../models/Session.js";
import { getUrlParam, showToast } from "../utils.js";

export class StudentJoin {
  constructor({ screenJoin, screenRules, antiCheatGuard, onReady }) {
    this.screenJoin = screenJoin;
    this.screenRules = screenRules;
    this.antiCheatGuard = antiCheatGuard;
    this.onReady = onReady;
    this.pendingRoom = null;
    this._bindJoinScreen();
  }

  _bindJoinScreen() {
    const pinFromUrl = getUrlParam("pin");
    const pinInput = this.screenJoin.querySelector("#input-pin");
    const nameInput = this.screenJoin.querySelector("#input-name");
    const joinBtn = this.screenJoin.querySelector("#btn-join");

    if (pinFromUrl) {
      pinInput.value = pinFromUrl;
    }

    const handleJoin = async () => {
      const pin = pinInput.value.trim();
      const name = nameInput.value.trim();

      if (!/^\d{6}$/.test(pin)) {
        showToast("Mã PIN phải gồm đúng 6 chữ số.", "danger");
        return;
      }
      if (!name) {
        showToast("Vui lòng nhập tên của bạn.", "danger");
        return;
      }

      joinBtn.disabled = true;
      joinBtn.textContent = "Đang kiểm tra phòng thi...";

      try {
        const room = await getRoomByPin(pin);
        if (!room) {
          showToast("Không tìm thấy phòng thi với mã PIN này.", "danger");
          return;
        }
        if (room.status === "ended") {
          showToast("Phòng thi này đã kết thúc.", "danger");
          return;
        }
        this.pendingRoom = { pin, room, studentName: name };
        this._showRulesScreen();
      } catch (err) {
        console.error(err);
        showToast("Có lỗi xảy ra, vui lòng thử lại.", "danger");
      } finally {
        joinBtn.disabled = false;
        joinBtn.textContent = "Tham gia phòng thi";
      }
    };

    joinBtn.addEventListener("click", handleJoin);
    nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleJoin();
    });
  }

  _showRulesScreen() {
    this.screenJoin.classList.add("hidden");
    this.screenRules.classList.remove("hidden");

    const startBtn = this.screenRules.querySelector("#btn-start-fullscreen");
    // Gắn listener mỗi lần hiển thị để đảm bảo hành động fullscreen luôn
    // xuất phát trực tiếp từ cú click này (yêu cầu bắt buộc của trình duyệt).
    const handleStart = async () => {
      try {
        await this.antiCheatGuard.requestFullscreen();
        this.onReady(this.pendingRoom);
      } catch (err) {
        console.error(err);
        showToast("Trình duyệt của bạn chặn chế độ toàn màn hình. Vui lòng cho phép và thử lại.", "danger");
      }
    };
    startBtn.addEventListener("click", handleStart, { once: true });
  }
}
