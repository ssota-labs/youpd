import 'server-only';
import { NextResponse } from 'next/server';
import { uploadThumbnailAsset } from '@youpd/supabase/storage/thumbnail-assets';

export const dynamic = 'force-dynamic';

// Iframe-side image asset upload. Accepts multipart/form-data with `orgId`
// and `file` fields. Validates type/size at the storage layer and returns
// a stable public URL ready to drop into an image layer.
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: 'invalid_form' },
      { status: 400 },
    );
  }
  const orgId = form.get('orgId');
  const file = form.get('file');
  if (typeof orgId !== 'string' || !orgId) {
    return NextResponse.json({ error: 'orgId required' }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file required' }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const out = await uploadThumbnailAsset({
      orgId,
      filename: file.name,
      bytes: buf,
      contentType: file.type || 'application/octet-stream',
    });
    return NextResponse.json(out);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
