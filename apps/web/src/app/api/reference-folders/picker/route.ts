import { NextResponse } from 'next/server';
import { listReferenceFoldersPicker } from '@youpd/supabase/repositories/reference-folders';
import { requireSessionUserId } from '@/lib/auth/require-session-user';

export async function GET() {
  const userId = await requireSessionUserId();
  const folders = await listReferenceFoldersPicker(userId);
  return NextResponse.json({ folders });
}
