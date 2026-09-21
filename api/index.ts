import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { HttpError } from './_lib/errors.js';
import { requireMember, requireSameOrigin, type AuthedEnv } from './_lib/session.js';
import account from './_routes/account.js';
import auth from './_routes/auth.js';
import serviceRoutes from './_routes/service.js';
import teams from './_routes/teams.js';

/**
 * The Tech League API.
 *
 * One Hono app behind one Vercel Function, rather than a file per endpoint.
 * That is what lets the auth middleware be written once instead of imported
 * into every handler, and it keeps the whole route table readable in one
 * place.
 *
 * It is deployed from the same Vercel project as the site, so the browser
 * calls it same-origin at /api/*. There is no CORS configuration here on
 * purpose: if you ever find yourself adding some, the frontend is calling the
 * wrong host.
 *
 * vercel.json rewrites /api/(.*) here and excludes /api from the SPA
 * fallback. Without that second rule every API request returns index.html
 * with a 200, which reads as "the endpoint returned HTML" and wastes an hour.
 *
 * Modules live in _lib and _routes because Vercel turns every file under api/
 * into its own function, except those under a folder starting with an
 * underscore. Named anything else, each module would deploy as a broken
 * endpoint of its own.
 */
const app = new Hono<AuthedEnv>().basePath('/api');

// Called by the chapter's admin portal, not by a browser, so it authenticates with a
// shared secret rather than a session or an origin check. It sits above requireSameOrigin
// because the caller is another of our servers; there is no Origin header, but exempting
// the path entirely is clearer than relying on that. See _routes/service.ts.
app.route('/service', serviceRoutes);

app.use('*', requireSameOrigin);

/**
 * Liveness only. It answers before the database is reachable and says nothing
 * about whether the rest of the app works, which is the point: it is for the
 * platform, not for debugging.
 */
app.get('/health', (c) => c.json({ ok: true }));

app.route('/auth', auth);

// Order is load-bearing. Hono runs matching handlers in the order they were
// registered, so everything above this line answers without a session, and
// every route below it is authenticated.
app.use('*', requireMember);

app.route('/', account);
app.route('/', teams);

app.notFound((c) => c.json({ error: 'That page of the API does not exist.' }, 404));

app.onError((err, c) => {
  if (err instanceof HttpError) {
    return c.json({ error: err.message, ...(err.code ? { code: err.code } : {}) }, err.status);
  }
  // Never leak an internal message to the browser. The real one goes to the
  // Vercel log, where it belongs, and the caller gets something it can act on.
  console.error('unhandled', err);
  return c.json({ error: 'Something went wrong on our end. Try again in a minute.' }, 500);
});

// Named method exports, which Vercel's Node.js runtime calls with a Web Request.
// A bare `export default app.fetch` is treated as a (req, res) Node handler
// instead, and every request hangs until it times out.
const handler = handle(app);
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;

export default app;
