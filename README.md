# 🎬 LDMovies & Comics - Personal Streaming & Reader Platform

> Nền tảng xem phim, anime và đọc truyện tranh cá nhân full-stack tự host (Self-hosted), tích hợp hệ thống tài khoản, lịch sử xem/đọc và danh sách yêu thích đồng bộ qua MongoDB.

[![Node.js](https://img.shields.io/badge/Backend-Node.js_v18+-339933?logo=nodedotjs)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Framework-Express.js-000000?logo=express)](https://expressjs.com)
[![React](https://img.shields.io/badge/Frontend-React_18-61DAFB?logo=react)](https://reactjs.org)
[![Vite](https://img.shields.io/badge/Bundler-Vite_7-646CFF?logo=vite)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC?logo=tailwindcss)](https://tailwindcss.com)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?logo=mongodb)](https://mongodb.com)

---

## 🌟 Điểm nổi bật (Features)

### 1. 🎥 Xem Phim & Anime (Movies & Anime Streaming)
* **Kho phim phong phú**: Tự động cập nhật các bộ phim hot, phim bộ, phim lẻ, phim hoạt hình anime từ các API streaming công khai (KKPhim, Jikan/MyAnimeList).
* **Trình phát video HLS hiện đại**: Hỗ trợ phát luồng video `.m3u8` chất lượng cao, mượt mà với đầy đủ tùy chọn chọn tập, chuyển tập.
* **Bộ lọc & Tìm kiếm**: Tìm kiếm thông minh theo từ khóa, thể loại, năm phát hành, quốc gia, loại phim (Phim lẻ, Phim bộ, Anime).

### 2. 📖 Đọc Truyện Tranh (Comics & Manga Reader)
* **Đọc truyện mượt mà**: Tích hợp kho truyện tranh đa dạng (Otruyen/NetTruyen API) với trình đọc truyện tối ưu.
* **Chế độ đọc linh hoạt**: Tùy chỉnh đọc cuộn dọc (Vertical) hoặc lật trang, hỗ trợ phóng to/thu nhỏ ảnh chương.
* **Theo dõi chương**: Lưu lại chương đang đọc dở và tự động đồng bộ vào lịch sử đọc.

### 3. 👤 Hệ thống Tài khoản & Đồng bộ (Auth & User Data)
* **Xác thực bảo mật**: Đăng ký, đăng nhập tài khoản cá nhân mã hóa bằng JWT & Bcrypt.
* **Quản lý Profile**: Tùy chỉnh avatar URL, tên hiển thị, tiểu sử (bio) và đổi mật khẩu.
* **Yêu thích (Favorites)**: Lưu danh sách Phim, Anime, Truyện tranh yêu thích riêng cho từng tài khoản.
* **Lịch sử (History)**: Tự động ghi nhớ tiến trình xem phim (thời gian, tập) và tiến trình đọc truyện.

### 4. ⚡ Vận hành & Triển khai (Deployment & Network)
* **Chạy 1-Click thông qua Batch Script**: Có sẵn các file `.bat` hỗ trợ khởi động nhanh cả hệ thống trên Windows.
* **Single-Port Production**: Backend Node.js tự động host trang React Production Build (`dist/`), chạy toàn bộ ứng dụng chỉ trên 1 cổng (`:5000`).
* **Cloudflare Tunnel Integration**: Đã tích hợp sẵn file thực thi `cloudflared.exe` để public ứng dụng ra internet qua HTTPS hoàn toàn miễn phí mà không cần mở port modem.

---

## 🏗️ Kiến trúc & Công nghệ (Tech Stack)

### Frontend (`/frontend`)
* **Core**: React 18, Vite 7
* **State Management**: Zustand (State lưu trữ chế độ xem, token đăng nhập, profile)
* **Styling**: Tailwind CSS (Giao diện tối Dark-mode hiện đại, responsive 100%)
* **Media Player**: React Player, `hls.js` (Phát luồng HLS m3u8)
* **Icons & Toast**: React Icons, React Toastify

### Backend (`/backend`)
* **Core**: Node.js (ES Modules), Express.js
* **Database**: MongoDB (qua Mongoose ODM)
* **Authentication**: JWT (JSON Web Tokens), Bcryptjs (Mã hóa mật khẩu)
* **Security & Performance**: Helmet (Security headers), Compression (Gzip), Rate Limiting (`express-rate-limit` chống brute-force auth và spam API)

---

## 📁 Cấu trúc Dự án (Project Structure)

```
ldmovies/
├── backend/                  # Node.js + Express RESTful API
│   ├── config/               # Cấu hình kết nối MongoDB (db.js)
│   ├── controllers/          # Xử lý logic Auth, User, Favorites, History, Comic
│   ├── middleware/           # Middleware xác thực JWT (auth.js)
│   ├── models/               # MongoDB Schema (User.js)
│   ├── routes/               # Định tuyến API (/api/auth, /api/users, /api/favorites, /api/history, /api/comics)
│   ├── server.js             # Entry point Express backend & Production static host
│   ├── .env.example          # Mẫu biến môi trường backend
│   └── package.json
│
├── frontend/                 # React 18 + Vite Web Application
│   ├── public/               # Static assets
│   ├── src/
│   │   ├── components/       # UI Components tái sử dụng (Layout, Navbar, Footer, MovieCard, Player...)
│   │   ├── pages/            # Các trang giao diện (HomePage, MovieDetail, ComicHome, ComicReader, Profile...)
│   │   ├── services/         # API Layer (api.js, kkphimApi.js, jikanApi.js, comicApi.js)
│   │   ├── stores/           # Zustand store (appStore.js)
│   │   ├── App.jsx           # Routing & App Root
│   │   └── main.jsx
│   ├── config.yml.example    # Mẫu cấu hình Cloudflare Tunnel
│   ├── package.json
│   └── vite.config.js
│
├── START.bat                 # Script chạy Production Mode (Backend + Single Port + Cloudflare Tunnel)
├── START_DEV.bat             # Script chạy Development Mode (Backend + Vite Hot Reload)
├── STOP.bat                  # Script dừng toàn bộ tiến trình liên quan
├── START_GUIDE.md            # Hướng dẫn chi tiết chạy & chia sẻ ứng dụng
├── CLOUDFLARE_TUNNEL.md      # Hướng dẫn chi tiết cấu hình Cloudflare Tunnel
└── cloudflared.exe           # Công cụ Cloudflare Tunnel đi kèm
```

---

## 🚀 Hướng dẫn Khởi chạy (Getting Started)

### Yêu cầu tiên quyết (Prerequisites)
* **Node.js**: Phiên bản `v18.x` trở lên ([Tải tại đây](https://nodejs.org))
* **MongoDB**: Tài khoản MongoDB Atlas (Cloud) hoặc MongoDB chạy ở máy local.

---

### 1. Cấu hình Biến môi trường (Environment Setup)

Tạo file `backend/.env` bằng cách sao chép từ `backend/.env.example`:

```env
PORT=5000
NODE_ENV=development

# Chuỗi kết nối MongoDB của bạn
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/ldmovies?retryWrites=true&w=majority

# Khóa bảo mật JWT (Thay đổi chuỗi này khi đưa lên production)
JWT_SECRET=your_super_secret_jwt_key_ldmovies_2026
JWT_EXPIRE=7d

# URL Frontend (dùng cho CORS)
FRONTEND_URL=http://localhost:3000
```

---

### 2. Chạy nhanh trên Windows (Quick Start with Scripts)

Dự án cung cấp sẵn các kịch bản tự động cho hệ điều hành Windows:

* **Chạy Chế độ Development (Dành cho lập trình viên)**:
  Nhấp đúp chuột vào file **`START_DEV.bat`**.
  * Backend API sẽ chạy tại: `http://localhost:5000`
  * Frontend Vite Dev Server (có Hot-Reload) sẽ chạy tại: `http://localhost:3000`

* **Chạy Chế độ Production / Chia sẻ (Production Launcher)**:
  Nhấp đúp chuột vào file **`START.bat`**.
  * Script sẽ tự động kiểm tra dependencies, tự động build frontend sang thư mục `frontend/dist`.
  * Khởi chạy Backend duy nhất ở port `5000` tích hợp luôn giao diện web.
  * Tự động khởi chạy Cloudflare Tunnel nếu có file `frontend/config.yml`.

* **Dừng ứng dụng**:
  Nhấp đúp chuột vào file **`STOP.bat`** để tắt sạch các tiến trình Node.js và Cloudflare.

---

### 3. Chạy bằng Dòng lệnh (Manual Command Line)

#### Bước 1: Khởi chạy Backend
```bash
cd backend
npm install
npm run dev     # Hoặc npm start cho chế độ production
```

#### Bước 2: Khởi chạy Frontend
```bash
cd frontend
npm install
npm run dev     # Truy cập http://localhost:3000
```

---

## 🌐 Danh sách API (API Reference)

### 🔐 Authentication (`/api/auth`)
* `POST /api/auth/register` - Đăng ký tài khoản mới (`username`, `email`, `password`)
* `POST /api/auth/login` - Đăng nhập nhận JWT Token (`email`, `password`)
* `GET /api/auth/me` - Lấy thông tin tài khoản hiện tại (Yêu cầu Token)

### 👤 User Profile (`/api/users`)
* `GET /api/users/profile` - Lấy chi tiết thông tin cá nhân
* `PUT /api/users/profile` - Cập nhật avatar, bio, username hoặc đổi mật khẩu

### ❤️ Danh sách Yêu thích (`/api/favorites`)
* `GET /api/favorites` - Lấy danh sách yêu thích (Phim, Anime, Truyện)
* `POST /api/favorites/movie` - Thêm/Xóa phim khỏi danh sách yêu thích
* `POST /api/favorites/anime` - Thêm/Xóa anime khỏi danh sách yêu thích
* `POST /api/favorites/comic` - Thêm/Xóa truyện tranh khỏi danh sách yêu thích

### 🕒 Lịch sử Xem & Đọc (`/api/history`)
* `GET /api/history` - Lấy lịch sử xem phim và đọc truyện
* `POST /api/history/movie` - Cập nhật tiến trình xem phim (thời gian, tập)
* `POST /api/history/comic` - Cập nhật tiến trình đọc truyện (chương đang đọc)

### 📖 Truyện Tranh (`/api/comics`)
* `GET /api/comics/home` - Lấy danh sách truyện mới cập nhật / nổi bật
* `GET /api/comics/detail/:slug` - Lấy chi tiết truyện & danh sách chương
* `GET /api/comics/chapter/:chapterId` - Lấy hình ảnh các trang trong chương

---

## 🌐 Public chia sẻ qua Cloudflare Tunnel

Muốn chia sẻ trang web cho bạn bè truy cập qua Internet mà không cần mở port modem:

1. Đặt file `cloudflared.exe` tại thư mục gốc dự án.
2. Tạo file `frontend/config.yml` dựa theo mẫu `frontend/config.yml.example`.
3. Khởi chạy `START.bat`, ứng dụng sẽ tự động kích hoạt Tunnel HTTPS bảo mật (ví dụ: `https://ldmovies.mydrpet.io.vn`).

Chi tiết xem tại guide: [CLOUDFLARE_TUNNEL.md](file:///e:/Github/ldmovies/CLOUDFLARE_TUNNEL.md).

---

## 📄 Giấy phép (License)

Dự án được phát triển phục vụ mục đích cá nhân, học tập và giải trí tại gia.

---
Made with ❤️ for Home Streaming & Manga Reading!
