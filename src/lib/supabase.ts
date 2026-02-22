import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Storage bucket helpers
export const storage = {
  handoffPhotos: supabase.storage.from('handoff-photos'),
  signatures: supabase.storage.from('signatures'),
  ndisInvoices: supabase.storage.from('ndis-invoices'),
  avatars: supabase.storage.from('avatars'),
  bagQrCodes: supabase.storage.from('bag-qr-codes'),
}

export type SupabaseClient = typeof supabase
