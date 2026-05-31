import { NextResponse } from 'next/server';
import { getVideoTranscriptStatus } from '@youpd/api/intro-templates';
import { getReferenceFolderVideoForUser } from '@youpd/supabase/repositories/intro-templates';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { introTemplatesErrorResponse } from '@/lib/intro-templates/api-errors';

type RouteContext = {
  params: Promise<{ folderId: string; itemId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const userId = await requireSessionUserId();
    const { folderId, itemId } = await context.params;
    const folderVideo = await getReferenceFolderVideoForUser({
      userId,
      folderId,
      itemId,
    });
    if (!folderVideo) {
      return NextResponse.json(
        { error: 'Reference video not found', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }
    const status = await getVideoTranscriptStatus(folderVideo.video.videoId);
    return NextResponse.json(status);
  } catch (error) {
    return introTemplatesErrorResponse(error);
  }
}
