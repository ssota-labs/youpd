import { NextResponse } from 'next/server';
import { listThreadTemplateTags } from '@youpd/api/thread-templates';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { threadTemplatesErrorResponse } from '@/lib/thread-templates/api-errors';

export async function GET() {
  try {
    await requireSessionUserId();
    const tags = await listThreadTemplateTags();
    return NextResponse.json({ tags });
  } catch (error) {
    return threadTemplatesErrorResponse(error);
  }
}
