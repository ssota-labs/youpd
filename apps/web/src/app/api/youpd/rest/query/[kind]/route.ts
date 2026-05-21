import 'server-only';

import { NextResponse } from 'next/server';
import {
  ChannelSnapshotsQueryInputSchema,
  ChannelSummaryInputSchema,
  KeywordSummaryInputSchema,
  QueryHotVideosInputSchema,
  VideoSnapshotsQueryInputSchema,
  queryChannelMetricSnapshotSeries,
  queryVideoMetricSnapshotSeries,
  queryYouTubeHotVideos,
  summarizeChannel,
  summarizeKeywordMarket,
} from '@youpd/api/youtube';
import { wrapRestEnvelope } from '@youpd/api/rest';
import { withYoupdRest } from '@/server/youpd-rest';

type RouteContext = {
  params: Promise<{ kind: string }>;
};

function json<T>(data: T): Response {
  return NextResponse.json(wrapRestEnvelope(data));
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  return withYoupdRest(request, async () => {
    const { kind } = await context.params;
    const body: unknown = await request.json();

    switch (kind) {
      case 'hot-videos':
        return json(await queryYouTubeHotVideos(QueryHotVideosInputSchema.parse(body)));
      case 'keyword-summary':
        return json(
          await summarizeKeywordMarket(KeywordSummaryInputSchema.parse(body)),
        );
      case 'channel-summary':
        return json(await summarizeChannel(ChannelSummaryInputSchema.parse(body)));
      case 'video-snapshots':
        return json(
          await queryVideoMetricSnapshotSeries(
            VideoSnapshotsQueryInputSchema.parse(body),
          ),
        );
      case 'channel-snapshots':
        return json(
          await queryChannelMetricSnapshotSeries(
            ChannelSnapshotsQueryInputSchema.parse(body),
          ),
        );
      default:
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
  });
}
