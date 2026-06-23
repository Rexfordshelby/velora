import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const defaultCity = import.meta.env.VITE_DEFAULT_CITY || 'Mumbai'
export const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL || 'raashifshaikh70@gmail.com').toLowerCase()
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    })
  : null
