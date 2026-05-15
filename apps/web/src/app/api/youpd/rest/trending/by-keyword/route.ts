import 'server-only';

import { NextResponse } from 'next/server';
import {
  metaFromResult,
  splitQuotaSession,
  wrapRestEnvelope,
} from '@youpd/api/rest';
import {
  FetchTrendingByKeywordInputSchema,
  fetchTrendingByKeyword,
} from '@youpd/api/mcp/tools';
import { withYoupdRest } from '@/server/youpd-rest';

export async function GET(request: Request): Promise<Response> {
  return withYoupdRest(request, async () => {
    const url = new URL(request.url);
    const qp = {
      keyword: url.searchParams.get('keyword') ?? '',
      hours: url.searchParams.has('hours')
        ? Number(url.searchParams.get('hours'))
        : undefined,
      max_results: url.searchParams.has('max_results')
        ? Number(url.searchParams.get('max_results'))
        : undefined,
      region_code: url.searchParams.get('region_code') ?? undefined,
    };
    const input = FetchTrendingByKeywordInputSchema.parse(qp);
    const raw = await fetchTrendingByKeyword(input);
    const { body: data } = splitQuotaSession(raw);
    return NextResponse.json(
      wrapRestEnvelope(data, metaFromResult(raw)),
    );
  });
}
