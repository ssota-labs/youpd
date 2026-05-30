import { NextResponse } from 'next/server';
import { HomeProfileInputSchema } from '@youpd/types';
import { getHomeFeed, saveHomeProfile } from '@youpd/api/home';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import {
  readHomeOnboardingCookie,
  writeHomeOnboardingCookie,
} from '@/lib/home/onboarding-cookie';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = HomeProfileInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().formErrors.join(', ') || 'Validation failed' },
      { status: 400 },
    );
  }

  await writeHomeOnboardingCookie({
    interestTopics: parsed.data.interestTopics,
    channelDescription: parsed.data.channelDescription,
  });

  let userId: string | null = null;
  try {
    userId = await requireSessionUserId();
    await saveHomeProfile(userId, parsed.data);
  } catch {
    userId = null;
  }

  const feed = await getHomeFeed({
    onboarding: {
      interestTopics: parsed.data.interestTopics,
      channelDescription: parsed.data.channelDescription,
    },
    userId,
    useFixture: userId === null,
  });
  return NextResponse.json(feed);
}

export async function GET() {
  const onboarding = await readHomeOnboardingCookie();
  let userId: string | null = null;
  try {
    userId = await requireSessionUserId();
  } catch {
    userId = null;
  }
  return NextResponse.json({ onboarding, userId });
}
