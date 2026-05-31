import { NextResponse } from 'next/server';
import { generateThreadForTemplate } from '@youpd/api/thread-templates';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { threadTemplatesErrorResponse } from '@/lib/thread-templates/api-errors';

type RouteContext = { params: Promise<{ templateId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const userId = await requireSessionUserId();
    const { templateId } = await context.params;
    const body = await request.json();
    const result = await generateThreadForTemplate(templateId, userId, body);
    return NextResponse.json(result);
  } catch (error) {
    return threadTemplatesErrorResponse(error);
  }
}
