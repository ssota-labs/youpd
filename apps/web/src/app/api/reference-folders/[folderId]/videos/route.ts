import { NextResponse } from 'next/server';
import {
  addVideoToFolder,
  getFolderWithVideos,
} from '@youpd/api/reference-folders';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { referenceFoldersErrorResponse } from '@/lib/reference-folders/api-errors';

type RouteContext = { params: Promise<{ folderId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const userId = await requireSessionUserId();
    const { folderId } = await context.params;
    const folder = await getFolderWithVideos(userId, folderId);
    return NextResponse.json(folder);
  } catch (error) {
    return referenceFoldersErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const userId = await requireSessionUserId();
    const { folderId } = await context.params;
    const body = await request.json();
    const item = await addVideoToFolder(userId, folderId, body);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return referenceFoldersErrorResponse(error);
  }
}
