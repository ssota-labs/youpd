import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { QuotaExceededAtBudgetError } from '@youpd/api/mcp/quota';
import { YouTubeApiError } from '@youpd/youtube';
import { HttpAuthError } from './http-error';

export function youpdRestError(err: unknown): NextResponse {
  if (err instanceof HttpAuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof QuotaExceededAtBudgetError) {
    return NextResponse.json(
      {
        error: err.message,
        quota: {
          remaining: err.remaining,
          required: err.required,
          limit: err.limit,
          usageDay: err.usageDay,
          sessionId: err.sessionId,
        },
      },
      { status: 429 },
    );
  }
  if (err instanceof z.ZodError) {
    return NextResponse.json(
      { error: err.message, issues: err.issues },
      { status: 400 },
    );
  }
  if (err instanceof YouTubeApiError) {
    return NextResponse.json(
      { error: err.message, reason: err.reason },
      { status: 502 },
    );
  }
  console.error('[youpd-cron]', err);
  return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
}
