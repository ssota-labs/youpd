import 'server-only';

// Thin wrapper around Supabase Auth REST endpoints (`/auth/v1/...`) for
// server-side use. Centralises the apikey + Bearer header pair so consent
// page and server actions don't drift on the auth shape.
//
// Kept in apps/web (not @youpd/supabase) because it is OAuth-flow-specific —
// the rest of @youpd/supabase deals with the user-session SDK and Drizzle.

function trimSlash(s: string): string {
  return s.replace(/\/+$/, '');
}

function getSupabaseBase(): string {
  const v = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!v) throw new Error('SUPABASE_URL is not set');
  return trimSlash(v);
}

function getAnonKey(): string {
  const v =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!v) throw new Error('SUPABASE_ANON_KEY is not set');
  return v;
}

export class SupabaseAuthError extends Error {
  override readonly name = 'SupabaseAuthError';
  readonly status: number;
  readonly body: string;
  constructor(status: number, body: string) {
    super(`Supabase Auth ${status}: ${body}`);
    this.status = status;
    this.body = body;
  }
}

type AuthRequest = {
  method: 'GET' | 'POST';
  path: string; // e.g. '/auth/v1/oauth/authorizations/<id>'
  bearer?: string; // user session JWT
  body?: unknown; // serialised as JSON
};

export async function supabaseAuthFetch<T>(input: AuthRequest): Promise<T> {
  const url = `${getSupabaseBase()}${input.path}`;
  const headers: Record<string, string> = {
    apikey: getAnonKey(),
    accept: 'application/json',
  };
  if (input.bearer) headers.authorization = `Bearer ${input.bearer}`;
  if (input.body !== undefined) headers['content-type'] = 'application/json';

  const res = await fetch(url, {
    method: input.method,
    headers,
    body: input.body !== undefined ? JSON.stringify(input.body) : undefined,
    // Auth endpoints must not be cached.
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new SupabaseAuthError(res.status, await res.text());
  }
  return (await res.json()) as T;
}

export type AuthorizationDetails = {
  authorization_id: string;
  redirect_uri: string;
  client: { id: string; name: string };
  user: { id: string; email?: string | null };
  scope?: string;
  scopes?: string[];
};

export async function getAuthorization(
  authorizationId: string,
  userBearer: string,
): Promise<AuthorizationDetails> {
  return supabaseAuthFetch<AuthorizationDetails>({
    method: 'GET',
    path: `/auth/v1/oauth/authorizations/${encodeURIComponent(authorizationId)}`,
    bearer: userBearer,
  });
}

export type ConsentDecision = 'approve' | 'deny';

export type ConsentResult = {
  redirect_url: string;
};

export async function decideAuthorization(
  authorizationId: string,
  userBearer: string,
  action: ConsentDecision,
): Promise<ConsentResult> {
  return supabaseAuthFetch<ConsentResult>({
    method: 'POST',
    path: `/auth/v1/oauth/authorizations/${encodeURIComponent(authorizationId)}/consent`,
    bearer: userBearer,
    body: { action },
  });
}
