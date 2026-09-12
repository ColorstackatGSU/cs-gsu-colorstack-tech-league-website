import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { HttpError, parse, unwrap } from '../_lib/errors.js';
import {
  APPLICATION_COLUMNS,
  draftSchema,
  fromRow,
  loadMe,
  submissionSchema,
  toRow,
} from '../_lib/profile.js';
import type { AuthedEnv } from '../_lib/session.js';
import { RESUME_BUCKET, resumePath } from '../_lib/supabase.js';

/**
 * The signed-in member's own things: their profile, their application, their resume.
 * Mounted behind requireMember in index.ts, and every query here runs as the member, so
 * RLS is what stops one member reaching another's.
 */
const account = new Hono<AuthedEnv>();

async function body(c: Context) {
  try {
    return await c.req.json();
  } catch {
    throw new HttpError(400, 'That request is not valid.');
  }
}

/* ---------- me ---------- */

account.get('/me', async (c) => c.json(await loadMe(c.get('db'), c.get('member'))));

const optionalUrl = z
  .union([z.url('Enter a full link, starting with https://.').max(300), z.literal('')])
  .optional()
  .transform((value) => (value === '' ? null : value));

account.patch('/me', async (c) => {
  const patch = parse(
    z.object({
      linkedinUrl: optionalUrl,
      githubUrl: optionalUrl,
      discordUsername: z
        .string()
        .trim()
        .max(40, 'Keep that under 40 characters.')
        .optional()
        .transform((value) => (value === '' ? null : value)),
    }),
    await body(c)
  );

  const db = c.get('db');
  unwrap(
    await db
      .from('profiles')
      .update({
        linkedin_url: patch.linkedinUrl,
        github_url: patch.githubUrl,
        discord_username: patch.discordUsername,
      })
      .eq('id', c.get('member').id)
  );
  return c.json(await loadMe(db, c.get('member')));
});

/* ---------- application ---------- */

account.get('/application', async (c) => {
  const row = unwrap(
    await c.get('db').from('applications').select(APPLICATION_COLUMNS).eq('user_id', c.get('member').id).maybeSingle()
  ) as (Parameters<typeof fromRow>[0] & { status: string; decision: string | null }) | null;

  return c.json({
    application: row ? fromRow(row) : null,
    status: row?.status ?? 'not-started',
    decision: row?.decision ?? null,
  });
});

const ALREADY_SUBMITTED =
  'You already submitted your application, so it can no longer be changed. If something needs fixing, email official@colorstackatgsu.com.';

/**
 * Writes the member's application as a draft or a submission.
 *
 * Not a PostgREST upsert: an upsert updates every column it sends, including user_id,
 * which members have no UPDATE grant on. Insert when there is no row, update otherwise.
 *
 * The school email is always the account's own. The account is verified as a student
 * address, so asking for it again would only invite a typo.
 */
async function writeApplication(c: Context<AuthedEnv>, fields: ReturnType<typeof toRow>, status: 'draft' | 'submitted') {
  const db = c.get('db');
  const member = c.get('member');

  const existing = unwrap(
    await db.from('applications').select('status').eq('user_id', member.id).maybeSingle()
  ) as { status: string } | null;

  if (existing?.status === 'submitted') {
    throw new HttpError(409, ALREADY_SUBMITTED, 'already_submitted');
  }

  const row = { ...fields, school_email: member.email, status };

  if (!existing) {
    unwrap(await db.from('applications').insert({ user_id: member.id, ...row }));
  } else {
    // .select() so an update that RLS filtered out (a submission that landed between the
    // read above and this write) comes back as zero rows instead of silent success.
    const updated = unwrap(
      await db.from('applications').update(row).eq('user_id', member.id).eq('status', 'draft').select('user_id')
    ) as unknown[];
    if (updated.length === 0) {
      throw new HttpError(409, ALREADY_SUBMITTED, 'already_submitted');
    }
  }

  return c.json(await loadMe(db, member));
}

account.put('/application/draft', async (c) => {
  const draft = parse(draftSchema, await body(c));
  return writeApplication(c, toRow(draft), 'draft');
});

account.post('/application', async (c) => {
  const submission = parse(submissionSchema, await body(c));
  if (submission.personalEmail.toLowerCase() === c.get('member').email) {
    throw new HttpError(400, 'Use a different personal email from your school email.');
  }
  return writeApplication(c, toRow(submission), 'submitted');
});

/* ---------- resume ---------- */

// Under Vercel's 4.5 MB request body limit, with room for the multipart envelope.
const MAX_RESUME_BYTES = 4 * 1024 * 1024;

account.post('/resume', async (c) => {
  let form: FormData;
  try {
    form = await c.req.formData();
  } catch {
    throw new HttpError(400, 'Upload your resume as a file.');
  }
  const file = form.get('file');
  if (!(file instanceof File)) {
    throw new HttpError(400, 'Choose a PDF to upload.');
  }
  if (file.size === 0) {
    throw new HttpError(400, 'That file is empty.');
  }
  if (file.size > MAX_RESUME_BYTES) {
    throw new HttpError(413, 'Please upload a PDF under 4 MB.');
  }

  // The browser's MIME type is whatever the file's extension suggested. The first bytes
  // are what the file actually is.
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new HttpError(415, 'Please upload a PDF. Other formats are not accepted.');
  }

  const db = c.get('db');
  const member = c.get('member');

  const upload = await db.storage
    .from(RESUME_BUCKET)
    .upload(resumePath(member.id), bytes, { contentType: 'application/pdf', upsert: true });
  if (upload.error) throw upload.error;

  const name = file.name.replace(/[\\/\p{Cc}"]/gu, '').trim().slice(0, 120) || 'resume.pdf';
  unwrap(
    await db
      .from('profiles')
      .update({
        resume_name: name,
        resume_size: bytes.length,
        resume_uploaded_at: new Date().toISOString(),
        resume_source: 'upload',
        resume_deleted_at: null,
      })
      .eq('id', member.id)
  );

  return c.json(await loadMe(db, member), 201);
});

account.delete('/resume', async (c) => {
  const db = c.get('db');
  const member = c.get('member');

  const removed = await db.storage.from(RESUME_BUCKET).remove([resumePath(member.id)]);
  if (removed.error) throw removed.error;

  unwrap(
    await db
      .from('profiles')
      .update({
        resume_name: null,
        resume_size: null,
        resume_uploaded_at: null,
        resume_source: null,
        resume_deleted_at: new Date().toISOString(),
      })
      .eq('id', member.id)
  );

  return c.json(await loadMe(db, member));
});

account.get('/resume', async (c) => {
  const db = c.get('db');
  const member = c.get('member');

  const profile = unwrap(
    await db.from('profiles').select('resume_name').eq('id', member.id).single()
  ) as { resume_name: string | null };
  if (!profile.resume_name) {
    throw new HttpError(404, 'You have not uploaded a resume.');
  }

  const { data, error } = await db.storage.from(RESUME_BUCKET).download(resumePath(member.id));
  if (error || !data) {
    throw new HttpError(404, 'Your resume file could not be found. Try uploading it again.');
  }

  return pdfResponse(data, profile.resume_name);
});

/** Streams a stored PDF back as a download under its original name. */
export function pdfResponse(file: Blob, name: string) {
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '');
  return new Response(file, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      'Cache-Control': 'private, no-store',
    },
  });
}

export default account;
