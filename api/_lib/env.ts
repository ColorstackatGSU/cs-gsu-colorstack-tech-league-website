import { z } from 'zod';

/**
 * Server configuration, read once and validated.
 *
 * Parsed on first use rather than at import, so /api/health still answers on a deploy
 * whose variables are missing: that is exactly the deploy someone is trying to debug, and
 * a function that crashes while loading tells them nothing.
 *
 * None of these are VITE_-prefixed. Vite inlines VITE_ variables into the browser bundle,
 * and the browser never needs any of them: it only ever talks to /api.
 */
const schema = z.object({
  SUPABASE_URL: z.url(),
  // The publishable (anon) key. Used for member-scoped queries, where the member's own
  // JWT is what grants access, and for the auth calls that take a password or a token.
  SUPABASE_ANON_KEY: z.string().min(1),
  // Bypasses RLS. Only for work with no member session behind it yet: creating accounts,
  // the ColorStack callback, the email rate limit, and the resume purge.
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Where links in emails point. No trailing slash.
  APP_URL: z.url().transform((url) => url.replace(/\/+$/, '')),

  // Optional as a group, so a missing client secret switches off Sign in with ColorStack
  // rather than taking plain signup and login down with it. See colorstackConfig().
  COLORSTACK_ISSUER: z.url().transform((url) => url.replace(/\/+$/, '')).optional(),
  COLORSTACK_CLIENT_ID: z.string().optional(),
  COLORSTACK_CLIENT_SECRET: z.string().optional(),
  COLORSTACK_REDIRECT_URI: z.url().optional(),

  // Both set turns on the Gmail API transport. Neither set logs mail instead, which is
  // the local default and is refused in production (see mailer.ts).
  GMAIL_SEND_AS: z.string().optional(),
  GOOGLE_CREDENTIALS_JSON: z.string().optional(),
  MAIL_FROM: z.string().default('ColorStack at GSU <official@colorstackatgsu.com>'),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  // An empty `NAME=` line in a .env file means unset, not "set to nothing".
  const defined = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== ''));
  const parsed = schema.safeParse(defined);
  if (!parsed.success) {
    // Names only. The values are secrets, and this lands in the deploy log.
    const missing = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Server is misconfigured. Check these variables: ${missing}`);
  }
  cached = parsed.data;
  return cached;
}

export const isProduction = () => process.env.VERCEL_ENV === 'production';
