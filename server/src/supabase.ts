import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, supabaseConfigured } from './env.js';

let client: SupabaseClient | null = null;

// Lazily created so the server (and the pure /api/parse-device endpoint) runs
// fine before Supabase keys are configured. Persistence endpoints call this.
export function getSupabase(): SupabaseClient {
  if (!supabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.',
    );
  }
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseServiceKey, {
      auth: { persistSession: false },
    });
  }
  return client;
}
