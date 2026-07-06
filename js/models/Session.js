// ============================================================
// MODEL: Session — Phòng thi (Room) và Người tham gia (Participant)
// ============================================================
// Firestore, collection "rooms", document id = mã PIN 6 chữ số:
// {
//   quizSetId: string,
//   quizSetName: string,
//   teacherId: string,
//   status: "waiting" | "active" | "ended",
//   totalQuestions: number,
//   createdAt: Timestamp
// }
//
// Subcollection "rooms/{pin}/participants", document id = studentId (uid ẩn danh):
// {
//   name: string,
//   status: "in-progress" | "completed" | "disqualified",
//   correctCount: number,
//   totalQuestions: number,
//   accuracy: number (%),
//   durationSeconds: number,
//   disqualifyReason: string | null,
//   joinedAt: Timestamp,
//   completedAt: Timestamp | null
// }

import {
  db,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  query,
  where,
} from "../firebase-config.js";
import { generateRoomPin } from "../utils.js";

const ROOMS = "rooms";
const PARTICIPANTS = "participants";

/**
 * Tạo phòng thi mới. Thử sinh mã PIN cho đến khi tìm được mã chưa tồn tại.
 * Trả về mã PIN của phòng vừa tạo.
 */
export async function createRoom(teacherId, quizSet) {
  let pin;
  let attempts = 0;
  // Đảm bảo mã PIN không trùng với phòng đang tồn tại
  while (attempts < 10) {
    pin = generateRoomPin();
    const existing = await getDoc(doc(db, ROOMS, pin));
    if (!existing.exists()) break;
    attempts++;
  }

  await setDoc(doc(db, ROOMS, pin), {
    quizSetId: quizSet.id,
    quizSetName: quizSet.name,
    teacherId,
    status: "waiting",
    totalQuestions: quizSet.words.length,
    createdAt: serverTimestamp(),
  });

  return pin;
}

/**
 * Lấy thông tin phòng thi theo mã PIN.
 */
export async function getRoomByPin(pin) {
  const snap = await getDoc(doc(db, ROOMS, pin));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Học sinh tham gia phòng thi: tạo bản ghi participant mới.
 */
export async function joinRoom(pin, studentId, studentName, totalQuestions) {
  await setDoc(doc(db, ROOMS, pin, PARTICIPANTS, studentId), {
    name: studentName,
    status: "in-progress",
    correctCount: 0,
    totalQuestions,
    accuracy: 0,
    durationSeconds: 0,
    disqualifyReason: null,
    joinedAt: serverTimestamp(),
    completedAt: null,
  });
}

/**
 * Cập nhật kết quả cuối cùng của học sinh khi hoàn thành bài thi.
 */
export async function submitResult(pin, studentId, { correctCount, totalQuestions, accuracy, durationSeconds }) {
  await updateDoc(doc(db, ROOMS, pin, PARTICIPANTS, studentId), {
    status: "completed",
    correctCount,
    totalQuestions,
    accuracy,
    durationSeconds,
    completedAt: serverTimestamp(),
  });
}

/**
 * Đánh dấu học sinh bị loại vì gian lận, đồng thời XOÁ SẠCH bản ghi tiến trình
 * (theo đúng yêu cầu: không lưu bất kỳ dữ liệu bài làm nào khi bị phát hiện gian lận).
 */
export async function disqualifyParticipant(pin, studentId) {
  await deleteDoc(doc(db, ROOMS, pin, PARTICIPANTS, studentId));
}

/**
 * Lắng nghe real-time danh sách người tham gia của một phòng thi (dùng cho Teacher Dashboard).
 * callback nhận vào mảng participants mới nhất mỗi khi có thay đổi.
 * Trả về hàm unsubscribe để huỷ lắng nghe khi rời trang.
 */
export function listenParticipants(pin, callback) {
  return onSnapshot(collection(db, ROOMS, pin, PARTICIPANTS), (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(list);
  });
}

/**
 * Lấy toàn bộ danh sách phòng thi mà một giáo viên đã tạo (dùng để hiển thị lại
 * sau khi refresh trang, kèm tên bộ đề đang dùng). Sắp xếp mới nhất lên trước.
 */
export async function getRoomsByTeacher(teacherId) {
  const q = query(collection(db, ROOMS), where("teacherId", "==", teacherId));
  const snap = await getDocs(q);
  const rooms = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rooms.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
  return rooms;
}

/**
 * Đánh dấu một phòng thi đã kết thúc (không xoá dữ liệu — vẫn giữ lại kết quả
 * để giáo viên xem, cho tới khi bị dọn dẹp tự động sau 7 ngày).
 */
export async function endRoom(pin) {
  await updateDoc(doc(db, ROOMS, pin), { status: "ended" });
}

/**
 * Xoá hoàn toàn một phòng thi: xoá toàn bộ participants rồi xoá document phòng.
 */
export async function deleteRoomCompletely(pin) {
  const partsSnap = await getDocs(collection(db, ROOMS, pin, PARTICIPANTS));
  await Promise.all(partsSnap.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, ROOMS, pin));
}

/**
 * Dọn dẹp các phòng thi cũ hơn `maxAgeDays` ngày (mặc định 7 ngày) của một giáo viên.
 * Nên gọi mỗi khi Teacher Dashboard được tải, để dữ liệu không tồn đọng vô thời hạn
 * nhưng vẫn được giữ lại tối thiểu 1 tuần trước khi xoá.
 * Trả về số lượng phòng đã bị xoá.
 */
export async function cleanupOldRooms(teacherId, maxAgeDays = 7) {
  const rooms = await getRoomsByTeacher(teacherId);
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  const oldRooms = rooms.filter((r) => {
    const createdMs = r.createdAt?.toMillis?.() ?? null;
    return createdMs !== null && createdMs < cutoff;
  });
  await Promise.all(oldRooms.map((r) => deleteRoomCompletely(r.id)));
  return oldRooms.length;
}
