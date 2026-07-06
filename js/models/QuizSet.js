// ============================================================
// MODEL: QuizSet — Bộ từ vựng do giáo viên tạo ra
// ============================================================
// Cấu trúc lưu trong Firestore, collection "quizSets":
// {
//   id: string (tự sinh),
//   teacherId: string (uid của giáo viên),
//   name: string (tên bộ đề, ví dụ "Unit 5 - Animals"),
//   words: [{ en: "cat", vi: "con mèo" }, ...],
//   createdAt: Timestamp
// }

import {
  db,
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "../firebase-config.js";

const COLLECTION_NAME = "quizSets";

/**
 * Tạo mới một bộ từ vựng trong Firestore.
 */
export async function createQuizSet(teacherId, name, words) {
  const ref = await addDoc(collection(db, COLLECTION_NAME), {
    teacherId,
    name,
    words,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Lấy toàn bộ danh sách bộ từ vựng của một giáo viên.
 */
export async function getQuizSetsByTeacher(teacherId) {
  const q = query(collection(db, COLLECTION_NAME), where("teacherId", "==", teacherId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Lấy chi tiết một bộ từ vựng theo id.
 */
export async function getQuizSetById(quizSetId) {
  const snap = await getDoc(doc(db, COLLECTION_NAME, quizSetId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Xoá một bộ từ vựng.
 */
export async function deleteQuizSet(quizSetId) {
  await deleteDoc(doc(db, COLLECTION_NAME, quizSetId));
}
