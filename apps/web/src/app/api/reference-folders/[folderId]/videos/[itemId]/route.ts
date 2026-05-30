import { NextResponse } from 'next/server';
import { removeVideoFromFolder } from '@youpd/api/reference-folders';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { referenceFoldersErrorResponse } from '@/lib/reference-folders/api-errors';

type RouteContext = {
  params: Promise<{ folderId: string; itemId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const userId = await requireSessionUserId();
    const { folderId, itemId } = await context.params;
    await removeVideoFromFolder(userId, folderId, itemId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return referenceFoldersErrorResponse(error);
  }
}
