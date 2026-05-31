import { NextResponse } from 'next/server';
import { listIntroTemplates } from '@youpd/api/intro-templates';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { introTemplatesErrorResponse } from '@/lib/intro-templates/api-errors';

export async function GET(request: Request) {
  try {
    await requireSessionUserId();
    const { searchParams } = new URL(request.url);
    const result = await listIntroTemplates({
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
    return introTemplatesErrorResponse(error);
  }
}
