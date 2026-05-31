import { NextResponse } from 'next/server';
import { getThumbnailTemplateDetail } from '@youpd/api/thumbnail-templates';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { thumbnailTemplatesErrorResponse } from '@/lib/thumbnail-templates/api-errors';

type Params = { params: Promise<{ templateId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireSessionUserId();
    const { templateId } = await params;
    const detail = await getThumbnailTemplateDetail(templateId);
    return NextResponse.json(detail);
  } catch (error) {
    return thumbnailTemplatesErrorResponse(error);
  }
}
