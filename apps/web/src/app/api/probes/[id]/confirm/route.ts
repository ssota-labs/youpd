import { NextResponse } from 'next/server';
import { confirmKeywordProbe } from '@youpd/api/home';
import { requireSessionUserId } from '@/lib/auth/require-session-user';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const userId = await requireSessionUserId();
    const probe = await confirmKeywordProbe(userId, id);
    if (!probe) {
      return NextResponse.json({ error: 'Probe not found' }, { status: 404 });
    }
    return NextResponse.json({ probe });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
