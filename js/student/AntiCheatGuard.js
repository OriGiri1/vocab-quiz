// ============================================================
// COMPONENT: AntiCheatGuard
// ============================================================
// Giám sát 3 hành vi gian lận trong suốt thời gian làm bài:
//   1. Thoát chế độ Full-screen (bấm ESC, vuốt thoát trên mobile...)
//   2. Chuyển sang tab/cửa sổ trình duyệt khác (Page Visibility API)
//   3. Mất focus cửa sổ (ví dụ mở app khác đè lên trình duyệt -> window blur)
//
// Khi phát hiện VI PHẠM BẤT KỲ điều nào ở trên: gọi ngay onViolation(reason).
// Toàn bộ logic HUỶ BÀI THI + XOÁ DỮ LIỆU được xử lý ở phía gọi (QuizRoom.js),
// AntiCheatGuard chỉ có nhiệm vụ PHÁT HIỆN và BÁO ĐỘNG NGAY LẬP TỨC.

export class AntiCheatGuard {
  /**
   * @param {Function} onViolation - callback(reasonCode, reasonText) khi phát hiện gian lận
   */
  constructor(onViolation) {
    this.onViolation = onViolation;
    this.active = false;

    // Bind để có thể removeEventListener chính xác sau này
    this._handleFullscreenChange = this._handleFullscreenChange.bind(this);
    this._handleVisibilityChange = this._handleVisibilityChange.bind(this);
    this._handleWindowBlur = this._handleWindowBlur.bind(this);
  }

  /**
   * Yêu cầu trình duyệt bật chế độ toàn màn hình.
   * PHẢI được gọi trực tiếp bên trong một sự kiện click của người dùng
   * (theo chính sách bảo mật của trình duyệt - "user gesture required").
   */
  async requestFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      await el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
      // Safari
      await el.webkitRequestFullscreen();
    } else if (el.msRequestFullscreen) {
      // Trình duyệt cũ trên Windows
      await el.msRequestFullscreen();
    } else {
      throw new Error("Trình duyệt này không hỗ trợ chế độ toàn màn hình.");
    }
  }

  isFullscreenActive() {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.msFullscreenElement
    );
  }

  /** Bắt đầu giám sát. Gọi ngay sau khi vào phòng thi + bật fullscreen thành công. */
  start() {
    if (this.active) return;
    this.active = true;
    document.addEventListener("fullscreenchange", this._handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", this._handleFullscreenChange);
    document.addEventListener("msfullscreenchange", this._handleFullscreenChange);
    document.addEventListener("visibilitychange", this._handleVisibilityChange);
    window.addEventListener("blur", this._handleWindowBlur);
  }

  /** Dừng giám sát (khi bài thi kết thúc hợp lệ, hoặc đã bị loại). */
  stop() {
    this.active = false;
    document.removeEventListener("fullscreenchange", this._handleFullscreenChange);
    document.removeEventListener("webkitfullscreenchange", this._handleFullscreenChange);
    document.removeEventListener("msfullscreenchange", this._handleFullscreenChange);
    document.removeEventListener("visibilitychange", this._handleVisibilityChange);
    window.removeEventListener("blur", this._handleWindowBlur);
  }

  _handleFullscreenChange() {
    if (!this.active) return;
    if (!this.isFullscreenActive()) {
      this._triggerViolation("EXIT_FULLSCREEN", "Bạn đã thoát khỏi chế độ toàn màn hình.");
    }
  }

  _handleVisibilityChange() {
    if (!this.active) return;
    if (document.hidden) {
      this._triggerViolation("TAB_SWITCH", "Bạn đã chuyển sang tab hoặc ứng dụng khác.");
    }
  }

  _handleWindowBlur() {
    if (!this.active) return;
    // window blur bắt được cả trường hợp mở app khác đè lên trình duyệt
    // (trên desktop). Trên một số trình duyệt, fullscreenchange/visibilitychange
    // đã bắt được trước, nên đây là lớp bảo vệ bổ sung.
    this._triggerViolation("WINDOW_BLUR", "Cửa sổ trình duyệt đã bị mất focus.");
  }

  _triggerViolation(code, text) {
    // Dừng giám sát ngay để tránh bắn nhiều sự kiện trùng lặp
    // (ví dụ thoát fullscreen thường kéo theo cả visibilitychange).
    if (!this.active) return;
    this.stop();
    this.onViolation(code, text);
  }
}
