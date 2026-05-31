import { NextResponse } from 'next/server';
import { createManualIntroSegmentFromReferenceVideo } from '@youpd/api/intro-templates';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { introTemplatesErrorResponse } from '@/lib/intro-templates/api-errors';

type RouteContext = {
  params: Promise<{ folderId: string; itemId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const userId = await requireSessionUserId();
    const { folderId, itemId } = await context.params;
    const body = await request.json();
    const segment = await createManualIntroSegmentFromReferenceVideo({
      userId,
      folderId,
      itemId,
      body,
    });
    return NextResponse.json(segment);
  } catch (error) {
    return introTemplatesErrorResponse(error);
  }
}
