import { createUserContextClient } from '@youpd/supabase';
import { getIssuer } from '@/oauth/config';
import { oauthErrorResponse } from '@/oauth/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? `${getIssuer()}/`;
  if (!code) {
    return oauthErrorResponse('invalid_request', 'missing code');
  }
  const supabase = await createUserContextClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return oauthErrorResponse('server_error', error.message, 500);
  }
  return Response.redirect(next, 302);
}
