import { NextResponse } from 'next/server';
import { HomeProfileInputSchema } from '@youpd/types';
import { generateKeywordProbes, getHomeFeed, saveHomeProfile } from '@youpd/api/home';
import { requireSessionUserId } from '@/lib/auth/require-session-user';

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

  try {
    const userId = await requireSessionUserId();
    await saveHomeProfile(userId, parsed.data);
    const generated = await generateKeywordProbes(userId, parsed.data);
    const feed = await getHomeFeed({
      onboarding: {
        interestTopics: parsed.data.interestTopics,
        channelDescription: parsed.data.channelDescription,
      },
      userId,
    });
    return NextResponse.json({
      ...generated,
      feed,
      stubBanner: !generated.llmConfigured,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unauthorized';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
