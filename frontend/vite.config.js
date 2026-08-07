import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,png,jpg,jpeg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(phimimg\.com|img\.otruyenapi\.com|sv1\.otruyencdn\.com)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'poster-image-cache',
              expiration: {
                maxEntries: 400,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 ngày
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\/api\/(comics|img)\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-response-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 6, // 6 giờ
              },
            },
          },
        ],
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: 'LDMovies & Comics',
        short_name: 'LDMovies',
        description: 'Xem Phim Lẻ, Phim Bộ, Anime và Đọc Truyện Tranh Miễn Phí',
        theme_color: '#09090B',
        background_color: '#09090B',
        display: 'standalone',
        start_url: '/',
      },
    }),
  ],
  server: {
    // ─── DEV SERVER (chỉ dùng khi chạy START_DEV.bat) ───────────────────────
    host: true,
    port: 3000,
    allowedHosts: [
      '.ngrok-free.dev',
      '.ngrok-free.app',
      '.ngrok.io',
      '.loca.lt',
      '.trycloudflare.com',
      '.devtunnels.ms',
      'ldmovies.mydrpet.io.vn',
      '.mydrpet.io.vn'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    // ─── PRODUCTION BUILD ─────────────────────────────────────────────────────
    outDir: 'dist',
    // Tắt source maps trong production để giảm kích thước bundle và ẩn code nguồn
    sourcemap: false,
    // Cảnh báo nếu chunk > 500kb
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Tách thư viện lớn vào chunk riêng để tăng tốc cache browser
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['react-icons', 'react-toastify'],
          'player-vendor': ['hls.js'],
        }
      }
    }
  }
})
