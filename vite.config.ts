import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,        // слушать на 0.0.0.0, а не только localhost
    port: 5173,
    allowedHosts: true,   // разрешить ngrok и любые туннели
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
})
