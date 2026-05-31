import { NextResponse } from 'next/server';
import { listCopyTemplates } from '@youpd/api/copy-templates';
import { TitleHookTypeSchema } from '@youpd/types';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { copyTemplatesErrorResponse } from '@/lib/copy-templates/api-errors';

export async function GET(request: Request) {
  try {
    await requireSessionUserId();
    const { searchParams } = new URL(request.url);
    const hookRaw = searchParams.get('hookType');
    const hookType =
      hookRaw && TitleHookTypeSchema.safeParse(hookRaw).success
        ? TitleHookTypeSchema.parse(hookRaw)
        : undefined;

    const result = await listCopyTemplates({
      category: searchParams.get('category') ?? undefined,
      tag: searchParams.get('tag') ?? undefined,
      hookType,
      q: searchParams.get('q') ?? undefined,
      cursor: searchParams.get('cursor') ?? undefined,
      limit: searchParams.get('limit')
        ? Number(searchParams.get('limit'))
        : undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    return copyTemplatesErrorResponse(error);
  }
}
