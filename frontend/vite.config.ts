import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    tailwindcss(), basicSsl()],
  envDir: path.resolve(__dirname, ".."),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared-types": path.resolve(__dirname, "./types"),
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  server: {
    host: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    proxy: {
      // Forward /api/auth/* to the Express backend (Better Auth)
      '/api/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Forward remaining /api/* to the Go backend during local development
      '/api': {
        target: process.env.NODE_ENV == 'production' ? process.env.API_BASE_URL : 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  }
})
