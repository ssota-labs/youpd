import 'server-only';

import { NextResponse } from 'next/server';
import {
  metaFromResult,
  splitQuotaSession,
  wrapRestEnvelope,
} from '@youpd/api/rest';
import {
  GetChannelAllVideosInputSchema,
  getChannelAllVideos,
} from '@youpd/api/mcp/tools';
import {
  GetChannelVideosPageInputSchema,
  getChannelVideosPage,
} from '@youpd/api/collection';
import { withYoupdRest } from '@/server/youpd-rest';

export async function GET(
  request: Request,
  context: { params: Promise<{ channelId: string }> },
): Promise<Response> {
  return withYoupdRest(request, async () => {
    const { channelId } = await context.params;
    const url = new URL(request.url);
    const all =
      url.searchParams.get('all') === 'true' ||
      url.searchParams.get('all') === '1';

    if (all) {
      const qp = {
        channel_id: channelId,
        max_videos: url.searchParams.has('max_videos')
          ? Number(url.searchParams.get('max_videos'))
          : undefined,
      };
      const input = GetChannelAllVideosInputSchema.parse(qp);
      const raw = await getChannelAllVideos(input);
      const { body: data } = splitQuotaSession(raw);
      return NextResponse.json(
        wrapRestEnvelope(data, metaFromResult(raw)),
      );
    }

    const pageInput = GetChannelVideosPageInputSchema.parse({
      channel_id: channelId,
      uploads_playlist_id:
        url.searchParams.get('uploads_playlist_id') ?? undefined,
      playlist_page_token:
        url.searchParams.get('playlist_page_token') ?? undefined,
      page_size: url.searchParams.has('page_size')
        ? Number(url.searchParams.get('page_size'))
        : undefined,
    });
    const raw = await getChannelVideosPage(pageInput);
    const { body: data } = splitQuotaSession(raw);
    return NextResponse.json(
      wrapRestEnvelope(data, metaFromResult(raw, {
        nextPlaylistPageToken: raw.playlist_next_page_token,
      })),
    );
  });
}
