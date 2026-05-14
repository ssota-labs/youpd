import 'server-only';
import { createUserContextClient } from '@youpd/supabase';

export const dynamic = 'force-dynamic';

function safeNext(raw: string | null): string {
  // Only allow relative paths to avoid open-redirect via magic-link tampering.
  if (!raw || !raw.startsWith('/')) return '/';
  return raw;
}

// Magic-link callback. Supabase appends `?code=...` (PKCE) which we exchange
// for a session, then send the user back to the page they originally tried
// to reach (e.g. /oauth/consent?authorization_id=...).
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = safeNext(url.searchParams.get('next'));
  if (!code) {
    return new Response('missing code', { status: 400 });
  }

  const supabase = await createUserContextClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const back = new URL('/login', url.origin);
    back.searchParams.set('next', next);
    back.searchParams.set('error', error.message);
    return Response.redirect(back.toString(), 302);
  }

  return Response.redirect(new URL(next, url.origin).toString(), 302);
}
