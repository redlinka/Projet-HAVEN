import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/games/',
  server: {
    proxy: {
      "/api-node": {
        target: "http://127.0.0.1:2025",
        changeOrigin: true,
      }
    }
  }
})


