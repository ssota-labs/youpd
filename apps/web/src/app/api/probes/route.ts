import { NextResponse } from 'next/server';
import { createManualKeywordProbe, getHomeFeed } from '@youpd/api/home';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { readHomeOnboardingCookie } from '@/lib/home/onboarding-cookie';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const userId = await requireSessionUserId();
    const probe = await createManualKeywordProbe(userId, body);
    const onboarding = await readHomeOnboardingCookie();
    const feed = await getHomeFeed({ onboarding, userId });
    return NextResponse.json({ probe, feed });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
