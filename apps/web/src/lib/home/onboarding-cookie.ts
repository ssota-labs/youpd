import { cookies } from 'next/headers';
import { HomeOnboardingSchema, type HomeOnboarding } from '@youpd/types';

const COOKIE_NAME = 'youpd_home_context';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export async function readHomeOnboardingCookie(): Promise<HomeOnboarding | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  try {
    const decoded = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    return HomeOnboardingSchema.parse(decoded);
  } catch {
    return null;
  }
}

export async function writeHomeOnboardingCookie(
  onboarding: HomeOnboarding,
): Promise<void> {
  const parsed = HomeOnboardingSchema.parse(onboarding);
  const jar = await cookies();
  jar.set(COOKIE_NAME, Buffer.from(JSON.stringify(parsed)).toString('base64url'), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}
