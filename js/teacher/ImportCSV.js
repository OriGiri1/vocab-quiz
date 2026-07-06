// ============================================================
// COMPONENT: ImportCSV
// ============================================================
// Cho phép giáo viên tạo bộ từ vựng mới bằng cách:
//   - Nhập tay trực tiếp, hoặc
//   - Import file .csv (2 cột: Tiếng Anh, Tiếng Việt), hoặc
//   - Import file .xlsx (dùng thư viện SheetJS nạp qua CDN trong teacher.html)

import { createQuizSet } from "../models/QuizSet.js";
import { parseCsvToWordList, parseXlsxToWordList, showToast } from "../utils.js";

export class ImportCSV {
  constructor({ modalEl, teacherId, onCreated }) {
    this.modal = modalEl;
    this.teacherId = teacherId;
    this.onCreated = onCreated;
    this.parsedWords = [];
    this._bind();
  }

  open() {
    this.modal.classList.remove("hidden");
    this.parsedWords = [];
    this.modal.querySelector("#import-preview").innerHTML = "";
    this.modal.querySelector("#input-quizset-name").value = "";
    this.modal.querySelector("#input-file").value = "";
  }

  close() {
    this.modal.classList.add("hidden");
  }

  _bind() {
    const fileInput = this.modal.querySelector("#input-file");
    const closeBtn = this.modal.querySelector("#btn-close-import");
    const saveBtn = this.modal.querySelector("#btn-save-quizset");

    closeBtn.addEventListener("click", () => this.close());

    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        if (file.name.toLowerCase().endsWith(".csv")) {
          const text = await file.text();
          this.parsedWords = parseCsvToWordList(text);
        } else if (file.name.toLowerCase().endsWith(".xlsx")) {
          const buffer = await file.arrayBuffer();
          const workbook = window.XLSX.read(buffer, { type: "array" });
          this.parsedWords = parseXlsxToWordList(workbook);
        } else {
          showToast("Chỉ hỗ trợ file .csv hoặc .xlsx", "danger");
          return;
        }
        this._renderPreview();
      } catch (err) {
        console.error(err);
        showToast("Không đọc được file. Vui lòng kiểm tra định dạng.", "danger");
      }
    });

    saveBtn.addEventListener("click", async () => {
      const name = this.modal.querySelector("#input-quizset-name").value.trim();
      if (!name) {
        showToast("Vui lòng đặt tên cho bộ từ vựng.", "danger");
        return;
      }
      if (this.parsedWords.length === 0) {
        showToast("Chưa có từ vựng nào để lưu. Vui lòng import file.", "danger");
        return;
      }
      saveBtn.disabled = true;
      saveBtn.textContent = "Đang lưu...";
      try {
        const id = await createQuizSet(this.teacherId, name, this.parsedWords);
        showToast(`Đã tạo bộ từ vựng "${name}" (${this.parsedWords.length} từ).`, "success");
        this.close();
        this.onCreated({ id, name, words: this.parsedWords });
      } catch (err) {
        console.error(err);
        showToast("Lỗi khi lưu bộ từ vựng.", "danger");
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Lưu bộ từ vựng";
      }
    });
  }

  _renderPreview() {
    const preview = this.modal.querySelector("#import-preview");
    if (this.parsedWords.length === 0) {
      preview.innerHTML = `<p class="subtitle">Không tìm thấy từ vựng hợp lệ trong file.</p>`;
      return;
    }
    const rows = this.parsedWords
      .slice(0, 8)
      .map((w) => `<tr><td>${w.en}</td><td>${w.vi}</td></tr>`)
      .join("");
    preview.innerHTML = `
      <p class="subtitle">Đã đọc được <strong>${this.parsedWords.length}</strong> từ. Xem trước:</p>
      <table class="results-table">
        <thead><tr><th>English</th><th>Tiếng Việt</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${this.parsedWords.length > 8 ? `<p class="subtitle">... và ${this.parsedWords.length - 8} từ khác</p>` : ""}
    `;
  }
}
