import { NextResponse } from 'next/server';
import { runProbeHarvest } from '@youpd/api/home';
import { requireSessionUserId } from '@/lib/auth/require-session-user';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let regionCode = 'KR';
  try {
    const body = (await request.json()) as { regionCode?: string };
    if (body.regionCode?.length === 2) regionCode = body.regionCode;
  } catch {
    // empty body is fine
  }

  try {
    const userId = await requireSessionUserId();
    const result = await runProbeHarvest(userId, id, regionCode);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Run failed';
    if (message === 'Probe not found') {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
