// ============================================================
// FIREBASE CONFIG — CẤU HÌNH KẾT NỐI FIREBASE
// ============================================================
// 1. Vào https://console.firebase.google.com/ -> Tạo project mới (miễn phí).
// 2. Vào Project Settings -> General -> "Your apps" -> chọn Web (</>) -> đăng ký app.
// 3. Copy đoạn "firebaseConfig" mà Firebase cung cấp và dán đè vào bên dưới.
// 4. Vào mục "Build" bên trái -> Firestore Database -> Create database (chọn chế độ Production).
// 5. Vào mục "Build" -> Authentication -> Sign-in method -> Bật "Anonymous".
// 6. (Xem hướng dẫn đầy đủ về Security Rules trong README.md)
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDSVws3rpap79fIOPalf4h-0cebqxnY_98",
  authDomain: "vocabappp.firebaseapp.com",
  projectId: "vocabappp",
  storageBucket: "vocabappp.firebasestorage.app",
  messagingSenderId: "196833247329",
  appId: "1:196833247329:web:ab9e013a120c0e7e7daa20",
};

// Khởi tạo Firebase App (chỉ 1 lần duy nhất cho toàn bộ ứng dụng)
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Đăng nhập ẩn danh (Anonymous Auth) để có uid duy nhất cho mỗi phiên
// dùng làm định danh giáo viên / học sinh mà không cần đăng ký tài khoản.
function ensureAuth() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        resolve(user);
      } else {
        signInAnonymously(auth)
          .then((cred) => resolve(cred.user))
          .catch(reject);
      }
    });
  });
}

export {
  app,
  db,
  auth,
  ensureAuth,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
};
