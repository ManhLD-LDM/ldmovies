import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';

// Import routes
import authRoutes from './routes/auth.js';
import favoritesRoutes from './routes/favorites.js';
import historyRoutes from './routes/history.js';
import userRoutes from './routes/user.js';
import comicRoutes from './routes/comicRoutes.js';

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Kích hoạt trust proxy để express-rate-limit hoạt động đúng phía sau proxy (Render, Cloudflare, v.v.)
app.set('trust proxy', 1);

// ─── Gzip Compression (giảm băng thông qua Tunnel) ───────────────────────────
app.use(compression());

// ─── Security Headers ─────────────────────────────────────────────────────────
// Tắt contentSecurityPolicy để không chặn embed video từ domain ngoài
app.use(helmet({ contentSecurityPolicy: false }));

// ─── Rate Limiting ───────────────────────────────────────────────────────────
// Global: 500 req / 15 phút / IP cho toàn bộ API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút' },
});

// Auth: 20 req / 1 giờ / IP (chống brute-force đăng nhập)
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Quá nhiều yêu cầu xác thực, vui lòng thử lại sau 1 giờ' },
});

// ─── Body Parser ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' })); // Giới hạn payload tối đa 10kb
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://ribbonlike-frailly-jaydon.ngrok-free.dev',
  'https://movieweb-frontend.nport.link',
  'https://LowDetailMovies.nport.link',
  'https://ldmovies.mydrpet.io.vn',
  'http://ldmovies.mydrpet.io.vn',
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        origin.includes('.ngrok-free.dev') ||
        origin.includes('.nport.link') ||
        origin.includes('.mydrpet.io.vn') ||
        origin.includes('.vercel.app') ||
        origin.includes('.onrender.com')
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// ─── Apply Rate Limiters ──────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/comics', comicRoutes);

// ─── Serve React Production Build ────────────────────────────────────────────
// Không phụ thuộc NODE_ENV — tự detect xem đã có production build chưa
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
const distIndexHtml = path.join(frontendDistPath, 'index.html');

if (fs.existsSync(distIndexHtml)) {
  // Production: host file tĩnh từ dist/
  console.log('[SERVER] Đã tìm thấy production build, đang host frontend...');
  app.use(express.static(frontendDistPath, {
    maxAge: '7d', // Cache file tĩnh 7 ngày trên browser
    etag: true,
  }));

  // Fallback tất cả các route không phải /api về index.html (cho React Router)
  app.get('*', (req, res) => {
    res.sendFile(distIndexHtml);
  });
} else {
  // Dev mode: chỉ có health check
  console.log('[SERVER] Không tìm thấy production build, chạy ở chế độ API only.');
  app.get('/', (req, res) => {
    res.json({ message: 'MovieWeb API is running (dev mode)...' });
  });
}

// ─── Error Handling Middleware ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

// ─── Graceful Crash Prevention ────────────────────────────────────────────────
// Ngăn Node.js bị crash hoàn toàn khi có lỗi không bắt được
process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err.message);
  console.error(err.stack);
  // Không gọi process.exit() để server tiếp tục chạy
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] unhandledRejection tại:', promise, '| Lý do:', reason);
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[SERVER] Đang chạy trên port ${PORT} | Mode: ${process.env.NODE_ENV || 'development'}`);
});
