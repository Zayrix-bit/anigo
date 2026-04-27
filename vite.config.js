import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/auth': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
      '/watchlist': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
      '/progress': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
      '/settings': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
      '/notifications': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 2000
  }
})
