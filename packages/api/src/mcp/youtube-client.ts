import { createYouTubeClient, type YouTubeClient } from '@youpd/youtube';

let cachedDefault: YouTubeClient | null = null;
let cachedKey: string | null = null;

/**
 * Resolve a YouTube client.
 *
 * - When `apiKey` is passed (key-pool rotation path), returns a fresh client
 *   bound to that key — no caching, because each invocation may pick a
 *   different pool entry.
 * - When `apiKey` is omitted (test / legacy / env-fallback path), returns a
 *   process-cached singleton built from `process.env.YOUTUBE_API_KEY`. The
 *   cache is keyed on the env value so test resets and mid-run env changes
 *   take effect.
 *
 * Production code should prefer the explicit-key path via
 * `executeWithKeyRotation` so per-key quota accounting works.
 */
export function getYouTubeClient(apiKey?: string): YouTubeClient {
  if (apiKey) {
    return createYouTubeClient({ apiKey });
  }
  const envKey = process.env.YOUTUBE_API_KEY;
  if (!envKey) {
    throw new Error('YOUTUBE_API_KEY is not set');
  }
  if (cachedDefault && cachedKey === envKey) return cachedDefault;
  cachedDefault = createYouTubeClient({ apiKey: envKey });
  cachedKey = envKey;
  return cachedDefault;
}

// Test-only — clears the cache so a new env var can take effect.
export function resetYouTubeClientForTests(): void {
  cachedDefault = null;
  cachedKey = null;
}
