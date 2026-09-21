import type { PostgrestError } from '@supabase/supabase-js';
import type { ZodType } from 'zod';

/**
 * An error whose message is safe, and meant, to be read by a member.
 *
 * Anything thrown that is not one of these becomes a generic 500 in index.ts, with the
 * real message in the log only. So a route either says something a person can act on, or
 * says nothing about its internals.
 */
export class HttpError extends Error {
  constructor(
    readonly status: 400 | 401 | 403 | 404 | 409 | 413 | 415 | 422 | 429 | 502 | 503,
    message: string,
    readonly code?: string
  ) {
    super(message);
  }
}

/**
 * Turns a database error into something a member can read.
 *
 * P0001 is what `raise exception` produces, and every function in the migrations raises a
 * sentence written for a member, so those pass straight through. That is the whole
 * contract between the SQL and this file: the rules and their wording live together.
 */
export function fromDb(error: PostgrestError): HttpError | Error {
  switch (error.code) {
    case 'P0001':
      return new HttpError(409, error.message);
    // P0002 is `raise ... using errcode = 'no_data_found'`, which the portal functions use
    // for "that row is not there". It is a distinct code precisely so it does not come back
    // as a 409 alongside the rule violations, which would tell an officer following a stale
    // link that the applicant had not finished rather than that the application is gone.
    case 'P0002':
      return new HttpError(404, error.message);
    // A foreign key violation reaching here means a row referred to something that is no
    // longer there, which from the caller's side is a stale page rather than a fault. It
    // was surfacing as a generic 500, so an officer scoring a team that had just been
    // deleted read "something went wrong on our end".
    case '23503':
      return new HttpError(409, 'Something this refers to no longer exists. Reload the page and try again.');
    case '42501':
      return new HttpError(403, 'You do not have permission to do that.');
    case '23505':
      return new HttpError(409, 'That already exists.');
    case '23514':
      return new HttpError(422, 'Some of what you sent is not valid. Check the form and try again.');
    default:
      return new Error(`database error ${error.code}: ${error.message}`);
  }
}

/** Throws the mapped error when a Supabase call failed, and returns its data otherwise. */
export function unwrap<T>(result: { data: T; error: PostgrestError | null }): T {
  if (result.error) throw fromDb(result.error);
  return result.data;
}

/**
 * Validates a request body at the boundary. The first problem is reported, in the
 * schema's own words, which are written as sentences.
 */
export function parse<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new HttpError(400, first?.message ?? 'That request is not valid.');
  }
  return result.data;
}
