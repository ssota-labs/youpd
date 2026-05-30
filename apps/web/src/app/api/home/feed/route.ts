import { NextResponse } from 'next/server';
import { getHomeFeed } from '@youpd/api/home';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { readHomeOnboardingCookie } from '@/lib/home/onboarding-cookie';

export async function GET() {
  const onboarding = await readHomeOnboardingCookie();
  let userId: string | null = null;
  try {
    userId = await requireSessionUserId();
  } catch {
    userId = null;
  }
  const feed = await getHomeFeed({ onboarding, userId });
  return NextResponse.json(feed);
}
