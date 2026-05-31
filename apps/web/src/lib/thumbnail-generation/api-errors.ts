import { NextResponse } from 'next/server';
import { ThumbnailGenerationError } from '@youpd/api/thumbnail-generation';

export function thumbnailGenerationErrorResponse(error: unknown) {
  if (error instanceof ThumbnailGenerationError) {
    const status =
      error.code === 'NOT_FOUND'
        ? 404
        : error.code === 'FORBIDDEN'
          ? 403
          : error.code === 'PROVIDER_NOT_CONFIGURED'
            ? 409
            : 400;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  console.error(error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
