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
import { validateEnv } from './config/env.js';

// Import routes
import authRoutes from './routes/auth.js';
import favoritesRoutes from './routes/favorites.js';
import historyRoutes from './routes/history.js';
import userRoutes from './routes/user.js';
import comicRoutes from './routes/comicRoutes.js';
import imageRoutes from './routes/imageRoutes.js';

// Load env vars & validate
dotenv.config();
validateEnv();

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
// Cho phép cross-origin resource để frontend khác domain tải được ảnh từ /api/img
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));

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

const ALLOWED_DOMAIN_SUFFIXES = [
  '.ngrok-free.dev',
  '.ngrok-free.app',
  '.nport.link',
  '.mydrpet.io.vn',
  '.vercel.app',
  '.onrender.com',
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }
      try {
        const { hostname } = new URL(origin);
        const matched = ALLOWED_DOMAIN_SUFFIXES.some(
          (suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix)
        );
        if (matched) return callback(null, true);
      } catch (err) {
        // Invalid URL format
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// ─── Health Check Endpoint ────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── Apply Rate Limiters ──────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/comics', comicRoutes);
app.use('/api/img', imageRoutes);

// ─── 404 Handler cho /api routes không tồn tại ────────────────────────────────
app.use('/api', (req, res) => {
  res.status(404).json({ message: `Không tìm thấy endpoint: ${req.method} ${req.originalUrl}` });
});

// ─── Serve React Production Build ────────────────────────────────────────────
// Không phụ thuộc NODE_ENV — tự detect xem đã có production build chưa
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
const distIndexHtml = path.join(frontendDistPath, 'index.html');

if (fs.existsSync(distIndexHtml)) {
  // Production: host file tĩnh từ dist/
  console.log('[SERVER] Đã tìm thấy production build, đang host frontend...');
  app.use(
    express.static(frontendDistPath, {
      index: false,
      etag: true,
      setHeaders: (res, filePath) => {
        const fileName = path.basename(filePath);
        // Service Worker, manifest và HTML tuyệt đối không cache để client luôn nhận bản cập nhật mới nhất
        if (
          fileName === 'sw.js' ||
          fileName === 'registerSW.js' ||
          fileName === 'manifest.webmanifest' ||
          fileName.endsWith('.html')
        ) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (/\.[0-9a-f]{8,}\.(js|css|woff2|png|jpg|svg|webp)$/i.test(filePath)) {
          // Asset có hash (ví dụ: assets/index-a1b2c3d4.js) được cache 1 năm
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=3600');
        }
      },
    })
  );

  // Fallback tất cả các route không phải /api về index.html (cho React Router)
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
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
process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] unhandledRejection tại:', promise, '| Lý do:', reason);
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[SERVER] Đang chạy trên port ${PORT} | Mode: ${process.env.NODE_ENV || 'development'}`);
});
