import 'server-only';

import { NextResponse } from 'next/server';
import {
  metaFromResult,
  splitQuotaSession,
  wrapRestEnvelope,
} from '@youpd/api/rest';
import {
  ComputeMetricsInputSchema,
  computeMetrics,
} from '@youpd/api/mcp/tools';
import { withYoupdRest } from '@/server/youpd-rest';

export async function POST(request: Request): Promise<Response> {
  return withYoupdRest(request, async () => {
    const body: unknown = await request.json();
    const input = ComputeMetricsInputSchema.parse(body);
    const raw = await computeMetrics(input);
    const { body: data } = splitQuotaSession(raw);
    return NextResponse.json(
      wrapRestEnvelope(data, metaFromResult(raw)),
    );
  });
}
