export type PaceOptions = {
  allowedRequests: number;
  intervalMs: number;
};

/**
 * Mirrors `@notionhq/workers` in-process pacer when `initPacerState` was never run
 * (typical under `ntn workers exec --local`).
 */
export function createLocalTokenBucket(opts: PaceOptions): () => Promise<void> {
  let lastScheduledAtMs = 0;
  return async (): Promise<void> => {
    const paceMs = Math.ceil(opts.intervalMs / opts.allowedRequests);
    const now = Date.now();
    const scheduledAtMs = Math.max(lastScheduledAtMs + paceMs, now);
    const delayMs = scheduledAtMs - now;
    lastScheduledAtMs = scheduledAtMs;
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
  };
}
