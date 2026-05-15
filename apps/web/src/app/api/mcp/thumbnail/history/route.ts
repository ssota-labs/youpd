import 'server-only';
import { NextResponse } from 'next/server';
import { thumbnailHistoryState } from '@youpd/api/mcp/tools';
import { mapThumbnailError } from '../_error';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const thumbnailId = url.searchParams.get('thumbnailId');
  if (!thumbnailId) {
    return NextResponse.json(
      { error: 'thumbnailId required' },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await thumbnailHistoryState({ thumbnailId }));
  } catch (err) {
    return mapThumbnailError(err);
  }
}
