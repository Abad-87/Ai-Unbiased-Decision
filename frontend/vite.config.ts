import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),        // ← This enables Tailwind v4
  ],
  server: {
    proxy: {
      '/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/hiring': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/loan': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/social': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/feedback': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/insights': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/files': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/mitigation': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/shap': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/models': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})