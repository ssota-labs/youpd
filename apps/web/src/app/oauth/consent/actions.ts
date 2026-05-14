'use server';
import 'server-only';
import { redirect } from 'next/navigation';
import { createUserContextClient } from '@youpd/supabase';
import {
  decideAuthorization,
  type ConsentDecision,
} from '@/lib/supabase-fetch';

// Server Actions invoked by the consent form. Both branches end with a
// `redirect()` to the URL Supabase tells us — typically the OAuth client's
// `redirect_uri` with either `code=` (approve) or `error=access_denied` (deny).

async function getUserBearer(): Promise<string> {
  const supabase = await createUserContextClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('not_signed_in');
  }
  return token;
}

async function decide(
  authorizationId: string,
  action: ConsentDecision,
): Promise<void> {
  if (!authorizationId) {
    throw new Error('missing authorization_id');
  }
  const bearer = await getUserBearer();
  const { redirect_url } = await decideAuthorization(
    authorizationId,
    bearer,
    action,
  );
  redirect(redirect_url);
}

export async function approveAction(formData: FormData): Promise<void> {
  const id = String(formData.get('authorization_id') ?? '');
  await decide(id, 'approve');
}

export async function denyAction(formData: FormData): Promise<void> {
  const id = String(formData.get('authorization_id') ?? '');
  await decide(id, 'deny');
}
