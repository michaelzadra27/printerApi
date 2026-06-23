import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env, supabaseConfigured } from './env.js';
import { parseRoutes } from './routes/parse.js';
import { deviceRoutes } from './routes/devices.js';

const app = Fastify({
  logger: true,
  bodyLimit: 15 * 1024 * 1024, // allow large pastes + base64 images
});

await app.register(cors, { origin: true });
await app.register(parseRoutes);
await app.register(deviceRoutes);

app.get('/api/health', async () => ({
  ok: true,
  supabaseConfigured,
}));

app
  .listen({ port: env.port, host: '0.0.0.0' })
  .then(() => app.log.info(`uStack Device Catalog API on :${env.port} (supabase: ${supabaseConfigured})`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
