import {
  QuotaExceededError,
  RateLimitError,
  createYouTubeClient,
  type YouTubeClient,
} from '@youpd/youtube';
import { currentUsageDay } from '@youpd/supabase/repositories/quota';
import {
  listActiveKeysWithUsage,
  markKeyExhausted,
  seedKeyFromEnv,
  type YoutubeApiKeyWithUsage,
} from '@youpd/supabase/repositories/youtube-keys';

// `currentUsageDay` is re-exported from the youtube-keys module so callers
// don't double-import. The legacy quota module retains its own copy.
export { currentUsageDay };

export type PoolKey = {
  id: string;
  key: string;
  label: string;
  unitsConsumedToday: number;
};

export type ResolvedKey =
  | { source: 'pool'; key: string; keyId: string; label: string }
  | { source: 'env'; key: string; keyId: null; label: 'env-fallback' };

let seedAttempted = false;

/**
 * Best-effort seed: if the pool is empty and `YOUTUBE_API_KEY` is set, insert
 * it under the `seeded-from-env` label. Runs at most once per process. DB
 * failures are swallowed so a transient outage never blocks a request.
 */
async function maybeSeed(): Promise<void> {
  if (seedAttempted) return;
  seedAttempted = true;
  const envKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!envKey) return;
  try {
    await seedKeyFromEnv(envKey);
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(
        '[youtube-key-pool] seed-from-env skipped:',
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}

/**
 * Pick the active key with the most remaining headroom today. Ties go to the
 * key with the oldest last-used timestamp (set by listActiveKeysWithUsage's
 * ORDER BY). Returns null when the pool is empty so callers can decide
 * whether to fall back to the env var.
 */
export async function selectKey(today = currentUsageDay()): Promise<
  YoutubeApiKeyWithUsage | null
> {
  await maybeSeed();
  const keys = await listActiveKeysWithUsage(today);
  if (keys.length === 0) return null;
  // listActiveKeysWithUsage is already ordered by last_used_at ASC; prefer
  // the key with the smallest unitsConsumedToday among those, breaking ties
  // by the original ordering.
  let pick = keys[0]!;
  for (const k of keys) {
    if (k.unitsConsumedToday < pick.unitsConsumedToday) pick = k;
  }
  return pick;
}

/**
 * Resolve a usable API key. Tries the DB pool first; if the pool is empty
 * AND `YOUTUBE_API_KEY` is set, falls back to the env value so dev/test envs
 * without DB access still work. Tools created from this resolution should
 * record per-key usage only when `source === 'pool'`.
 */
export async function resolveKey(today = currentUsageDay()): Promise<ResolvedKey> {
  const pooled = await selectKey(today);
  if (pooled) {
    return {
      source: 'pool',
      key: pooled.key,
      keyId: pooled.id,
      label: pooled.label,
    };
  }
  const envKey = process.env.YOUTUBE_API_KEY?.trim();
  if (envKey) {
    return { source: 'env', key: envKey, keyId: null, label: 'env-fallback' };
  }
  throw new Error(
    'No YouTube API key available: pool empty and YOUTUBE_API_KEY is not set',
  );
}

export type WithKeyContext = {
  apiKey: string;
  keyId: string | null;
  label: string;
};

const MAX_ROTATION_ATTEMPTS = 20;
// Backoff schedule for transient RateLimitError. Same key is retried — rate
// limits are short-window (per-second/minute), so waiting + retrying with the
// same key beats wasting another key's headroom. Total wait < 11s.
const RATE_LIMIT_BACKOFF_MS = [1_000, 3_000, 7_000] as const;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

let testSleepOverride: ((ms: number) => Promise<void>) | null = null;

/** Test-only — replace the backoff sleep with a synchronous resolve. */
export function setRateLimitSleepForTests(
  override: ((ms: number) => Promise<void>) | null,
): void {
  testSleepOverride = override;
}

async function rateLimitBackoffSleep(ms: number): Promise<void> {
  if (testSleepOverride) return testSleepOverride(ms);
  return sleep(ms);
}

/**
 * Execute `fn` with a resolved API key. Behavior:
 * - `QuotaExceededError` — mark the current pool key exhausted for the day
 *   and retry with the next available key. After every key is exhausted,
 *   rethrow the last quota error.
 * - `RateLimitError` — sleep with exponential backoff (1s, 3s, 7s) and retry
 *   with the *same* key. Rate limits are transient per-second/minute caps;
 *   rotating wouldn't help if the project-wide cap is what we hit.
 * - Other errors — rethrow as-is.
 */
export async function withYouTubeKey<T>(
  fn: (ctx: WithKeyContext) => Promise<T>,
): Promise<T> {
  let lastQuotaError: QuotaExceededError | null = null;
  for (let attempt = 0; attempt < MAX_ROTATION_ATTEMPTS; attempt += 1) {
    const resolved = await resolveKey();
    let backoffIndex = 0;
    while (true) {
      try {
        return await fn({
          apiKey: resolved.key,
          keyId: resolved.keyId,
          label: resolved.label,
        });
      } catch (err) {
        if (err instanceof RateLimitError) {
          if (backoffIndex >= RATE_LIMIT_BACKOFF_MS.length) throw err;
          await rateLimitBackoffSleep(RATE_LIMIT_BACKOFF_MS[backoffIndex]!);
          backoffIndex += 1;
          continue;
        }
        if (err instanceof QuotaExceededError) {
          lastQuotaError = err;
          if (resolved.source === 'pool') {
            try {
              await markKeyExhausted(resolved.keyId, 'quotaExceeded');
            } catch {
              // ignore — next iteration will reselect from fresh state
            }
            break; // rotate to next key
          }
          // env fallback exhausted: no other keys to try
          throw err;
        }
        throw err;
      }
    }
  }
  throw (
    lastQuotaError ??
    new Error('YouTube key rotation exhausted with no recorded quota error')
  );
}

/**
 * Tool entry-point convenience: when `injectedClient` is given (tests), runs
 * the body once with that client and no keyId. Otherwise resolves a key from
 * the pool, builds a fresh YouTube client around it, runs the body, and
 * rotates on QuotaExceededError. The `keyId` argument is null in the
 * env-fallback path so callers can skip per-key usage accounting.
 */
export async function executeWithKeyRotation<T>(
  injectedClient: YouTubeClient | null | undefined,
  body: (client: YouTubeClient, keyId: string | null) => Promise<T>,
): Promise<T> {
  if (injectedClient) return body(injectedClient, null);
  return withYouTubeKey(async ({ apiKey, keyId }) => {
    const client = createYouTubeClient({ apiKey });
    return body(client, keyId);
  });
}

/** Test-only — clears the in-process seed-attempted flag. */
export function resetYouTubeKeyPoolForTests(): void {
  seedAttempted = false;
}
