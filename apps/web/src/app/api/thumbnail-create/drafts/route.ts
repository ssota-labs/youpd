import { NextResponse } from 'next/server';
import { upsertThumbnailCreateDraft } from '@youpd/api/thumbnail-generation';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { thumbnailGenerationErrorResponse } from '@/lib/thumbnail-generation/api-errors';

export async function PUT(request: Request) {
  try {
    const userId = await requireSessionUserId();
    const body = await request.json();
    const result = await upsertThumbnailCreateDraft({ userId, body });
    return NextResponse.json(result);
  } catch (error) {
    return thumbnailGenerationErrorResponse(error);
  }
}
