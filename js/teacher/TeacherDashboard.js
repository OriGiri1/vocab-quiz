// ============================================================
// COMPONENT: TeacherDashboard
// ============================================================
// Điều phối chính cho teacher.html:
//   - Đăng nhập ẩn danh để có teacherId
//   - Tải & hiển thị danh sách bộ từ vựng đã tạo
//   - Tải & hiển thị danh sách PHÒNG THI ĐANG MỞ (kèm tên bộ đề đang dùng) —
//     danh sách này được lưu trên Firestore nên KHÔNG bị mất khi refresh trang.
//   - Tự động dọn dẹp các phòng đã quá 7 ngày mỗi khi trang được tải.
//   - Mở modal Import / Tạo phòng thi. Bảng kết quả real-time nằm ở dashboard.html riêng.

import { ensureAuth } from "../firebase-config.js";
import { getQuizSetsByTeacher, deleteQuizSet } from "../models/QuizSet.js";
import { getRoomsByTeacher, endRoom, cleanupOldRooms } from "../models/Session.js";
import { ImportCSV } from "./ImportCSV.js";
import { CreateRoom } from "./CreateRoom.js";
import { showToast } from "../utils.js";

export class TeacherDashboard {
  constructor() {
    this.quizSetGrid = document.querySelector("#quizset-grid");
    this.roomList = document.querySelector("#room-list");
  }

  async init() {
    const user = await ensureAuth();
    this.teacherId = user.uid;

    this.importCsv = new ImportCSV({
      modalEl: document.querySelector("#modal-import"),
      teacherId: this.teacherId,
      onCreated: () => this._loadQuizSets(),
    });

    this.createRoom = new CreateRoom({
      modalEl: document.querySelector("#modal-room"),
      teacherId: this.teacherId,
      onRoomCreated: () => this._loadRooms(),
    });

    document.querySelector("#btn-new-quizset").addEventListener("click", () => this.importCsv.open());
    document.querySelector("#btn-close-room-modal").addEventListener("click", () => this.createRoom.close());

    // Dọn dẹp các phòng đã quá 7 ngày trước khi hiển thị danh sách,
    // để dữ liệu không tồn đọng vô thời hạn nhưng vẫn giữ tối thiểu 1 tuần.
    try {
      const removed = await cleanupOldRooms(this.teacherId, 7);
      if (removed > 0) {
        showToast(`Đã tự động dọn dẹp ${removed} phòng thi cũ (quá 7 ngày).`, "info");
      }
    } catch (err) {
      console.error("Lỗi khi dọn dẹp phòng cũ:", err);
    }

    await Promise.all([this._loadQuizSets(), this._loadRooms()]);
  }

  async _loadQuizSets() {
    this.quizSets = await getQuizSetsByTeacher(this.teacherId);
    this._renderQuizSetGrid();
  }

  async _loadRooms() {
    this.rooms = await getRoomsByTeacher(this.teacherId);
    this._renderRoomList();
  }

  _renderQuizSetGrid() {
    if (this.quizSets.length === 0) {
      this.quizSetGrid.innerHTML = `<p class="subtitle">Bạn chưa có bộ từ vựng nào. Bấm "+ Tạo bộ từ vựng" để bắt đầu.</p>`;
      return;
    }

    this.quizSetGrid.innerHTML = this.quizSets
      .map(
        (qs) => `
        <div class="quiz-card" data-id="${qs.id}">
          <h3>${qs.name}</h3>
          <div class="quiz-card-count">${qs.words.length} từ vựng</div>
          <div style="margin-top:14px; display:flex; gap:8px;">
            <button class="btn btn-primary btn-start-room" data-id="${qs.id}" style="flex:1; padding:10px;">Tạo phòng thi</button>
            <button class="btn btn-secondary btn-delete-quizset" data-id="${qs.id}" style="padding:10px;">Xoá</button>
          </div>
        </div>
      `
      )
      .join("");

    this.quizSetGrid.querySelectorAll(".btn-start-room").forEach((btn) => {
      btn.addEventListener("click", () => {
        const qs = this.quizSets.find((q) => q.id === btn.dataset.id);
        this.createRoom.createForQuizSet(qs);
      });
    });

    this.quizSetGrid.querySelectorAll(".btn-delete-quizset").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Xoá bộ từ vựng này? Hành động không thể hoàn tác.")) return;
        await deleteQuizSet(btn.dataset.id);
        showToast("Đã xoá bộ từ vựng.", "info");
        this._loadQuizSets();
      });
    });
  }

  _renderRoomList() {
    if (!this.rooms || this.rooms.length === 0) {
      this.roomList.innerHTML = `<p class="subtitle">Chưa có phòng thi nào. Tạo phòng thi từ một bộ từ vựng ở trên.</p>`;
      return;
    }

    this.roomList.innerHTML = this.rooms
      .map((r) => {
        const createdDate = r.createdAt?.toDate ? r.createdAt.toDate() : null;
        const createdLabel = createdDate ? createdDate.toLocaleString("vi-VN") : "—";
        const isEnded = r.status === "ended";
        const statusBadge = isEnded
          ? `<span class="status-badge" style="background:rgba(139,152,165,0.15); color:var(--color-text-dim);">Đã kết thúc</span>`
          : `<span class="status-badge in-progress">Đang mở</span>`;

        return `
          <div class="quiz-card" style="cursor:default;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
              <div>
                <div class="mono" style="font-size:22px; font-weight:700; color:var(--color-accent); letter-spacing:0.06em;">${r.id}</div>
                <div class="quiz-card-count">Bộ đề: <strong>${r.quizSetName || "—"}</strong></div>
                <div class="quiz-card-count">Tạo lúc: ${createdLabel}</div>
              </div>
              ${statusBadge}
            </div>
            <div style="margin-top:14px; display:flex; gap:8px; flex-wrap:wrap;">
              <a href="dashboard.html?pin=${r.id}" class="btn btn-primary" style="flex:1; min-width:140px; padding:10px; text-align:center; text-decoration:none;">Xem Live Dashboard</a>
              ${
                isEnded
                  ? ""
                  : `<button class="btn btn-secondary btn-end-room" data-pin="${r.id}" style="padding:10px;">Kết thúc phòng</button>`
              }
            </div>
          </div>
        `;
      })
      .join("");

    this.roomList.querySelectorAll(".btn-end-room").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Kết thúc phòng thi này? Học sinh sẽ không thể tham gia thêm (dữ liệu vẫn được giữ lại).")) return;
        await endRoom(btn.dataset.pin);
        showToast("Đã kết thúc phòng thi.", "info");
        this._loadRooms();
      });
    });
  }
}
