import { NextResponse } from 'next/server';
import { searchStoredHotVideos } from '@youpd/api/youtube';
import { parseHotVideoSearchParams } from '@/lib/hot-videos/parse-params';

function searchParamsToRecord(
  searchParams: URLSearchParams,
): Record<string, string | string[] | undefined> {
  const result: Record<string, string | string[] | undefined> = {};
  for (const [key, value] of searchParams.entries()) {
    const existing = result[key];
    if (existing === undefined) {
      result[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      result[key] = [existing, value];
    }
  }
  return result;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const filters = parseHotVideoSearchParams(searchParamsToRecord(url.searchParams));
  const result = await searchStoredHotVideos(filters);

  return NextResponse.json({
    page: result.data.page,
    hasMore: result.data.hasMore,
    videos: result.data.videos,
  });
}
