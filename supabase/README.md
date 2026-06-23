# Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL editor** → paste and run [`migrations/0001_init.sql`](migrations/0001_init.sql).
3. **Storage** → create a bucket named `device-images` (public is fine for MVP).
4. **Project Settings → API** → copy the values into your root `.env`:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only — never expose to the client)

The schema mirrors the parser output: first-class columns for queryable fields,
`attributes jsonb` for the long tail, `device_supplies` for sellable SKUs.
