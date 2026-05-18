import 'server-only';

import { NextResponse } from 'next/server';
import { wrapRestEnvelope } from '@youpd/api/rest';
import {
  QueryCommentsInputSchema,
  queryComments,
} from '@youpd/api/mcp/tools';
import { withYoupdRest } from '@/server/youpd-rest';

export async function POST(request: Request): Promise<Response> {
  return withYoupdRest(request, async () => {
    const body: unknown = await request.json();
    const input = QueryCommentsInputSchema.parse(body);
    const data = await queryComments(input);
    return NextResponse.json(wrapRestEnvelope(data));
  });
}
