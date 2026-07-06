// ============================================================
// UTILS — CÁC HÀM TIỆN ÍCH DÙNG CHUNG
// ============================================================

/**
 * Sinh ra một mã PIN gồm 6 chữ số ngẫu nhiên (100000 - 999999)
 * Dùng làm mã phòng thi để học sinh tham gia.
 */
export function generateRoomPin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * So sánh đáp án của học sinh với đáp án đúng.
 * Chuẩn hoá: bỏ khoảng trắng thừa, không phân biệt hoa/thường.
 */
export function isAnswerCorrect(userInput, correctAnswer) {
  const normalize = (s) =>
    String(s || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  return normalize(userInput) === normalize(correctAnswer);
}

/**
 * Làm tròn tỉ lệ phần trăm đến hàng đơn vị.
 */
export function toPercent(correct, total) {
  if (!total) return 0;
  return Math.round((correct / total) * 100);
}

/**
 * Định dạng thời gian hoàn thành (giây) -> "phút:giây"
 */
export function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Trộn ngẫu nhiên thứ tự mảng câu hỏi (Fisher-Yates shuffle)
 */
export function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Parse nội dung file CSV (2 cột: Tiếng Anh, Tiếng Việt) thành mảng object.
 * Hỗ trợ dấu phẩy hoặc dấu chấm phẩy làm dấu phân cách, tự bỏ qua dòng trống
 * và dòng tiêu đề (header) nếu phát hiện.
 */
export function parseCsvToWordList(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const words = [];
  lines.forEach((line, idx) => {
    const delimiter = line.includes(";") && !line.includes(",") ? ";" : ",";
    const parts = line.split(delimiter).map((p) => p.trim().replace(/^"|"$/g, ""));
    if (parts.length < 2) return;
    const [en, vi] = parts;
    // Bỏ qua dòng tiêu đề dạng "english,vietnamese" hoặc "tiếng anh,tiếng việt"
    if (
      idx === 0 &&
      /^(english|en|tiếng anh|tieng anh|word)$/i.test(en) &&
      /^(vietnamese|vi|tiếng việt|tieng viet|meaning)$/i.test(vi)
    ) {
      return;
    }
    if (en && vi) words.push({ en, vi });
  });
  return words;
}

/**
 * Đọc dữ liệu từ file Excel (.xlsx) bằng thư viện SheetJS (đã nạp qua CDN trong HTML)
 * và chuyển thành mảng { en, vi }.
 */
export function parseXlsxToWordList(workbook) {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const words = [];
  rows.forEach((row, idx) => {
    if (!row || row.length < 2) return;
    const en = String(row[0] || "").trim();
    const vi = String(row[1] || "").trim();
    if (
      idx === 0 &&
      /^(english|en|tiếng anh|tieng anh|word)$/i.test(en) &&
      /^(vietnamese|vi|tiếng việt|tieng viet|meaning)$/i.test(vi)
    ) {
      return;
    }
    if (en && vi) words.push({ en, vi });
  });
  return words;
}

/**
 * Hiển thị một thông báo dạng "toast" nhỏ ở góc màn hình.
 */
export function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("toast-visible"));
  setTimeout(() => {
    toast.classList.remove("toast-visible");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Lấy tham số từ URL, ví dụ ?pin=123456
 */
export function getUrlParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}
