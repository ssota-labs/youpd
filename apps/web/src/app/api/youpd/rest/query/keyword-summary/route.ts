import 'server-only';

import { NextResponse } from 'next/server';
import { wrapRestEnvelope } from '@youpd/api/rest';
import {
  KeywordSummaryInputSchema,
  keywordSummary,
} from '@youpd/api/mcp/tools';
import { withYoupdRest } from '@/server/youpd-rest';

export async function POST(request: Request): Promise<Response> {
  return withYoupdRest(request, async () => {
    const body: unknown = await request.json();
    const input = KeywordSummaryInputSchema.parse(body);
    const data = await keywordSummary(input);
    return NextResponse.json(wrapRestEnvelope(data));
  });
}
