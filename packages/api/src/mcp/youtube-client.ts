import { createYouTubeClient, type YouTubeClient } from '@youpd/youtube';

let cached: YouTubeClient | null = null;

// Lazy singleton — process.env is read once on first use so test environments
// can mutate it before the first tool call.
export function getYouTubeClient(): YouTubeClient {
  if (cached) return cached;
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY is not set');
  }
  cached = createYouTubeClient({ apiKey });
  return cached;
}

// Test-only — clears the cache so a new env var can take effect.
export function resetYouTubeClientForTests(): void {
  cached = null;
}
