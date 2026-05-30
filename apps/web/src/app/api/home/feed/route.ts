import { NextResponse } from 'next/server';
import { getHomeFeed } from '@youpd/api/home';
import { readHomeOnboardingCookie } from '@/lib/home/onboarding-cookie';

export async function GET() {
  const onboarding = await readHomeOnboardingCookie();
  const feed = await getHomeFeed({ onboarding });
  return NextResponse.json(feed);
}
