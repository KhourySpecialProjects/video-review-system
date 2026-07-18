/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV?: string
  readonly VITE_GLITCHTIP_DSN?: string
  readonly VITE_TELEMETRY_PRIVACY?: string
  readonly VITE_APP_VERSION_BASE?: string
  readonly VITE_APP_BRANCH?: string
  readonly VITE_APP_COMMIT?: string
  readonly VITE_APP_BUILT_AT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
