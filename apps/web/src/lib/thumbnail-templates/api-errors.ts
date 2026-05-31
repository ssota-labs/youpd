import { NextResponse } from 'next/server';
import { ThumbnailTemplatesError } from '@youpd/api/thumbnail-templates';

export function thumbnailTemplatesErrorResponse(error: unknown) {
  if (error instanceof ThumbnailTemplatesError) {
    const status = error.code === 'NOT_FOUND' ? 404 : 400;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  if (error instanceof Error && error.message === 'Unauthorized') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  throw error;
}
