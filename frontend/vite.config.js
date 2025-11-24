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
      // Or if you don't use an /api prefix in your backend routes:
      // Proxy specific routes like /users, /auth, etc.
      '/users': 'http://localhost:3000',
      '/auth': 'http://localhost:3000',
      '/transactions': 'http://localhost:3000',
      '/events': 'http://localhost:3000',
      '/promotions': 'http://localhost:3000',
    }
  }
})