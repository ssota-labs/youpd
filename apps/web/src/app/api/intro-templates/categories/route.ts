import { NextResponse } from 'next/server';
import { listIntroTemplateCategories } from '@youpd/api/intro-templates';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { introTemplatesErrorResponse } from '@/lib/intro-templates/api-errors';

export async function GET() {
  try {
    await requireSessionUserId();
    const categories = await listIntroTemplateCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    return introTemplatesErrorResponse(error);
  }
}
