import { NextResponse } from 'next/server';
import { getReferenceGroup } from '@youpd/api/reference-folders';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { referenceFoldersErrorResponse } from '@/lib/reference-folders/api-errors';

type RouteContext = { params: Promise<{ groupId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const userId = await requireSessionUserId();
    const { groupId } = await context.params;
    const group = await getReferenceGroup(userId, groupId);
    return NextResponse.json(group);
  } catch (error) {
    return referenceFoldersErrorResponse(error);
  }
}
