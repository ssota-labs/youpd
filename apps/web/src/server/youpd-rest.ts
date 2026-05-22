import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  RestAuthError,
  requireYoupdRestToken,
} from '@youpd/api/rest';
import { QuotaExceededAtBudgetError } from '@youpd/api/mcp/quota';
import { YouTubeApiError } from '@youpd/youtube';

/** Wrap handler with Bearer auth + centralized error mapping. */
export async function withYoupdRest(
  request: Request,
  handler: () => Promise<Response>,
): Promise<Response> {
  try {
    requireYoupdRestToken(request);
    return await handler();
  } catch (err) {
    return youpdRestError(err);
  }
}

export function youpdRestError(err: unknown): NextResponse {
  if (err instanceof RestAuthError) {
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
  console.error('[youpd-rest]', err);
  return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
}
