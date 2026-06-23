import type { FastifyInstance } from 'fastify';
import { parseDevice } from '../parser/index.js';

// POST /api/parse-device
// Pure, stateless. The shared contract for the web UI, future browser
// extension, and bulk import — no DB writes, no image handling here.
export async function parseRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { rawText?: string } }>('/api/parse-device', async (req, reply) => {
    const rawText = req.body?.rawText;
    if (typeof rawText !== 'string' || rawText.trim() === '') {
      return reply.code(400).send({ error: 'rawText is required and must be a non-empty string.' });
    }
    return parseDevice(rawText);
  });
}
