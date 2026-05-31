import { NextResponse } from 'next/server';
import { getIntroTemplateDetail } from '@youpd/api/intro-templates';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { introTemplatesErrorResponse } from '@/lib/intro-templates/api-errors';

type RouteContext = { params: Promise<{ templateId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireSessionUserId();
    const { templateId } = await context.params;
    const detail = await getIntroTemplateDetail(templateId);
    return NextResponse.json(detail);
  } catch (error) {
    return introTemplatesErrorResponse(error);
  }
}
