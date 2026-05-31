import { NextResponse } from 'next/server';
import {
  IntroSegmentsError,
  IntroTemplatesError,
} from '@youpd/api/intro-templates';

export function introTemplatesErrorResponse(error: unknown) {
  if (error instanceof IntroTemplatesError) {
    const status = error.code === 'NOT_FOUND' ? 404 : 400;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  if (error instanceof IntroSegmentsError) {
    const status =
      error.code === 'NOT_FOUND'
        ? 404
        : error.code === 'TRANSCRIPT_UNAVAILABLE'
          ? 422
          : error.code === 'FORBIDDEN'
            ? 403
            : 400;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  if (error instanceof Error && error.message === 'Unauthorized') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  throw error;
}
