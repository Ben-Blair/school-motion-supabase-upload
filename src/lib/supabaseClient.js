import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
export const bucket = (import.meta.env.VITE_SUPABASE_BUCKET ?? '').trim()

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function missingEnv() {
  if (!supabaseUrl) return 'Set VITE_SUPABASE_URL in .env.local'
  if (!supabaseAnonKey) return 'Set VITE_SUPABASE_ANON_KEY in .env.local'
  if (!bucket) return 'Set VITE_SUPABASE_BUCKET in .env.local'
  return null
}
