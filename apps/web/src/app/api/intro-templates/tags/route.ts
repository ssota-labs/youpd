import { NextResponse } from 'next/server';
import { listIntroTemplateTags } from '@youpd/api/intro-templates';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { introTemplatesErrorResponse } from '@/lib/intro-templates/api-errors';

export async function GET() {
  try {
    await requireSessionUserId();
    const tags = await listIntroTemplateTags();
    return NextResponse.json({ tags });
  } catch (error) {
    return introTemplatesErrorResponse(error);
  }
}
