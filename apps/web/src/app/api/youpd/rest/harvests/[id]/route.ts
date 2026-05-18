import 'server-only';

import { NextResponse } from 'next/server';
import { wrapRestEnvelope } from '@youpd/api/rest';
import { getHarvestSummary } from '@youpd/api/rest/harvests';
import { withYoupdRest } from '@/server/youpd-rest';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return withYoupdRest(request, async () => {
    const { id } = await context.params;
    const summary = await getHarvestSummary(id);
    return NextResponse.json(wrapRestEnvelope(summary));
  });
}
