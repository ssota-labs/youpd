import 'server-only';

import { NextResponse } from 'next/server';
import { wrapRestEnvelope } from '@youpd/api/rest';
import { getLatestVersionSchema } from '@youpd/api/mcp/version';
import { withYoupdRest } from '@/server/youpd-rest';

export async function GET(request: Request): Promise<Response> {
  return withYoupdRest(request, async () => {
    const url = new URL(request.url);
    const dbName = url.searchParams.get('db_name') ?? undefined;
    const data = dbName
      ? getLatestVersionSchema(dbName)
      : getLatestVersionSchema();
    return NextResponse.json(
      wrapRestEnvelope(data, {}),
    );
  });
}
