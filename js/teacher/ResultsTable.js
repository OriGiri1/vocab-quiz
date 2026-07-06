// ============================================================
// COMPONENT: ResultsTable
// ============================================================
// Lắng nghe real-time danh sách participants của một phòng thi và
// hiển thị: Tên học sinh, Số câu đúng (dạng phân số), Tỉ lệ %, Thời gian hoàn thành.

import { listenParticipants } from "../models/Session.js";
import { formatDuration } from "../utils.js";

export class ResultsTable {
  constructor({ containerEl }) {
    this.container = containerEl;
    this.unsubscribe = null;
  }

  /** Bắt đầu theo dõi real-time kết quả của một phòng thi cụ thể. */
  watchRoom(pin) {
    this.stopWatching();
    this.unsubscribe = listenParticipants(pin, (participants) => {
      this._render(participants);
    });
  }

  stopWatching() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  _render(participants) {
    if (participants.length === 0) {
      this.container.innerHTML = `<p class="subtitle">Chưa có học sinh nào tham gia.</p>`;
      return;
    }

    // Sắp xếp: hoàn thành trước (theo % giảm dần), đang làm bài sau
    const sorted = [...participants].sort((a, b) => {
      if (a.status !== b.status) return a.status === "completed" ? -1 : 1;
      return (b.accuracy || 0) - (a.accuracy || 0);
    });

    const rows = sorted
      .map((p) => {
        const isCompleted = p.status === "completed";
        const scoreLabel = isCompleted ? `${p.correctCount}/${p.totalQuestions}` : "—";
        const percentLabel = isCompleted ? `${p.accuracy}%` : "—";
        const durationLabel = isCompleted ? formatDuration(p.durationSeconds) : "—";
        const statusLabel = isCompleted
          ? `<span class="status-badge completed">Hoàn thành</span>`
          : `<span class="status-badge in-progress">Đang làm bài</span>`;
        return `
          <tr>
            <td>${p.name}</td>
            <td class="mono">${scoreLabel}</td>
            <td class="mono">${percentLabel}</td>
            <td class="mono">${durationLabel}</td>
            <td>${statusLabel}</td>
          </tr>
        `;
      })
      .join("");

    this.container.innerHTML = `
      <table class="results-table">
        <thead>
          <tr>
            <th>Học sinh</th>
            <th>Số câu đúng</th>
            <th>Tỉ lệ %</th>
            <th>Thời gian</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }
}
