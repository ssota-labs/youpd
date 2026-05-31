import { NextResponse } from 'next/server';
import { SocialPostsError } from '@youpd/api/social';

export function socialPostsErrorResponse(error: unknown) {
  if (error instanceof SocialPostsError) {
    const status =
      error.code === 'NOT_FOUND'
        ? 404
        : error.code === 'FORBIDDEN'
          ? 403
          : error.code === 'NOT_CONFIGURED'
            ? 409
            : error.code === 'DUPLICATE'
              ? 409
              : error.code === 'UNSUPPORTED_URL' || error.code === 'FETCH_FAILED'
                ? 422
                : 400;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  throw error;
}
