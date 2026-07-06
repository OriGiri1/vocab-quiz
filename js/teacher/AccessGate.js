// ============================================================
// COMPONENT: AccessGate
// ============================================================
// Chặn truy cập vào các trang dành riêng cho giáo viên (teacher.html, dashboard.html)
// bằng một mã truy cập đơn giản (không cần tài khoản Google/email — theo đúng yêu cầu
// dùng cho 1 giáo viên duy nhất).
//
// LƯU Ý QUAN TRỌNG VỀ BẢO MẬT:
// Đây chỉ là một lớp chặn ở PHÍA TRÌNH DUYỆT (client-side). Mã truy cập nằm trong
// mã nguồn JS nên về lý thuyết người dùng có thể xem được nếu cố tình mở DevTools.
// Lớp này đủ để ngăn học sinh vô tình/tò mò vào phá trang giáo viên, nhưng KHÔNG
// thay thế được một hệ thống xác thực thực sự. Nếu cần bảo mật chặt hơn sau này,
// nên chuyển sang Firebase Auth (Email/Password) + Firestore Security Rules kiểm
// tra theo uid, thay vì chuỗi mã cố định như hiện tại.

const STORAGE_KEY = "vocabquiz_teacher_authed";
const TEACHER_ACCESS_CODE = "HangDang";

/**
 * @param {HTMLElement} overlayEl - overlay chứa ô nhập mã (xem #gate-overlay trong HTML)
 * @param {Function} onGranted - callback được gọi khi mã đúng (hoặc đã từng nhập đúng trong phiên này)
 */
export function requireTeacherAccess(overlayEl, onGranted) {
  if (sessionStorage.getItem(STORAGE_KEY) === "true") {
    overlayEl.classList.add("hidden");
    onGranted();
    return;
  }

  overlayEl.classList.remove("hidden");
  const input = overlayEl.querySelector("#input-teacher-code");
  const btn = overlayEl.querySelector("#btn-teacher-code-submit");
  const errorEl = overlayEl.querySelector("#teacher-code-error");

  const attempt = () => {
    if (input.value === TEACHER_ACCESS_CODE) {
      sessionStorage.setItem(STORAGE_KEY, "true");
      overlayEl.classList.add("hidden");
      onGranted();
    } else {
      errorEl.textContent = "Mã truy cập không đúng. Vui lòng thử lại.";
      input.value = "";
      input.focus();
    }
  };

  btn.addEventListener("click", attempt);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") attempt();
  });
  input.focus();
}
