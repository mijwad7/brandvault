import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env, isSupabaseConfigured } from './env.ts'

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null
  }
  client ??= createClient(env.supabaseUrl, env.supabaseAnonKey)
  return client
}
