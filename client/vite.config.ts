import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    // Proxy API calls to the Fastify server in dev.
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
