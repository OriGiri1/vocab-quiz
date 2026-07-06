// ============================================================
// COMPONENT: CountdownTimer
// ============================================================
// Bộ đếm ngược cho mỗi câu hỏi. Mặc định 15 giây.
// Hiển thị dưới dạng vòng tròn (ring) thu nhỏ dần, đổi màu khi sắp hết giờ.
// Khi hết giờ tự động gọi callback onTimeUp().

const RADIUS = 32;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export class CountdownTimer {
  /**
   * @param {HTMLElement} container - nơi render vòng đếm giờ
   * @param {number} durationSeconds - tổng thời gian đếm ngược (mặc định 15s)
   * @param {Function} onTick - callback(secondsLeft) mỗi giây
   * @param {Function} onTimeUp - callback khi hết giờ
   */
  constructor(container, durationSeconds = 15, onTick = () => {}, onTimeUp = () => {}) {
    this.container = container;
    this.duration = durationSeconds;
    this.onTick = onTick;
    this.onTimeUp = onTimeUp;
    this.secondsLeft = durationSeconds;
    this.intervalId = null;
    this._render();
  }

  _render() {
    this.container.innerHTML = `
      <div class="countdown-ring-wrap">
        <svg viewBox="0 0 76 76">
          <circle class="countdown-ring-bg" cx="38" cy="38" r="${RADIUS}"></circle>
          <circle class="countdown-ring-fg" cx="38" cy="38" r="${RADIUS}"
            stroke-dasharray="${CIRCUMFERENCE}" stroke-dashoffset="0"></circle>
        </svg>
        <div class="countdown-ring-label">${this.secondsLeft}</div>
      </div>
    `;
    this.ringFg = this.container.querySelector(".countdown-ring-fg");
    this.label = this.container.querySelector(".countdown-ring-label");
  }

  _update() {
    const ratio = this.secondsLeft / this.duration;
    const offset = CIRCUMFERENCE * (1 - ratio);
    this.ringFg.style.strokeDashoffset = String(offset);
    this.label.textContent = this.secondsLeft;

    this.ringFg.classList.remove("is-warning", "is-danger");
    if (this.secondsLeft <= 3) {
      this.ringFg.classList.add("is-danger");
    } else if (this.secondsLeft <= 7) {
      this.ringFg.classList.add("is-warning");
    }
  }

  /** Bắt đầu đếm ngược từ đầu (dùng khi chuyển sang câu hỏi mới) */
  start() {
    this.stop();
    this.secondsLeft = this.duration;
    this._update();
    this.intervalId = setInterval(() => {
      this.secondsLeft -= 1;
      this._update();
      this.onTick(this.secondsLeft);
      if (this.secondsLeft <= 0) {
        this.stop();
        this.onTimeUp();
      }
    }, 1000);
  }

  /** Dừng đếm ngược (dùng khi học sinh bấm Submit trước khi hết giờ) */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
