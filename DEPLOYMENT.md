# Deployment

Monorepo with two deployables: the **client** (static, → Vercel) and the
**server** (Node API, → Render). Both connect to **Supabase**.

## 1. Supabase
1. Create a project.
2. **SQL Editor** → run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
3. **Storage** → create a bucket `device-images` (public).
4. **Settings → API** → note `URL`, `service_role` key.

## 2. Render (server) — via Blueprint
- New → **Blueprint** → connect this repo. Render reads [`render.yaml`](render.yaml).
- After it provisions, set the secret env vars in the dashboard:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Health check: `/api/health` (already configured).
- Copy the service URL, e.g. `https://ustack-device-catalog-api.onrender.com`.

## 3. Vercel (client)
- New Project → import this repo → set **Root Directory = `client`**
  (Vercel then reads [`client/vercel.json`](client/vercel.json)).
- Add env var **`VITE_API_URL`** = the Render service URL.
- Deploy.

CORS is open (`origin: true`) and the client calls `VITE_API_URL` in production,
so the Vercel and Render domains interoperate without extra config.

## Notes
- The server reads `PORT` from the environment (Render injects it).
- `.env` is git-ignored; production secrets live in each platform's dashboard.
