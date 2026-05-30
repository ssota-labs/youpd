import { NextResponse } from 'next/server';
import { ReferenceFoldersError } from '@youpd/api/reference-folders';

export function referenceFoldersErrorResponse(error: unknown) {
  if (error instanceof ReferenceFoldersError) {
    const status =
      error.code === 'NOT_FOUND'
        ? 404
        : error.code === 'FORBIDDEN'
          ? 403
          : error.code === 'SUB_GOOD_PLUS'
            ? 409
            : error.code === 'DUPLICATE'
              ? 409
              : 400;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  throw error;
}
