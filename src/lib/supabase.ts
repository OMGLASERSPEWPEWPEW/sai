import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl) console.warn('[supabase] Missing VITE_SUPABASE_URL environment variable');
if (!supabaseAnonKey) console.warn('[supabase] Missing VITE_SUPABASE_ANON_KEY environment variable');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage,
  },
});

export async function getAccessToken(): Promise<string | null> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) return null;
  return session?.access_token ?? null;
}

export async function getValidAccessToken(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed.session) throw new Error('Session expired');
    return refreshed.session.access_token;
  }
  const expiresAt = session.expires_at;
  const nowSec = Math.floor(Date.now() / 1000);
  if (expiresAt && expiresAt - nowSec < 60) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed.session) throw new Error('Session expired');
    return refreshed.session.access_token;
  }
  return session.access_token;
}
