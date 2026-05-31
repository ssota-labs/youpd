import { NextResponse } from 'next/server';
import { ingestSocialManual } from '@youpd/api/social';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { socialPostsErrorResponse } from '@/lib/social/api-errors';

export async function POST(request: Request) {
  try {
    const userId = await requireSessionUserId();
    const body = await request.json();
    const post = await ingestSocialManual(userId, body);
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    return socialPostsErrorResponse(error);
  }
}
