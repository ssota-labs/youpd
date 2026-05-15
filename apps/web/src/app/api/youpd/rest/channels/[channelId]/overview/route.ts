import 'server-only';

import { NextResponse } from 'next/server';
import {
  metaFromResult,
  splitQuotaSession,
  wrapRestEnvelope,
} from '@youpd/api/rest';
import {
  GetChannelOverviewInputSchema,
  getChannelOverview,
} from '@youpd/api/mcp/tools';
import { withYoupdRest } from '@/server/youpd-rest';

export async function GET(
  request: Request,
  context: { params: Promise<{ channelId: string }> },
): Promise<Response> {
  return withYoupdRest(request, async () => {
    const { channelId } = await context.params;
    const url = new URL(request.url);
    const qp = {
      channel_id: channelId,
      top_n: url.searchParams.has('top_n')
        ? Number(url.searchParams.get('top_n'))
        : undefined,
    };
    const input = GetChannelOverviewInputSchema.parse(qp);
    const raw = await getChannelOverview(input);
    const { body: data } = splitQuotaSession(raw);
    return NextResponse.json(
      wrapRestEnvelope(data, metaFromResult(raw)),
    );
  });
}
