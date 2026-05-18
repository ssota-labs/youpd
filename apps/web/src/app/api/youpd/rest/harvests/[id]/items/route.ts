import 'server-only';

import { NextResponse } from 'next/server';
import { wrapRestEnvelope } from '@youpd/api/rest';
import {
  ListHarvestItemsInputSchema,
  listHarvestItems,
} from '@youpd/api/rest/harvests';
import { withYoupdRest } from '@/server/youpd-rest';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return withYoupdRest(request, async () => {
    const { id } = await context.params;
    const url = new URL(request.url);
    const sizeRaw = url.searchParams.get('size');
    const input = ListHarvestItemsInputSchema.parse({
      kind: url.searchParams.get('kind') ?? undefined,
      size: sizeRaw ? Number(sizeRaw) : undefined,
      include_published:
        url.searchParams.get('include_published') === 'true',
    });
    const result = await listHarvestItems(id, input);
    return NextResponse.json(wrapRestEnvelope(result));
  });
}
