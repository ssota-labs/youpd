import { NextResponse } from 'next/server';
import {
  createReferenceGroup,
  listReferenceGroups,
} from '@youpd/api/reference-folders';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { referenceFoldersErrorResponse } from '@/lib/reference-folders/api-errors';

export async function GET() {
  try {
    const userId = await requireSessionUserId();
    const groups = await listReferenceGroups(userId);
    return NextResponse.json({ groups });
  } catch (error) {
    return referenceFoldersErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireSessionUserId();
    const body = await request.json();
    const group = await createReferenceGroup(userId, body);
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    return referenceFoldersErrorResponse(error);
  }
}
