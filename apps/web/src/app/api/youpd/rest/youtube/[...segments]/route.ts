import 'server-only';

import { NextResponse } from 'next/server';
import {
  BatchYouTubeVideosInputSchema,
  CaptureYouTubeMetricSnapshotsInputSchema,
  FetchTrendingYouTubeVideosInputSchema,
  GetYouTubeChannelInputSchema,
  GetYouTubeVideoInputSchema,
  ListYouTubeChannelVideosInputSchema,
  ListYouTubeVideoCommentsInputSchema,
  SearchYouTubeVideosInputSchema,
  batchYouTubeVideos,
  captureYouTubeMetricSnapshots,
  fetchTrendingYouTubeVideos,
  getYouTubeChannel,
  getYouTubeVideo,
  listYouTubeChannelVideos,
  listYouTubeVideoComments,
  searchYouTubeVideos,
} from '@youpd/api/youtube';
import { wrapRestEnvelope } from '@youpd/api/rest';
import { withYoupdRest } from '@/server/youpd-rest';

type RouteContext = {
  params: Promise<{ segments: string[] }>;
};

function boolParam(url: URL, key: string): boolean | undefined {
  if (!url.searchParams.has(key)) return undefined;
  const value = url.searchParams.get(key);
  return value === 'true' || value === '1';
}

function numParam(url: URL, key: string): number | undefined {
  return url.searchParams.has(key) ? Number(url.searchParams.get(key)) : undefined;
}

function nullableParam(url: URL, key: string): string | null | undefined {
  if (!url.searchParams.has(key)) return undefined;
  const value = url.searchParams.get(key);
  return value && value.length > 0 ? value : null;
}

function json<T>(data: T): Response {
  return NextResponse.json(wrapRestEnvelope(data));
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  return withYoupdRest(request, async () => {
    const { segments } = await context.params;
    const body: unknown = await request.json();

    if (segments[0] === 'search' && segments[1] === 'videos') {
      const input = SearchYouTubeVideosInputSchema.parse(body);
      return json(await searchYouTubeVideos(input));
    }

    if (segments[0] === 'videos' && segments[1] === 'batch') {
      const input = BatchYouTubeVideosInputSchema.parse(body);
      return json(await batchYouTubeVideos(input));
    }

    if (segments[0] === 'trending' && segments[1] === 'videos') {
      const input = FetchTrendingYouTubeVideosInputSchema.parse(body);
      return json(await fetchTrendingYouTubeVideos(input));
    }

    if (segments[0] === 'snapshots' && segments[1] === 'capture') {
      const input = CaptureYouTubeMetricSnapshotsInputSchema.parse(body);
      return json(await captureYouTubeMetricSnapshots(input));
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  });
}

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  return withYoupdRest(request, async () => {
    const { segments } = await context.params;
    const url = new URL(request.url);

    if (segments[0] === 'videos' && segments[1] && segments.length === 2) {
      const input = GetYouTubeVideoInputSchema.parse({
        videoId: segments[1],
        persist: boolParam(url, 'persist'),
        includeChannel: boolParam(url, 'includeChannel'),
        includeComments: boolParam(url, 'includeComments'),
        commentsTopN: numParam(url, 'commentsTopN'),
        includeScore: boolParam(url, 'includeScore'),
      });
      return json(await getYouTubeVideo(input));
    }

    if (
      segments[0] === 'videos' &&
      segments[1] &&
      segments[2] === 'comments'
    ) {
      const input = ListYouTubeVideoCommentsInputSchema.parse({
        videoId: segments[1],
        limit: numParam(url, 'limit'),
        persist: boolParam(url, 'persist'),
      });
      return json(await listYouTubeVideoComments(input));
    }

    if (segments[0] === 'channels' && segments[1] && segments.length === 2) {
      const input = GetYouTubeChannelInputSchema.parse({
        channelId: segments[1],
        persist: boolParam(url, 'persist'),
        refreshAverage: boolParam(url, 'refreshAverage'),
        averageVideoLimit: numParam(url, 'averageVideoLimit'),
      });
      return json(await getYouTubeChannel(input));
    }

    if (
      segments[0] === 'channels' &&
      segments[1] &&
      segments[2] === 'videos'
    ) {
      const input = ListYouTubeChannelVideosInputSchema.parse({
        channelId: segments[1],
        limit: numParam(url, 'limit'),
        persist: boolParam(url, 'persist'),
        updateChannelAverage: boolParam(url, 'updateChannelAverage'),
      });
      return json(await listYouTubeChannelVideos(input));
    }

    if (segments[0] === 'trending' && segments[1] === 'videos') {
      const input = FetchTrendingYouTubeVideosInputSchema.parse({
        date: url.searchParams.get('date') ?? undefined,
        regionCode: url.searchParams.get('regionCode') ?? undefined,
        categoryId: nullableParam(url, 'categoryId'),
        limit: numParam(url, 'limit'),
        persist: boolParam(url, 'persist'),
      });
      return json(await fetchTrendingYouTubeVideos(input));
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  });
}
