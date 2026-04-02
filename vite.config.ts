import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  return {
    plugins: [react()],
    // If running 'npm run build', use '/games/'. If running locally, use root '/'
    base: command === 'build' ? '/games/' : '/',

    server: {
      proxy: {
        "/api-node": {
          target: "http://127.0.0.1:2025",
          changeOrigin: true,
        }
      }
    }
  }
})


