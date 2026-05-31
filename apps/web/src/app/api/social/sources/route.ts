import { NextResponse } from 'next/server';
import { listSocialSourcesForUser } from '@youpd/api/social';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { socialPostsErrorResponse } from '@/lib/social/api-errors';

export async function GET() {
  try {
    const userId = await requireSessionUserId();
    const sources = await listSocialSourcesForUser(userId);
    return NextResponse.json({ sources });
  } catch (error) {
    return socialPostsErrorResponse(error);
  }
}
