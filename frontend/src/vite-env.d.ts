/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV?: string
  readonly VITE_GLITCHTIP_DSN?: string
  readonly VITE_TELEMETRY_PRIVACY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
