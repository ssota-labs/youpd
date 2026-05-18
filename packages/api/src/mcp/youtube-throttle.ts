// Small inter-page delay between paginated YouTube calls. Even with the key
// pool rotating on quota errors, a single keyword search that fetches 6 pages
// back-to-back can trip YouTube's per-second/minute rate limit on the same
// API project. Sleeping ~150ms between pages keeps the long-tail safe while
// barely affecting latency.
//
// Env override: YOUPD_INTER_PAGE_DELAY_MS (non-negative integer). Set to "0"
// to disable.
const DEFAULT_INTER_PAGE_DELAY_MS = 150;

let testOverride: ((ms: number) => Promise<void>) | null = null;

function readDelayMs(): number {
  const raw = process.env.YOUPD_INTER_PAGE_DELAY_MS;
  if (raw == null) return DEFAULT_INTER_PAGE_DELAY_MS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_INTER_PAGE_DELAY_MS;
  return Math.floor(n);
}

/**
 * Sleep the configured inter-page delay. Call once *between* paginated
 * YouTube calls (i.e. after deciding to fetch the next page). Resolves
 * immediately when the delay is 0 or when a test override is registered.
 */
export async function waitBetweenYouTubePages(): Promise<void> {
  const ms = readDelayMs();
  if (ms <= 0) return;
  if (testOverride) return testOverride(ms);
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Test-only — replace the delay with a synchronous resolve. */
export function setInterPageDelayForTests(
  override: ((ms: number) => Promise<void>) | null,
): void {
  testOverride = override;
}
