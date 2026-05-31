import { NextResponse } from 'next/server';
import { getThreadTemplateDetail } from '@youpd/api/thread-templates';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { threadTemplatesErrorResponse } from '@/lib/thread-templates/api-errors';

type RouteContext = { params: Promise<{ templateId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireSessionUserId();
    const { templateId } = await context.params;
    const detail = await getThreadTemplateDetail(templateId);
    return NextResponse.json(detail);
  } catch (error) {
    return threadTemplatesErrorResponse(error);
  }
}
