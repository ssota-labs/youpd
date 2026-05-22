import 'server-only';

import { NextResponse } from 'next/server';
import {
  AnalyzeChannelInputSchema,
  AnalyzeVideoInputSchema,
  CaptureDailySnapshotsInputSchema,
  CollectTrendingDailyInputSchema,
  GetTrendingVideosInputSchema,
  SearchKeywordWorkflowInputSchema,
  captureDailySnapshots,
  collectTrendingDaily,
  ensureChannelAnalysis,
  ensureVideoAnalysis,
  getStoredTrendingVideos,
  runKeywordSearchAnalysis,
} from '@youpd/api/youtube';
import { wrapRestEnvelope } from '@youpd/api/rest';
import { withYoupdRest } from '@/server/youpd-rest';

type RouteContext = {
  params: Promise<{ action: string }>;
};

function json<T>(data: T): Response {
  return NextResponse.json(wrapRestEnvelope(data));
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  return withYoupdRest(request, async () => {
    const { action } = await context.params;
    const body: unknown = await request.json();

    switch (action) {
      case 'analyze-video':
        return json(
          await ensureVideoAnalysis(AnalyzeVideoInputSchema.parse(body)),
        );
      case 'analyze-channel':
        return json(
          await ensureChannelAnalysis(AnalyzeChannelInputSchema.parse(body)),
        );
      case 'search-keyword':
        return json(
          await runKeywordSearchAnalysis(
            SearchKeywordWorkflowInputSchema.parse(body),
          ),
        );
      case 'get-trending-videos':
        return json(
          await getStoredTrendingVideos(
            GetTrendingVideosInputSchema.parse(body),
          ),
        );
      case 'collect-trending-daily':
        return json(
          await collectTrendingDaily(CollectTrendingDailyInputSchema.parse(body)),
        );
      case 'capture-daily-snapshots':
        return json(
          await captureDailySnapshots(
            CaptureDailySnapshotsInputSchema.parse(body),
          ),
        );
      default:
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
  });
}
