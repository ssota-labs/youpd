import { NextResponse } from 'next/server';
import { extractIntroSegmentFromReferenceVideo } from '@youpd/api/intro-templates';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { introTemplatesErrorResponse } from '@/lib/intro-templates/api-errors';

type RouteContext = {
  params: Promise<{ folderId: string; itemId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const userId = await requireSessionUserId();
    const { folderId, itemId } = await context.params;
    const segment = await extractIntroSegmentFromReferenceVideo({
      userId,
      folderId,
      itemId,
    });
    return NextResponse.json(segment);
  } catch (error) {
    return introTemplatesErrorResponse(error);
  }
}
