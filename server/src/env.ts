import 'dotenv/config';

// Loads from the repo-root .env as well as server/.env (root wins for shared keys).
import { config } from 'dotenv';
import { resolve } from 'node:path';
config({ path: resolve(process.cwd(), '../.env') });

export const env = {
  port: Number(process.env.PORT ?? 4000),
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  imageBucket: process.env.SUPABASE_IMAGE_BUCKET ?? 'device-images',
};

export const supabaseConfigured = Boolean(env.supabaseUrl && env.supabaseServiceKey);
