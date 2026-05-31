import { NextResponse } from 'next/server';
import { listThumbnailTemplateTags } from '@youpd/api/thumbnail-templates';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { thumbnailTemplatesErrorResponse } from '@/lib/thumbnail-templates/api-errors';

export async function GET() {
  try {
    await requireSessionUserId();
    const tags = await listThumbnailTemplateTags();
    return NextResponse.json({ tags });
  } catch (error) {
    return thumbnailTemplatesErrorResponse(error);
  }
}
