import { createClient } from '@supabase/supabase-js'

console.log('Supabase env in prod:', {
  url: import.meta.env.VITE_SUPABASE_URL,
  keyStart: import.meta.env.VITE_SUPABASE_ANON_KEY?.slice(0, 6),
});


const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for admin operations (use service role key)
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
