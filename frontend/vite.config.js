import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Redirects any request starting with /api to your backend
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '') // Optional: removes /api prefix
      },
      // Keep API-only routes proxied (e.g., `/users`, `/auth`, `/api`).
      '/users': 'http://localhost:3000',
      '/auth': 'http://localhost:3000'
    }
  }
})