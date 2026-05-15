import 'server-only';

import { NextResponse } from 'next/server';
import {
  metaFromResult,
  splitQuotaSession,
  wrapRestEnvelope,
} from '@youpd/api/rest';
import {
  GetVideoCommentsInputSchema,
  getVideoComments,
} from '@youpd/api/mcp/tools';
import { withYoupdRest } from '@/server/youpd-rest';

export async function GET(
  request: Request,
  context: { params: Promise<{ videoId: string }> },
): Promise<Response> {
  return withYoupdRest(request, async () => {
    const { videoId } = await context.params;
    const url = new URL(request.url);
    const qp = {
      video_id: videoId,
      top_n: url.searchParams.has('top_n')
        ? Number(url.searchParams.get('top_n'))
        : undefined,
    };
    const input = GetVideoCommentsInputSchema.parse(qp);
    const raw = await getVideoComments(input);
    const { body: data } = splitQuotaSession(raw);
    return NextResponse.json(
      wrapRestEnvelope(data, metaFromResult(raw)),
    );
  });
}
