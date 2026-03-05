import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://gmrdtzfbwilfhwtsmqvz.supabase.co"
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_fGAsUehOv3-026mUjuqrDA_528q_jzF"

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)
