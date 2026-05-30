import { NextResponse } from 'next/server';
import { addVideoToFolder } from '@youpd/api/reference-folders';
import { getProbeCandidateForVideo } from '@youpd/api/youtube';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { referenceFoldersErrorResponse } from '@/lib/reference-folders/api-errors';
import { z } from 'zod';

const QuickAddSchema = z.object({
  folderId: z.string().uuid(),
  harvestId: z.string().uuid(),
  videoId: z.string().min(1),
  saveReason: z.string().max(500).nullable().optional(),
  allowSubGoodPlus: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const userId = await requireSessionUserId();
    const body = QuickAddSchema.parse(await request.json());
    const candidate = await getProbeCandidateForVideo(body.harvestId, body.videoId);
    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate not found for harvest', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }
    const item = await addVideoToFolder(userId, body.folderId, {
      hotCandidate: candidate,
      saveReason: body.saveReason,
      allowSubGoodPlus: body.allowSubGoodPlus,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return referenceFoldersErrorResponse(error);
  }
}
