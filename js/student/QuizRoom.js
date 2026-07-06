// ============================================================
// COMPONENT: QuizRoom
// ============================================================
// Vòng lặp chính của bài thi:
//   - Hiển thị nghĩa Tiếng Việt, học sinh gõ từ Tiếng Anh
//   - Mỗi câu có 15 giây (CountdownTimer)
//   - Submit hoặc hết giờ -> kiểm tra đáp án -> hiện feedback 1.5s -> câu tiếp theo
//   - AntiCheatGuard giám sát song song; hễ vi phạm -> huỷ bài thi ngay lập tức

import { CountdownTimer } from "./CountdownTimer.js";
import { getQuizSetById } from "../models/QuizSet.js";
import { joinRoom, submitResult, disqualifyParticipant } from "../models/Session.js";
import { isAnswerCorrect, toPercent, shuffleArray, formatDuration } from "../utils.js";

const SECONDS_PER_QUESTION = 15;
const FEEDBACK_DELAY_MS = 1500;

export class QuizRoom {
  constructor({ elements, antiCheatGuard, onDisqualified, onFinished }) {
    this.el = elements; // xem student.html để biết danh sách các phần tử được truyền vào
    this.antiCheatGuard = antiCheatGuard;
    this.onDisqualified = onDisqualified;
    this.onFinished = onFinished;

    this.timer = new CountdownTimer(
      this.el.timerContainer,
      SECONDS_PER_QUESTION,
      () => {}, // onTick - có thể mở rộng để phát âm thanh tích tắc nếu muốn
      () => this._handleTimeUp()
    );

    this.awaitingNext = false; // true trong lúc đang hiển thị feedback, chặn double-submit
  }

  /**
   * Bắt đầu phiên thi cho một học sinh trong một phòng cụ thể.
   */
  async start({ pin, room, studentId, studentName }) {
    this.pin = pin;
    this.room = room;
    this.studentId = studentId;
    this.studentName = studentName;

    const quizSet = await getQuizSetById(room.quizSetId);
    if (!quizSet) {
      throw new Error("Không tìm thấy bộ từ vựng của phòng thi này.");
    }
    this.words = shuffleArray(quizSet.words);
    this.totalQuestions = this.words.length;
    this.currentIndex = 0;
    this.correctCount = 0;
    this.startedAt = Date.now();

    await joinRoom(pin, studentId, studentName, this.totalQuestions);

    // Kích hoạt giám sát chống gian lận NGAY khi bắt đầu làm bài
    this.antiCheatGuard.onViolation = (code, text) => this._handleViolation(code, text);
    this.antiCheatGuard.start();

    this._renderProgressDots();
    this._renderQuestion();
  }

  _renderProgressDots() {
    this.el.progressDotRow.innerHTML = this.words
      .map(() => `<div class="progress-dot"></div>`)
      .join("");
  }

  _updateProgressDots() {
    const dots = this.el.progressDotRow.querySelectorAll(".progress-dot");
    dots.forEach((dot, idx) => {
      dot.classList.toggle("is-done", idx < this.currentIndex);
    });
  }

  _renderQuestion() {
    this.awaitingNext = false;
    const word = this.words[this.currentIndex];
    this.el.meaningText.textContent = word.vi;
    this.el.answerInput.value = "";
    this.el.answerInput.disabled = false;
    this.el.submitBtn.disabled = false;
    this.el.feedbackBanner.className = "feedback-banner";
    this.el.counterLabel.textContent = `Câu ${this.currentIndex + 1} / ${this.totalQuestions}`;
    this._updateProgressDots();
    this.el.answerInput.focus();
    this.timer.start();
  }

  /** Gọi khi học sinh bấm nút Submit */
  handleSubmit() {
    if (this.awaitingNext) return;
    this.timer.stop();
    const userAnswer = this.el.answerInput.value;
    this._showFeedbackAndAdvance(userAnswer);
  }

  _handleTimeUp() {
    if (this.awaitingNext) return;
    // Hết giờ = coi như câu trả lời hiện tại (có thể rỗng)
    const userAnswer = this.el.answerInput.value;
    this._showFeedbackAndAdvance(userAnswer);
  }

  _showFeedbackAndAdvance(userAnswer) {
    this.awaitingNext = true;
    this.el.answerInput.disabled = true;
    this.el.submitBtn.disabled = true;

    const word = this.words[this.currentIndex];
    const correct = isAnswerCorrect(userAnswer, word.en);
    if (correct) this.correctCount++;

    this.el.feedbackBanner.classList.add("is-visible", correct ? "is-correct" : "is-incorrect");
    this.el.feedbackBanner.innerHTML = correct
      ? `<span>✓ Correct!</span>`
      : `<span>✗ Incorrect! Đáp án đúng: <strong>${word.en}</strong></span>`;

    setTimeout(() => {
      this.currentIndex++;
      if (this.currentIndex >= this.totalQuestions) {
        this._finish();
      } else {
        this._renderQuestion();
      }
    }, FEEDBACK_DELAY_MS);
  }

  async _finish() {
    this.antiCheatGuard.stop();
    const durationSeconds = Math.round((Date.now() - this.startedAt) / 1000);
    const accuracy = toPercent(this.correctCount, this.totalQuestions);

    await submitResult(this.pin, this.studentId, {
      correctCount: this.correctCount,
      totalQuestions: this.totalQuestions,
      accuracy,
      durationSeconds,
    });

    this.onFinished({
      correctCount: this.correctCount,
      totalQuestions: this.totalQuestions,
      accuracy,
      durationLabel: formatDuration(durationSeconds),
    });
  }

  /**
   * Xử lý khi AntiCheatGuard phát hiện vi phạm:
   * HUỶ TOÀN BỘ BÀI THI ngay lập tức, xoá sạch tiến trình, không lưu dữ liệu.
   */
  async _handleViolation(code, text) {
    this.timer.stop();
    try {
      // Xoá bản ghi participant khỏi Firestore -> không còn dấu vết bài làm
      await disqualifyParticipant(this.pin, this.studentId);
    } catch (err) {
      console.error("Lỗi khi xoá dữ liệu vi phạm:", err);
    }
    this.onDisqualified(text);
  }
}
