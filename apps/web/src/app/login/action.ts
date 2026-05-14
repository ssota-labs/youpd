'use server';
import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createUserContextClient } from '@youpd/supabase';

// Prefer the actual request host so the magic-link redirect targets the same
// origin the user is browsing on (so cookies set during signInWithOtp are
// visible on the callback). Falls back to SITE_URL for non-request contexts.
async function getSiteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'http';
  if (host) return `${proto}://${host}`;
  const v =
    process.env.SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000';
  return v.replace(/\/+$/, '');
}

function safeNext(raw: unknown): string {
  // Only allow relative paths so this redirect can't be weaponised into an
  // open-redirect by passing `next=https://evil.example`.
  if (typeof raw !== 'string' || !raw.startsWith('/')) return '/';
  return raw;
}

export async function sendMagicLinkAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim();
  const next = safeNext(formData.get('next'));
  if (!email) {
    redirect(`/login?next=${encodeURIComponent(next)}&error=missing_email`);
  }

  const supabase = await createUserContextClient();
  const emailRedirectTo = `${await getSiteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo },
  });
  if (error) {
    redirect(
      `/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect(`/login?next=${encodeURIComponent(next)}&sent=1`);
}
