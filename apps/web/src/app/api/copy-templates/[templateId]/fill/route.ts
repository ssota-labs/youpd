import { NextResponse } from 'next/server';
import { fillCopyTemplate } from '@youpd/api/copy-templates';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { copyTemplatesErrorResponse } from '@/lib/copy-templates/api-errors';

type RouteContext = { params: Promise<{ templateId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireSessionUserId();
    const { templateId } = await context.params;
    const body = await request.json();
    const result = await fillCopyTemplate(templateId, body);
    return NextResponse.json(result);
  } catch (error) {
    return copyTemplatesErrorResponse(error);
  }
}
