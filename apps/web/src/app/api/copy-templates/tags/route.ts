import { NextResponse } from 'next/server';
import { listCopyTemplateTags } from '@youpd/api/copy-templates';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { copyTemplatesErrorResponse } from '@/lib/copy-templates/api-errors';

export async function GET() {
  try {
    await requireSessionUserId();
    const tags = await listCopyTemplateTags();
    return NextResponse.json({ tags });
  } catch (error) {
    return copyTemplatesErrorResponse(error);
  }
}
