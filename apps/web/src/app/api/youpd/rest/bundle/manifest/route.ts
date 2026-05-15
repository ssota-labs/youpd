import 'server-only';

import { NextResponse } from 'next/server';
import { wrapRestEnvelope } from '@youpd/api/rest';
import { getBundleManifest } from '@youpd/api/mcp/version';
import { withYoupdRest } from '@/server/youpd-rest';

export async function GET(request: Request): Promise<Response> {
  return withYoupdRest(request, async () => {
    const data = getBundleManifest();
    return NextResponse.json(
      wrapRestEnvelope(data, {}),
    );
  });
}
