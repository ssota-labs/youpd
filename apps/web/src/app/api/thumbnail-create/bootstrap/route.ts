import { NextResponse } from 'next/server';
import { getThumbnailCreateBootstrap } from '@youpd/api/thumbnail-generation';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { thumbnailGenerationErrorResponse } from '@/lib/thumbnail-generation/api-errors';

export async function GET(request: Request) {
  try {
    const userId = await requireSessionUserId();
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');
    if (!templateId) {
      return NextResponse.json(
        { error: 'templateId is required', code: 'VALIDATION' },
        { status: 400 },
      );
    }
    const bootstrap = await getThumbnailCreateBootstrap({ userId, templateId });
    return NextResponse.json(bootstrap);
  } catch (error) {
    return thumbnailGenerationErrorResponse(error);
  }
}
