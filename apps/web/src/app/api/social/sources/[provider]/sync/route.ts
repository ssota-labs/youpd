import { NextResponse } from 'next/server';
import { syncSocialProvider } from '@youpd/api/social';
import type { SocialProvider } from '@youpd/types';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { socialPostsErrorResponse } from '@/lib/social/api-errors';

type RouteContext = { params: Promise<{ provider: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const userId = await requireSessionUserId();
    const { provider } = await context.params;
    await syncSocialProvider(userId, provider as SocialProvider);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return socialPostsErrorResponse(error);
  }
}
