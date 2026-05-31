import { NextResponse } from 'next/server';
import { listCopyTemplateCategories } from '@youpd/api/copy-templates';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { copyTemplatesErrorResponse } from '@/lib/copy-templates/api-errors';

export async function GET() {
  try {
    await requireSessionUserId();
    const categories = await listCopyTemplateCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    return copyTemplatesErrorResponse(error);
  }
}
