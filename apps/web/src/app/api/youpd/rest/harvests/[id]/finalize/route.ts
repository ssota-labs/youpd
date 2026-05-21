import 'server-only';

import { NextResponse } from 'next/server';
import { wrapRestEnvelope } from '@youpd/api/rest';
import {
  FinalizeHarvestInputSchema,
  finalizeHarvest,
} from '@youpd/api/rest/harvests';
import { withYoupdRest } from '@/server/youpd-rest';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return withYoupdRest(request, async () => {
    const { id } = await context.params;
    const body: unknown = await request.json();
    const input = FinalizeHarvestInputSchema.parse(body);
    const result = await finalizeHarvest(id, input);
    return NextResponse.json(wrapRestEnvelope(result));
  });
}
