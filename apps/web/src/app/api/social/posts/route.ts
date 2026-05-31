import { NextResponse } from 'next/server';
import { listSocialPostSummaries } from '@youpd/api/social';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { socialPostsErrorResponse } from '@/lib/social/api-errors';

export async function GET() {
  try {
    const userId = await requireSessionUserId();
    const posts = await listSocialPostSummaries(userId);
    return NextResponse.json({ posts });
  } catch (error) {
    return socialPostsErrorResponse(error);
  }
}
