# VocabQuiz — Ứng dụng thi từ vựng chống gian lận

Ứng dụng web thi từ vựng kiểu Quizizz: giáo viên tạo bộ từ vựng + phòng thi bằng mã PIN,
học sinh làm bài với đồng hồ đếm ngược 15 giây/câu và bị giám sát chống gian lận
(fullscreen + phát hiện chuyển tab) trong suốt quá trình thi.

Toàn bộ ứng dụng là **HTML/JS thuần (ES Modules)** — không cần Node.js, không cần bước
build. Chỉ cần cấu hình Firebase rồi host là chạy được ngay.

## 1. Cấu trúc thư mục

```
vocab-quiz-app/
├── index.html                 Trang chủ (chọn Giáo viên / Học sinh)
├── teacher.html                Bảng điều khiển giáo viên (yêu cầu mã truy cập)
├── dashboard.html               Live Dashboard xem kết quả real-time của 1 phòng (yêu cầu mã truy cập)
├── student.html                 Toàn bộ luồng học sinh (lobby → rules → quiz → end)
├── css/
│   └── style.css                Toàn bộ giao diện
├── js/
│   ├── firebase-config.js       ⚠️ Nơi bạn dán config Firebase của mình
│   ├── utils.js                  Hàm tiện ích dùng chung (PIN, chấm điểm, CSV/XLSX...)
│   ├── models/
│   │   ├── QuizSet.js            Model bộ từ vựng (Firestore: collection quizSets)
│   │   └── Session.js            Model phòng thi + người tham gia (collection rooms)
│   ├── teacher/
│   │   ├── TeacherDashboard.js   Điều phối trang giáo viên + danh sách phòng đang mở
│   │   ├── AccessGate.js         Cổng mã truy cập giáo viên (chặn học sinh vào quậy)
│   │   ├── Dashboard.js          Điều phối trang Live Dashboard (dashboard.html)
│   │   ├── ImportCSV.js          Import CSV/XLSX + tạo bộ từ vựng
│   │   ├── CreateRoom.js         Tạo phòng thi, sinh mã PIN
│   │   └── ResultsTable.js       Bảng kết quả real-time (sắp xếp % cao → thấp)
│   └── student/
│       ├── StudentJoin.js        Lobby + màn hình luật thi/fullscreen
│       ├── QuizRoom.js           Vòng lặp câu hỏi chính
│       ├── CountdownTimer.js     Đồng hồ đếm ngược 15s (vòng tròn trực quan)
│       └── AntiCheatGuard.js     Giám sát Fullscreen API + Page Visibility API
└── README.md
```

## 2. Cài đặt Firebase (bắt buộc — mất khoảng 5 phút)

1. Vào https://console.firebase.google.com/ → **Add project** → đặt tên bất kỳ.
2. Trong màn hình project, bấm biểu tượng **Web (`</>`)** để đăng ký một Web App mới.
3. Firebase sẽ hiện ra một đoạn `firebaseConfig`. Copy đoạn đó.
4. Mở file `js/firebase-config.js`, thay toàn bộ object `firebaseConfig` mẫu bằng đoạn
   bạn vừa copy.
5. Trong menu bên trái Firebase Console:
   - **Build → Firestore Database** → *Create database* → chọn **Production mode** →
     chọn khu vực gần bạn nhất.
   - **Build → Authentication** → tab *Sign-in method* → bật **Anonymous**.

### Thiết lập Security Rules cho Firestore

Vào **Firestore Database → Rules** và dán quy tắc sau (đủ dùng cho mô hình hiện tại;
bạn có thể siết chặt thêm nếu triển khai thực tế lâu dài):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Bộ từ vựng: chỉ giáo viên sở hữu mới được sửa/xoá, ai cũng đọc được (để học sinh
    // lấy danh sách câu hỏi khi vào phòng thi)
    match /quizSets/{quizSetId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.teacherId == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.teacherId == request.auth.uid;
    }

    // Phòng thi: ai cũng đọc được (để học sinh join bằng PIN), chỉ giáo viên tạo/sửa/xoá được
    match /rooms/{roomId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.teacherId == request.auth.uid;
      allow update: if request.auth != null && resource.data.teacherId == request.auth.uid;
      allow delete: if request.auth != null && resource.data.teacherId == request.auth.uid; // cần cho tính năng tự dọn dẹp phòng cũ sau 7 ngày

      // Người tham gia: học sinh tự tạo/tự cập nhật bản ghi của chính mình,
      // giáo viên (chủ phòng) được đọc để xem bảng kết quả real-time.
      match /participants/{studentId} {
        allow read: if request.auth != null;
        allow create, update: if request.auth != null && request.auth.uid == studentId;
        allow delete: if request.auth != null; // cần thiết để AntiCheatGuard xoá dữ liệu vi phạm
      }
    }
  }
}
```

> Lưu ý: bộ rules trên ưu tiên sự đơn giản để chạy ngay. Nếu triển khai cho nhiều lớp/
> nhiều giáo viên dùng chung lâu dài, nên bổ sung kiểm tra chặt hơn (ví dụ chỉ giáo viên
> sở hữu phòng mới đọc được participants của phòng đó).

## 3. Chạy thử trên máy (local)

Vì ứng dụng dùng ES Modules (`type="module"`), bạn **không thể** mở file bằng cách
double-click (giao thức `file://` sẽ bị chặn CORS). Hãy chạy một server tĩnh đơn giản,
ví dụ:

