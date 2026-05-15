import 'server-only';
import { NextResponse } from 'next/server';
import { ThumbnailDocumentSchema } from '@youpd/types';
import { getThumbnail } from '@youpd/supabase/repositories/thumbnails';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const thumbnailId = url.searchParams.get('thumbnailId');
  if (!thumbnailId) {
    return NextResponse.json({ error: 'thumbnailId required' }, { status: 400 });
  }
  try {
    const row = await getThumbnail(thumbnailId);
    const document = ThumbnailDocumentSchema.parse({
      aspect: row.aspect,
      background: row.background ?? undefined,
      layers: row.layers,
    });
    return NextResponse.json({
      thumbnailId: row.id,
      version: row.version,
      aspect: row.aspect,
      document,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
