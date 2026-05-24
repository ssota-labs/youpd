import 'server-only';

import { NextResponse } from 'next/server';
import {
  PromoteKeywordResultsInputSchema,
  promoteKeywordResultsToHotVideos,
} from '@youpd/api/youtube';
import { wrapRestEnvelope } from '@youpd/api/rest';
import { requireCronSecret } from '@/server/cron-auth';
import { youpdRestError } from '@/server/youpd-rest';

export async function GET(request: Request): Promise<Response> {
  try {
    requireCronSecret(request);
    const result = await promoteKeywordResultsToHotVideos(
      PromoteKeywordResultsInputSchema.parse({ regionCode: 'KR' }),
    );
    return NextResponse.json(wrapRestEnvelope(result));
  } catch (error) {
    return youpdRestError(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    requireCronSecret(request);
    const body: unknown = await request.json();
    const result = await promoteKeywordResultsToHotVideos(
      PromoteKeywordResultsInputSchema.parse(body),
    );
    return NextResponse.json(wrapRestEnvelope(result));
  } catch (error) {
    return youpdRestError(error);
  }
}
