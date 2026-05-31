import { NextResponse } from 'next/server';
import { CopyTemplatesError } from '@youpd/api/copy-templates';

export function copyTemplatesErrorResponse(error: unknown) {
  if (error instanceof CopyTemplatesError) {
    const status = error.code === 'NOT_FOUND' ? 404 : 400;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  if (error instanceof Error && error.message === 'Unauthorized') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  throw error;
}
