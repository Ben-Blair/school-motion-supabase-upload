// Supabase client for the browser. Copy `.env.example` to `.env.local` and set the vars.
// The anon key is public; who can read files is controlled in the Supabase dashboard (Storage policies).
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Bucket name from env — must match a bucket you created in Supabase Storage (trimmed). */
export const storageBucketName = (import.meta.env.VITE_SUPABASE_BUCKET ?? '').trim()

/**
 * Single shared client for the whole app.
 * Empty strings avoid crashing the module if env is missing; App.tsx shows a clear error instead.
 */
export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')

/** Returns a user-facing message if required env vars are missing (for interviews: config first). */
export function getMissingEnvMessage(): string | null {
  if (!supabaseUrl?.trim()) return 'Set VITE_SUPABASE_URL in .env.local'
  if (!supabaseAnonKey?.trim()) return 'Set VITE_SUPABASE_ANON_KEY in .env.local'
  if (!storageBucketName?.trim()) return 'Set VITE_SUPABASE_BUCKET in .env.local'
  return null
}
