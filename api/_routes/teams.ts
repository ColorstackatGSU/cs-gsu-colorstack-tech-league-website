import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { parse, unwrap } from '../_lib/errors.js';
import type { AuthedEnv } from '../_lib/session.js';

/**
 * Teams, the member directory, and standings. Mounted behind requireMember in index.ts.
 *
 * Thin on purpose. Every rule (who may invite whom, seats, capacity, captaincy) lives in
 * the database functions in supabase/migrations/20260912000002_teams.sql, called here as
 * the member. This file validates shapes and returns the member's refreshed team, so the
 * rules cannot drift between two copies.
 */
const teams = new Hono<AuthedEnv>();

async function body(c: Context) {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
}

const uuid = (label: string) => z.uuid(`That ${label} could not be found.`);
const message = z.string().trim().max(280, 'Keep your message under 280 characters.').default('');
const teamName = z
  .string('Give your team a name.')
  .trim()
  .min(1, 'Give your team a name.')
  .max(40, 'Team names are 40 characters or fewer.');
const capacity = z.union([z.literal(3), z.literal(4)], 'Teams can have 3 or 4 people.');

function idParam(c: Context, label: string) {
  return parse(uuid(label), c.req.param('id'));
}

/** Runs a team action, then answers with the member's team as it now stands. */
async function act(c: Context<AuthedEnv>, fn: string, args: Record<string, unknown>) {
  const db = c.get('db');
  unwrap(await db.rpc(fn, args));
  return c.json(unwrap(await db.rpc('my_team')));
}

/* ---------- directory and teams list ---------- */

teams.get('/members', async (c) => {
  const q = c.req.query('q')?.slice(0, 80) ?? '';
  return c.json({ members: unwrap(await c.get('db').rpc('member_directory', { p_query: q })) });
});

teams.get('/teams', async (c) => c.json({ teams: unwrap(await c.get('db').rpc('teams_overview')) }));

teams.post('/teams', async (c) => {
  const input = parse(z.object({ name: teamName, capacity }), await body(c));
  return act(c, 'create_team', { p_name: input.name, p_capacity: input.capacity });
});

teams.post('/teams/:id/requests', async (c) => {
  const input = parse(z.object({ message }), await body(c));
  return act(c, 'request_to_join', { p_team_id: idParam(c, 'team'), p_message: input.message });
});

/* ---------- the member's own team ---------- */

teams.get('/team', async (c) => c.json(unwrap(await c.get('db').rpc('my_team'))));

teams.patch('/team', async (c) => {
  const input = parse(
    z
      .object({ name: teamName.optional(), capacity: capacity.optional() })
      .refine((value) => value.name !== undefined || value.capacity !== undefined, {
        message: 'Nothing to change.',
      }),
    await body(c)
  );
  return act(c, 'update_team', { p_name: input.name ?? null, p_capacity: input.capacity ?? null });
});

teams.post('/team/leave', async (c) => act(c, 'leave_team', {}));

teams.delete('/team/members/:id', async (c) =>
  act(c, 'remove_teammate', { p_user_id: idParam(c, 'teammate') })
);

teams.post('/team/invites', async (c) => {
  const input = parse(z.object({ userId: uuid('member'), message }), await body(c));
  return act(c, 'invite_member', { p_user_id: input.userId, p_message: input.message });
});

teams.delete('/team/invites/:id', async (c) =>
  act(c, 'cancel_invite', { p_invite_id: idParam(c, 'invite') })
);

teams.post('/team/invites/:id/accept', async (c) =>
  act(c, 'respond_invite', { p_invite_id: idParam(c, 'invite'), p_accept: true })
);

teams.post('/team/invites/:id/decline', async (c) =>
  act(c, 'respond_invite', { p_invite_id: idParam(c, 'invite'), p_accept: false })
);

/* ---------- standings ---------- */

// Raw per-event points, unranked. Ranking happens in src/lib/season.js for display, but
// only ever over numbers that came from here.
teams.get('/standings', async (c) => c.json(unwrap(await c.get('db').rpc('standings'))));

export default teams;