```bash
# Cách 1: dùng Python (có sẵn trên hầu hết máy)
cd vocab-quiz-app
python3 -m http.server 8000
# Rồi mở http://localhost:8000

# Cách 2: dùng Node.js
npx serve .
```

Fullscreen API và Geolocation-like API hoạt động bình thường trên `localhost`.

## 4. Triển khai thực tế (Deploy)

Bất kỳ dịch vụ static hosting nào cũng dùng được, ví dụ:
- **Firebase Hosting** (đồng bộ tốt nhất với Firestore, miễn phí): `firebase deploy`
- **Vercel** / **Netlify**: kéo-thả thư mục `vocab-quiz-app` là xong
- **GitHub Pages**

> Quan trọng: Fullscreen API yêu cầu trang chạy trên **HTTPS** (hoặc `localhost`) —
> tất cả các dịch vụ trên đều tự động cấp HTTPS miễn phí.

## 5. Cách dùng

**Giáo viên:** mở `teacher.html` → nhập mã truy cập (`HangDang`) → "+ Tạo bộ từ vựng"
→ đặt tên + import file `.csv` hoặc `.xlsx` (cột 1: English, cột 2: Tiếng Việt) → Lưu
→ bấm "Tạo phòng thi" trên bộ từ vựng vừa tạo → gửi mã PIN/link cho học sinh → bấm
"Mở Live Dashboard" (hoặc chọn phòng trong danh sách "Phòng thi" bất cứ lúc nào) để
xem kết quả real-time, sắp xếp % cao → thấp. Danh sách phòng và kết quả được lưu trên
Firestore nên **không mất khi tải lại trang** — mỗi phòng hiển thị rõ bộ đề đang dùng
để dễ kiểm soát, và tự động bị dọn dẹp sau 7 ngày.

### Về mã truy cập giáo viên

`teacher.html` và `dashboard.html` đều yêu cầu nhập mã truy cập trước khi vào (mặc
định là `HangDang`, đổi được trong `js/teacher/AccessGate.js`). Đây là lớp chặn đơn
giản ở phía trình duyệt — đủ để ngăn học sinh vô tình vào phá, nhưng **không phải bảo
mật thực sự** vì mã nằm trong mã nguồn JS. Sau khi nhập đúng 1 lần, trình duyệt sẽ nhớ
trong phiên làm việc (tab) đó, không cần nhập lại cho tới khi đóng tab.

**Học sinh:** mở `student.html` (hoặc bấm link giáo viên gửi) → nhập mã PIN + tên →
đọc quy chế → bấm nút lớn để vào phòng thi (kích hoạt toàn màn hình) → làm bài (15
giây/câu, gõ từ Tiếng Anh theo nghĩa Tiếng Việt hiển thị) → xem kết quả cuối bài.

**Chống gian lận:** nếu học sinh thoát toàn màn hình, chuyển tab, hoặc mở app khác đè
lên trình duyệt → bài thi bị huỷ ngay lập tức, dữ liệu bị xoá khỏi Firestore, học sinh
bị đẩy về màn hình cảnh báo vi phạm.

## 6. Định dạng file CSV mẫu

```
English,Vietnamese
apple,quả táo
run,chạy
beautiful,xinh đẹp
```

(Cũng chấp nhận dấu chấm phẩy `;` thay cho dấu phẩy, và dòng tiêu đề là tuỳ chọn —
hệ thống tự động phát hiện và bỏ qua nếu có.)

## 7. Giới hạn hiện tại / hướng mở rộng

- Giáo viên hiện đăng nhập ẩn danh (Anonymous Auth) để đơn giản hoá — nếu cần nhiều
  giáo viên dùng lâu dài với tài khoản cố định, có thể chuyển sang Firebase Auth
  Email/Password mà không cần đổi cấu trúc dữ liệu.
- `window.blur` cũng được tính là vi phạm để bắt trường hợp mở app khác đè lên trình
  duyệt trên desktop; trên một số hệ điều hành/trình duyệt cụ thể có thể cần tinh chỉnh
  thêm nếu gặp báo động giả (ví dụ khi hiện bàn phím ảo trên tablet).
