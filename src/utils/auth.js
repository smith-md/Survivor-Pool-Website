// Authentication utility using Supabase Auth
import { supabase } from '../lib/supabase'

export async function isAuthenticated() {
  const { data: { session } } = await supabase.auth.getSession()
  return !!session
}

export async function logout() {
  await supabase.auth.signOut()
}
