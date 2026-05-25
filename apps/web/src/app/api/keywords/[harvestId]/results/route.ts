import { NextResponse } from 'next/server';
import { searchKeywordHarvestResults } from '@youpd/api/youtube';
import { parseKeywordHarvestSearchParams } from '@/lib/video-search/parse-keyword-harvest-params';

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

type RouteContext = {
  params: Promise<{ harvestId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { harvestId } = await context.params;
  const url = new URL(request.url);
  const filters = parseKeywordHarvestSearchParams(
    harvestId,
    searchParamsToRecord(url.searchParams),
  );
  const result = await searchKeywordHarvestResults(filters);

  return NextResponse.json({
    page: result.data.page,
    hasMore: result.data.hasMore,
    videos: result.data.videos,
  });
}
