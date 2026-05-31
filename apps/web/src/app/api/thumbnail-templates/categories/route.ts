import { NextResponse } from 'next/server';
import { listThumbnailTemplateCategories } from '@youpd/api/thumbnail-templates';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { thumbnailTemplatesErrorResponse } from '@/lib/thumbnail-templates/api-errors';

export async function GET() {
  try {
    await requireSessionUserId();
    const categories = await listThumbnailTemplateCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    return thumbnailTemplatesErrorResponse(error);
  }
}
