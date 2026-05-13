import { z } from 'zod';
import { createUserContextClient } from '@youpd/supabase';
import { getIssuer } from '@/oauth/config';
import { oauthErrorResponse } from '@/oauth/errors';

export const dynamic = 'force-dynamic';

const Body = z.object({
  email: z.string().email(),
  next: z.string().url(),
});

export async function POST(req: Request) {
  const form = await req.formData();
  const parsed = Body.safeParse({ email: form.get('email'), next: form.get('next') });
  if (!parsed.success) {
    return oauthErrorResponse('invalid_request', parsed.error.message);
  }
  const supabase = await createUserContextClient();
  const issuer = getIssuer();
  const emailRedirectTo = `${issuer}/oauth/login/callback?next=${encodeURIComponent(parsed.data.next)}`;
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo },
  });
  if (error) {
    return oauthErrorResponse('server_error', error.message, 500);
  }
  return Response.redirect(`${issuer}/oauth/login?sent=1&next=${encodeURIComponent(parsed.data.next)}`, 302);
}
