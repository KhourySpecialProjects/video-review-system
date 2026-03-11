import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import path from "path"
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    reactRouter(),
    tailwindcss(),
    basicSsl(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    proxy: {
      // Forward specific Go backend endpoints only
      // /api/auth/* is handled by React Router server (Better Auth)
      '/api/health': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/videos': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/proxy-video': {
        target: 'https://www.w3schools.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy-video/, ''),
      },
    },
  }
})
