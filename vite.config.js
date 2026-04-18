import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/aniwatch-api': {
        target: 'https://aniwatchtv.to',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/aniwatch-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Origin', 'https://aniwatchtv.to');
            proxyReq.setHeader('Referer', 'https://aniwatchtv.to/');
          });
        }
      },
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
