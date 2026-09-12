import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';

/**
 * The three ways this API talks to Supabase, kept apart so choosing one is deliberate.
 *
 *   asMember(jwt)  Queries run as that member. auth.uid() is them and every RLS policy
 *                  applies. This is the default for anything a signed-in member does.
 *   authClient()   The public key with no member attached, for the auth endpoints that
 *                  take a password or a one-time token and hand back a session.
 *   service()      Bypasses RLS. Only where there is no member to run as yet.
 *
 * None of them persist or refresh sessions: the session lives in the member's cookies
 * (see session.ts), and a client that also kept its own copy would drift from them.
 */
const serverAuth = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
} as const;

export function asMember(accessToken: string): SupabaseClient {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = env();
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: serverAuth,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export function authClient(): SupabaseClient {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = env();
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: serverAuth });
}

let serviceClient: SupabaseClient | null = null;

export function service(): SupabaseClient {
  if (serviceClient) return serviceClient;
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = env();
  serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: serverAuth });
  return serviceClient;
}

export const RESUME_BUCKET = 'resumes';

/** Derived, never stored: see the resume columns in the profiles migration. */
export const resumePath = (userId: string) => `${userId}/resume.pdf`;
