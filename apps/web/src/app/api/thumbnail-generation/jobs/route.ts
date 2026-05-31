import { NextResponse } from 'next/server';
import {
  createThumbnailGenerationJob,
  listThumbnailGenerationJobs,
} from '@youpd/api/thumbnail-generation';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { thumbnailGenerationErrorResponse } from '@/lib/thumbnail-generation/api-errors';

export async function GET() {
  try {
    const userId = await requireSessionUserId();
    const jobs = await listThumbnailGenerationJobs({ userId });
    return NextResponse.json(jobs);
  } catch (error) {
    return thumbnailGenerationErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireSessionUserId();
    const body = await request.json();
    const job = await createThumbnailGenerationJob({ userId, body });
    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    return thumbnailGenerationErrorResponse(error);
  }
}
