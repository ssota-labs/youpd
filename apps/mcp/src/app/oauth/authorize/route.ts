import { z } from 'zod';
import {
  createAuthRequest,
  getOauthClient,
  createUserContextClient,
} from '@youpd/supabase';
import { getIssuer, getResource, DEFAULT_SCOPE } from '@/oauth/config';
import { authorizeRedirectError, oauthErrorResponse } from '@/oauth/errors';

export const dynamic = 'force-dynamic';

const Query = z.object({
  response_type: z.literal('code'),
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  code_challenge: z.string().min(43).max(128),
  code_challenge_method: z.literal('S256'),
  state: z.string().min(1),
  scope: z.string().optional(),
  resource: z.string().url(),
});

const AUTH_REQUEST_TTL_MS = 10 * 60 * 1000;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams);
  const parsed = Query.safeParse(params);
  if (!parsed.success) {
    return oauthErrorResponse('invalid_request', parsed.error.message);
  }
  const q = parsed.data;

  const client = await getOauthClient(q.client_id);
  if (!client) {
    // Per OAuth 2.1 §4.1.2.1, unknown client_id MUST NOT redirect — return 400.
    return oauthErrorResponse('invalid_client', 'unknown client_id', 400);
  }
  if (!client.redirectUris.includes(q.redirect_uri)) {
    return oauthErrorResponse('invalid_request', 'redirect_uri does not match a registered URI', 400);
  }

  if (q.resource !== getResource()) {
    return authorizeRedirectError(
      q.redirect_uri,
      q.state,
      'invalid_target',
      'resource does not match this MCP server',
    );
  }

  const supabase = await createUserContextClient();
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id ?? null;

  const reqRow = await createAuthRequest({
    clientId: q.client_id,
    redirectUri: q.redirect_uri,
    scope: q.scope ?? DEFAULT_SCOPE,
    state: q.state,
    codeChallenge: q.code_challenge,
    codeChallengeMethod: 'S256',
    resource: q.resource,
    userId,
    expiresAt: new Date(Date.now() + AUTH_REQUEST_TTL_MS),
  });

  const issuer = getIssuer();
  const next = `${issuer}/oauth/consent?rid=${encodeURIComponent(reqRow.id)}`;
  if (!userId) {
    return Response.redirect(
      `${issuer}/oauth/login?next=${encodeURIComponent(next)}`,
      302,
    );
  }
  return Response.redirect(next, 302);
}
