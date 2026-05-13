import { z } from 'zod';
import {
  approveAuthRequest,
  createAuthCode,
  createUserContextClient,
  getAuthRequest,
} from '@youpd/supabase';
import { authorizeRedirectError, oauthErrorResponse } from '@/oauth/errors';
import { generateToken, hashToken } from '@/oauth/tokens';

export const dynamic = 'force-dynamic';

const Body = z.object({
  rid: z.string().min(1),
  decision: z.enum(['approve', 'deny']),
});

const CODE_TTL_MS = 60 * 1000;

export async function POST(req: Request) {
  const form = await req.formData();
  const parsed = Body.safeParse({
    rid: form.get('rid'),
    decision: form.get('decision'),
  });
  if (!parsed.success) {
    return oauthErrorResponse('invalid_request', parsed.error.message);
  }

  const reqRow = await getAuthRequest(parsed.data.rid);
  if (!reqRow) {
    return oauthErrorResponse('invalid_request', 'request expired or unknown', 400);
  }

  const supabase = await createUserContextClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) {
    return oauthErrorResponse('access_denied', 'not signed in', 401);
  }

  if (parsed.data.decision === 'deny') {
    return authorizeRedirectError(
      reqRow.redirectUri,
      reqRow.state,
      'access_denied',
      'user denied consent',
    );
  }

  await approveAuthRequest(reqRow.id, user.id);

  const code = generateToken();
  await createAuthCode({
    codeHash: hashToken(code),
    clientId: reqRow.clientId,
    userId: user.id,
    redirectUri: reqRow.redirectUri,
    codeChallenge: reqRow.codeChallenge,
    codeChallengeMethod: 'S256',
    scope: reqRow.scope,
    resource: reqRow.resource,
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });

  const target = new URL(reqRow.redirectUri);
  target.searchParams.set('code', code);
  target.searchParams.set('state', reqRow.state);
  return Response.redirect(target.toString(), 302);
}
