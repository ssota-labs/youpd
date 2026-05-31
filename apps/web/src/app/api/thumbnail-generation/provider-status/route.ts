import { NextResponse } from 'next/server';
import { getThumbnailGenerationProviderStatus } from '@youpd/api/thumbnail-generation';
import { requireSessionUserId } from '@/lib/auth/require-session-user';

export async function GET() {
  await requireSessionUserId();
  return NextResponse.json(getThumbnailGenerationProviderStatus());
}
