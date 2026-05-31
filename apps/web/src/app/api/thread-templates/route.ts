import { NextResponse } from 'next/server';
import { listThreadTemplates } from '@youpd/api/thread-templates';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { threadTemplatesErrorResponse } from '@/lib/thread-templates/api-errors';

export async function GET(request: Request) {
  try {
    await requireSessionUserId();
    const { searchParams } = new URL(request.url);
    const result = await listThreadTemplates({
      category: searchParams.get('category') ?? undefined,
      tag: searchParams.get('tag') ?? undefined,
      q: searchParams.get('q') ?? undefined,
      cursor: searchParams.get('cursor') ?? undefined,
      limit: searchParams.get('limit')
        ? Number(searchParams.get('limit'))
        : undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    return threadTemplatesErrorResponse(error);
  }
}
