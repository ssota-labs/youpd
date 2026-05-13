import { revokeAccessToken, revokeRefreshToken } from '@youpd/supabase';
import { hashToken } from '@/oauth/tokens';

export const dynamic = 'force-dynamic';

// RFC 7009 §2.2: the endpoint MUST respond 200 regardless of whether the token
// existed, so that clients learn nothing about token validity from this call.
export async function POST(req: Request) {
  const raw = await req.text();
  const params = new URLSearchParams(raw);
  const token = params.get('token');
  const hint = params.get('token_type_hint');
  if (token) {
    const h = hashToken(token);
    if (hint === 'refresh_token') {
      await revokeRefreshToken(h);
      await revokeAccessToken(h);
    } else {
      await revokeAccessToken(h);
      await revokeRefreshToken(h);
    }
  }
  return new Response(null, { status: 200, headers: { 'cache-control': 'no-store' } });
}
