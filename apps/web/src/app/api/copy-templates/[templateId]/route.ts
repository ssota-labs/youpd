import { NextResponse } from 'next/server';
import { getCopyTemplateDetail } from '@youpd/api/copy-templates';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { copyTemplatesErrorResponse } from '@/lib/copy-templates/api-errors';

type RouteContext = { params: Promise<{ templateId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireSessionUserId();
    const { templateId } = await context.params;
    const detail = await getCopyTemplateDetail(templateId);
    return NextResponse.json(detail);
  } catch (error) {
    return copyTemplatesErrorResponse(error);
  }
}
