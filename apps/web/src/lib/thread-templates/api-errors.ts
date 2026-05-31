import { NextResponse } from 'next/server';
import {
  ThreadStructureEvidenceError,
  ThreadTemplatesError,
} from '@youpd/api/thread-templates';

export function threadTemplatesErrorResponse(error: unknown) {
  if (error instanceof ThreadTemplatesError) {
    const status = error.code === 'NOT_FOUND' ? 404 : 400;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  if (error instanceof ThreadStructureEvidenceError) {
    const status =
      error.code === 'NOT_FOUND'
        ? 404
        : error.code === 'FORBIDDEN'
          ? 403
          : error.code === 'LLM_NOT_CONFIGURED'
            ? 422
            : 400;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  if (error instanceof Error && error.message === 'Unauthorized') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  throw error;
}
