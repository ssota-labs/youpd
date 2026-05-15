import 'server-only';
import { NextResponse } from 'next/server';
import { listPublicTemplates } from '@youpd/supabase/repositories/templates';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = await listPublicTemplates();
  return NextResponse.json({
    templates: rows.map((t) => ({
      code: t.code,
      title: t.title,
      aspect: t.aspect,
      previewUrl: t.previewUrl,
      tags: t.tags ?? [],
    })),
  });
}
