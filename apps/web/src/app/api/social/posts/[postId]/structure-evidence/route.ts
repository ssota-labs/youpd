import { NextResponse } from 'next/server';
import {
  createOrUpdateSocialPostStructureEvidence,
  getSocialPostStructureEvidence,
} from '@youpd/api/thread-templates';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { threadTemplatesErrorResponse } from '@/lib/thread-templates/api-errors';

type RouteContext = { params: Promise<{ postId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const userId = await requireSessionUserId();
    const { postId } = await context.params;
    const evidence = await getSocialPostStructureEvidence(userId, postId);
    return NextResponse.json({ evidence });
  } catch (error) {
    return threadTemplatesErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const userId = await requireSessionUserId();
    const { postId } = await context.params;
    const body = await request.json();
    const evidence = await createOrUpdateSocialPostStructureEvidence(
      userId,
      postId,
      body,
    );
    return NextResponse.json(evidence);
  } catch (error) {
    return threadTemplatesErrorResponse(error);
  }
}
