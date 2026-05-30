import { NextResponse } from 'next/server';
import { dismissKeywordProbe, patchKeywordProbe } from '@youpd/api/home';
import { requireSessionUserId } from '@/lib/auth/require-session-user';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const userId = await requireSessionUserId();
    const probe = await patchKeywordProbe(userId, id, body);
    if (!probe) {
      return NextResponse.json({ error: 'Probe not found' }, { status: 404 });
    }
    return NextResponse.json({ probe });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const userId = await requireSessionUserId();
    const probe = await dismissKeywordProbe(userId, id);
    if (!probe) {
      return NextResponse.json({ error: 'Probe not found' }, { status: 404 });
    }
    return NextResponse.json({ probe });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
