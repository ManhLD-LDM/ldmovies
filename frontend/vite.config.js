import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
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
          'player-vendor': ['hls.js', 'react-player'],
        }
      }
    }
  }
})
