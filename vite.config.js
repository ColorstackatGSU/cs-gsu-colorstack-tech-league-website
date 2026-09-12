import { getRequestListener } from '@hono/node-server';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

/**
 * Serves /api from the same Hono app Vercel deploys, inside the Vite dev server.
 *
 * One process and one origin locally, exactly as in production, so cookies, the Origin
 * check and the ColorStack redirect all behave the same. The module is loaded through
 * Vite's SSR loader on every request, so editing a route takes effect on the next call
 * without a restart.
 */
function apiDevServer() {
  return {
    name: 'tech-league-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/') && req.url !== '/api') return next();
        try {
          const { default: app } = await server.ssrLoadModule('/api/index.ts');
          await getRequestListener(app.fetch)(req, res);
        } catch (err) {
          next(err);
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Vite only exposes VITE_ variables to the browser. The API reads the rest from
  // process.env, as it does on Vercel, so load .env.local into it for dev.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));

  return {
    plugins: [react(), apiDevServer()],
    server: {
      // The redirect URI registered with the member portal is matched literally, port
      // included. Failing loudly beats silently moving to 5176 and breaking the login.
      port: 5175,
      strictPort: true,
    },
  };
});
