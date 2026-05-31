import { NextResponse } from 'next/server';
import {
  addSocialPostToFolder,
  getFolderWithSocialPosts,
} from '@youpd/api/social';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { socialPostsErrorResponse } from '@/lib/social/api-errors';

type RouteContext = { params: Promise<{ folderId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const userId = await requireSessionUserId();
    const { folderId } = await context.params;
    const folder = await getFolderWithSocialPosts(userId, folderId);
    return NextResponse.json(folder);
  } catch (error) {
    return socialPostsErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const userId = await requireSessionUserId();
    const { folderId } = await context.params;
    const body = await request.json();
    const item = await addSocialPostToFolder(userId, folderId, body);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return socialPostsErrorResponse(error);
  }
}
