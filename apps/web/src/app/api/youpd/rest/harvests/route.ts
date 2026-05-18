import 'server-only';

import { NextResponse } from 'next/server';
import { metaFromResult, wrapRestEnvelope } from '@youpd/api/rest';
import {
  CreateHarvestInputSchema,
  createHarvest,
} from '@youpd/api/rest/harvests';
import { withYoupdRest } from '@/server/youpd-rest';

export async function POST(request: Request): Promise<Response> {
  return withYoupdRest(request, async () => {
    const body: unknown = await request.json();
    const input = CreateHarvestInputSchema.parse(body);
    const result = await createHarvest(input);
    return NextResponse.json(
      wrapRestEnvelope(result, metaFromResult(result)),
    );
  });
}
