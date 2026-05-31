import { NextResponse } from 'next/server';
import { generateIntroForTemplate } from '@youpd/api/intro-templates';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { introTemplatesErrorResponse } from '@/lib/intro-templates/api-errors';

type RouteContext = { params: Promise<{ templateId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const userId = await requireSessionUserId();
    const { templateId } = await context.params;
    const body = await request.json();
    const result = await generateIntroForTemplate(templateId, userId, body);
    return NextResponse.json(result);
  } catch (error) {
    return introTemplatesErrorResponse(error);
  }
}
