import 'server-only';

import { NextResponse } from 'next/server';
import {
  metaFromResult,
  splitQuotaSession,
  wrapRestEnvelope,
} from '@youpd/api/rest';
import {
  FetchHotChartInputSchema,
  fetchHotChart,
} from '@youpd/api/mcp/tools';
import { withYoupdRest } from '@/server/youpd-rest';

export async function GET(request: Request): Promise<Response> {
  return withYoupdRest(request, async () => {
    const url = new URL(request.url);
    const qp = {
      region_code: url.searchParams.get('region_code') ?? 'KR',
      category_id: url.searchParams.get('category_id') ?? undefined,
      limit: url.searchParams.has('limit')
        ? Number(url.searchParams.get('limit'))
        : undefined,
    };
    const input = FetchHotChartInputSchema.parse(qp);
    const raw = await fetchHotChart(input);
    const { body: data } = splitQuotaSession(raw);
    return NextResponse.json(
      wrapRestEnvelope(data, metaFromResult(raw)),
    );
  });
}
