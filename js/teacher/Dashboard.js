// ============================================================
// COMPONENT: Dashboard (controller cho dashboard.html)
// ============================================================
// Trang xem kết quả real-time của MỘT phòng thi cụ thể (?pin=xxxxxx).
// Vì đọc dữ liệu trực tiếp từ Firestore (room doc + participants subcollection),
// việc refresh lại trang KHÔNG làm mất dữ liệu — chỉ đơn giản là kết nối lại
// listener real-time và tải lại thông tin phòng.

import { ensureAuth } from "../firebase-config.js";
import { getRoomByPin, endRoom } from "../models/Session.js";
import { ResultsTable } from "./ResultsTable.js";
import { getUrlParam, showToast } from "../utils.js";

export class Dashboard {
  async init() {
    await ensureAuth();

    const pin = getUrlParam("pin");
    const errorBox = document.querySelector("#dashboard-error");
    const contentBox = document.querySelector("#dashboard-content-inner");

    if (!pin) {
      errorBox.textContent = "Thiếu mã PIN trong đường dẫn.";
      errorBox.classList.remove("hidden");
      return;
    }

    const room = await getRoomByPin(pin);
    if (!room) {
      errorBox.textContent = `Không tìm thấy phòng thi với mã PIN ${pin}.`;
      errorBox.classList.remove("hidden");
      return;
    }

    contentBox.classList.remove("hidden");
    document.querySelector("#dashboard-pin").textContent = pin;
    document.querySelector("#dashboard-quizset-name").textContent = room.quizSetName || "—";
    this._renderStatus(room.status);

    const endBtn = document.querySelector("#btn-end-room");
    if (room.status === "ended") {
      endBtn.classList.add("hidden");
    } else {
      endBtn.classList.remove("hidden");
      endBtn.addEventListener("click", async () => {
        if (!confirm("Kết thúc phòng thi này? Học sinh sẽ không thể tham gia thêm.")) return;
        await endRoom(pin);
        this._renderStatus("ended");
        endBtn.classList.add("hidden");
        showToast("Đã kết thúc phòng thi.", "info");
      });
    }

    // Bảng kết quả tự cập nhật real-time và tự sắp xếp % cao -> thấp
    const resultsTable = new ResultsTable({ containerEl: document.querySelector("#results-table-container") });
    resultsTable.watchRoom(pin);
  }

  _renderStatus(status) {
    const el = document.querySelector("#dashboard-status");
    el.innerHTML =
      status === "ended"
        ? `<span class="status-badge" style="background:rgba(139,152,165,0.15); color:var(--color-text-dim);">Đã kết thúc</span>`
        : `<span class="status-badge in-progress">Đang mở</span>`;
  }
}
