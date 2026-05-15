import 'server-only';
import { NextResponse } from 'next/server';
import {
  ThumbnailUndoInputSchema,
  thumbnailUndo,
} from '@youpd/api/mcp/tools';
import { mapThumbnailError } from '../_error';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = ThumbnailUndoInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.message },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await thumbnailUndo(parsed.data));
  } catch (err) {
    return mapThumbnailError(err);
  }
}
