import {
  createYouTubeClient,
  QuotaExceededError,
  type YouTubeClient,
} from '@youpd/youtube';
import {
  getActiveYouTubeApiKey,
  markYouTubeApiKeyQuotaExhausted,
  markYouTubeApiKeyUsed,
} from '@youpd/supabase/repositories/youtubeApiKeys';

let cached: YouTubeClient | null = null;

// Lazy singleton. Each request picks the least-recently-used active key from
// Supabase so key rotation works without coupling callers to secret storage.
export async function getYouTubeClient(): Promise<YouTubeClient> {
  if (cached) return cached;
  cached = {
    request: async (opts) => {
      let lastQuotaError: unknown;

      for (let attempt = 0; attempt < 10; attempt += 1) {
        const key = await getActiveYouTubeApiKey();
        if (!key) break;

        try {
          const result = await createYouTubeClient({
            apiKey: key.keyValue,
          }).request(opts);
          await markYouTubeApiKeyUsed(key.id);
          return result;
        } catch (error) {
          if (!(error instanceof QuotaExceededError)) throw error;
          lastQuotaError = error;
          await markYouTubeApiKeyQuotaExhausted(key.id);
        }
      }

      if (lastQuotaError) throw lastQuotaError;
      throw new Error(
        'No active YouTube API keys found. Run `pnpm youtube:keys:sync` after filling apps/web/.env.youtube.',
      );
    },
  };
  return cached;
}

// Test-only — clears the cache so a new env var can take effect.
export function resetYouTubeClientForTests(): void {
  cached = null;
}
