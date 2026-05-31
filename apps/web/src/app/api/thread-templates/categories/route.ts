import { NextResponse } from 'next/server';
import { listThreadTemplateCategories } from '@youpd/api/thread-templates';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { threadTemplatesErrorResponse } from '@/lib/thread-templates/api-errors';

export async function GET() {
  try {
    await requireSessionUserId();
    const categories = await listThreadTemplateCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    return threadTemplatesErrorResponse(error);
  }
}
