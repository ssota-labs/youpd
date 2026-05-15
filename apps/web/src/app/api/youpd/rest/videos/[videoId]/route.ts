import 'server-only';

import { NextResponse } from 'next/server';
import {
  metaFromResult,
  splitQuotaSession,
  wrapRestEnvelope,
} from '@youpd/api/rest';
import {
  GetVideoDetailInputSchema,
  getVideoDetail,
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
      include_comments: url.searchParams.has('include_comments')
        ? url.searchParams.get('include_comments') === 'true'
        : undefined,
      comments_top_n: url.searchParams.has('comments_top_n')
        ? Number(url.searchParams.get('comments_top_n'))
        : undefined,
    };
    const input = GetVideoDetailInputSchema.parse(qp);
    const raw = await getVideoDetail(input);
    const { body: data } = splitQuotaSession(raw);
    return NextResponse.json(
      wrapRestEnvelope(data, metaFromResult(raw)),
    );
  });
}
