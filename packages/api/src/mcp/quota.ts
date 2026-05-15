import {
  currentUsageDay,
  getRemainingUnits,
  incrementDailyUsage,
  recordSession,
  type RecordSessionInput,
} from '@youpd/supabase/repositories/quota';

// Thrown when the local budget gate refuses a call before it reaches YouTube.
// Distinct from YouTube's own QuotaExceededError (which fires after the API
// has already counted the call upstream).
export class QuotaExceededAtBudgetError extends Error {
  override readonly name = 'QuotaExceededAtBudgetError';
  readonly remaining: number;
  readonly required: number;
  readonly limit: number;
  readonly usageDay: string;
  /** Populated after `recordSession` documents the refusal (REST job correlation). */
  sessionId?: string;
  constructor(opts: {
    remaining: number;
    required: number;
    limit: number;
    usageDay: string;
  }) {
    super(
      `Local YouTube quota budget exhausted for ${opts.usageDay}: requested ${opts.required}u, ${opts.remaining}u of ${opts.limit}u remaining`,
    );
    this.remaining = opts.remaining;
    this.required = opts.required;
    this.limit = opts.limit;
    this.usageDay = opts.usageDay;
  }
}

export function getDailyLimit(): number {
  const raw = process.env.QUOTA_DAILY_LIMIT;
  if (!raw) return 9_000;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 9_000;
  return Math.floor(n);
}

// Refuse the call if the day's remaining budget is below `units`. Caller must
// invoke before talking to YouTube; the increment happens via `commitUnits`
// once the call is in flight (so a failed precheck never bumps the counter).
export async function assertBudget(units: number): Promise<void> {
  if (units <= 0) return;
  const limit = getDailyLimit();
  const day = currentUsageDay();
  const remaining = await getRemainingUnits(limit, day);
  if (remaining < units) {
    throw new QuotaExceededAtBudgetError({
      remaining,
      required: units,
      limit,
      usageDay: day,
    });
  }
}

export async function commitUnits(units: number): Promise<void> {
  if (units <= 0) return;
  await incrementDailyUsage(units);
}

/** Optional audit id from `search_sessions`; surfaced to REST as `meta.jobId`. */
export function attachQuotaSession<T>(
  result: T,
  sessionId: string | null,
): T & { quota_session_id?: string } {
  if (!sessionId) return result as T & { quota_session_id?: string };
  return { ...result, quota_session_id: sessionId };
}

export type RunWithBudgetInput<T> = {
  operation: string;
  units: number;
  keyword?: string | null;
  videoIds?: string[] | null;
  channelId?: string | null;
  call: () => Promise<{ resultCount: number; payload: T }>;
};

// Run an MCP tool body under the budget gate. Records a search_session row
// for every attempt (success | error | quota_exceeded) so the agent can
// surface usage in the Notion Search Sessions DB.
export async function runWithBudget<T>(
  input: RunWithBudgetInput<T>,
): Promise<{ result: T; unitsConsumed: number; sessionId: string | null }> {
  try {
    await assertBudget(input.units);
  } catch (err) {
    if (err instanceof QuotaExceededAtBudgetError) {
      const row = await recordSession({
        operation: input.operation,
        keyword: input.keyword ?? null,
        videoIds: input.videoIds ?? null,
        channelId: input.channelId ?? null,
        resultCount: 0,
        unitsConsumed: 0,
        status: 'quota_exceeded',
        errorReason: err.message,
      });
      err.sessionId = row.id;
    }
    throw err;
  }

  try {
    const { resultCount, payload } = await input.call();
    await commitUnits(input.units);
    const row = await recordSession({
      operation: input.operation,
      keyword: input.keyword ?? null,
      videoIds: input.videoIds ?? null,
      channelId: input.channelId ?? null,
      resultCount,
      unitsConsumed: input.units,
      status: 'success',
    });
    return {
      result: payload,
      unitsConsumed: input.units,
      sessionId: row.id,
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    const session: RecordSessionInput = {
      operation: input.operation,
      keyword: input.keyword ?? null,
      videoIds: input.videoIds ?? null,
      channelId: input.channelId ?? null,
      resultCount: 0,
      unitsConsumed: 0,
      status: 'error',
      errorReason: reason,
    };
    const sessionRow = await recordSession(session);
    if (err instanceof Error) {
      Object.assign(err, { quotaSessionId: sessionRow.id });
    }
    throw err;
  }
}
