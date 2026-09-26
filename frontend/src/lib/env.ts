export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET || 'assets',
}

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey)
}
