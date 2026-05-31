import { NextResponse } from 'next/server';
import { removeSocialPostFromFolder } from '@youpd/api/social';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { socialPostsErrorResponse } from '@/lib/social/api-errors';

type RouteContext = {
  params: Promise<{ folderId: string; itemId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const userId = await requireSessionUserId();
    const { folderId, itemId } = await context.params;
    await removeSocialPostFromFolder(userId, folderId, itemId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return socialPostsErrorResponse(error);
  }
}
