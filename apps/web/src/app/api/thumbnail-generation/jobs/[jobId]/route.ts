import { NextResponse } from 'next/server';
import { getThumbnailGenerationJob } from '@youpd/api/thumbnail-generation';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { thumbnailGenerationErrorResponse } from '@/lib/thumbnail-generation/api-errors';

type Params = { params: Promise<{ jobId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const userId = await requireSessionUserId();
    const { jobId } = await params;
    const job = await getThumbnailGenerationJob({ userId, jobId });
    return NextResponse.json(job);
  } catch (error) {
    return thumbnailGenerationErrorResponse(error);
  }
}
