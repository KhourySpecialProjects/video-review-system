import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"
import { readFileSync } from "fs"
import basicSsl from '@vitejs/plugin-basic-ssl'

// Bake the /VERSION base into dev/local builds. Docker (Coolify) sets
// VITE_APP_VERSION_BASE via build args and wins; `npm run dev` / a bare local
// build sets nothing, so read the repo-root VERSION here — otherwise the local
// env banner would show the "0.0.0" fallback instead of the real version.
if (!process.env.VITE_APP_VERSION_BASE) {
  try {
    process.env.VITE_APP_VERSION_BASE = readFileSync(
      path.resolve(__dirname, "../VERSION"),
      "utf8",
    ).trim()
  } catch {
    // No VERSION file reachable — fall back to the in-code default.
  }
}

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
      'Cross-Origin-Embedder-Policy': 'credentialless',
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
