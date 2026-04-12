/// <reference types="vite/client" />

/**
 * Vite injects only variables prefixed with VITE_ into the client bundle.
 * Declaring them here gives TypeScript autocomplete and type checking.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_SUPABASE_BUCKET: string
  readonly VITE_OPENWEATHER_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
