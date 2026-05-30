import { NextResponse } from 'next/server';
import {
  ListProbeCandidatesInputSchema,
  listProbeCandidates,
} from '@youpd/api/youtube';

type RouteContext = {
  params: Promise<{ harvestId: string }>;
};

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

export async function GET(request: Request, context: RouteContext) {
  const { harvestId } = await context.params;
  const url = new URL(request.url);
  const sp = searchParamsToRecord(url.searchParams);

  const parsed = ListProbeCandidatesInputSchema.parse({
    harvestId,
    page: sp.page ? Number(sp.page) : 1,
    limit: sp.limit ? Number(sp.limit) : 24,
    goodPlusOnly: sp.goodPlusOnly === 'false' ? false : true,
  });

  const result = await listProbeCandidates(parsed);

  return NextResponse.json({
    ...result.data,
    warnings: result.warnings,
  });
}
