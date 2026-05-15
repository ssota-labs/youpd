import 'server-only';

import { NextResponse } from 'next/server';
import { wrapRestEnvelope, type YoupdRestMeta } from '@youpd/api/rest';
import { getSearchSessionById } from '@youpd/supabase/repositories/quota';
import { withYoupdRest } from '@/server/youpd-rest';

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
): Promise<Response> {
  return withYoupdRest(request, async () => {
    const { jobId } = await context.params;
    const row = await getSearchSessionById(jobId);
    if (!row) {
      const meta: YoupdRestMeta = {
        fetchedAt: new Date().toISOString(),
        source: 'youpd-rest',
        jobId,
      };
      return NextResponse.json(wrapRestEnvelope(null, meta), { status: 404 });
    }

    const {
      id,
      occurredAt,
      operation,
      keyword,
      videoIds,
      channelId,
      resultCount,
      unitsConsumed,
      status,
      errorReason,
    } = row;
    const data = {
      id,
      occurredAt,
      operation,
      keyword,
      videoIds,
      channelId,
      resultCount,
      unitsConsumed,
      status,
      errorReason,
    };
    return NextResponse.json(
      wrapRestEnvelope(data, {
        jobId: id,
      }),
    );
  });
}
