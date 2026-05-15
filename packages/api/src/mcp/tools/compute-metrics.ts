import { z } from 'zod';
import { attachQuotaSession, runWithBudget } from '../quota';

// Pure-function MCP tool — zero YouTube units. Mirrors the Videos DB formulas
// defined in the v1.0.0 schema. The agent passes the snapshot history and
// channel context it already has; we compute the three뷰트랩 metrics.

const DailySnapshotSchema = z.object({
  snapshot_date: z.string(),
  views: z.number().int().nonnegative().nullable(),
  likes: z.number().int().nonnegative().nullable().optional(),
  comments: z.number().int().nonnegative().nullable().optional(),
});

export const ComputeMetricsInputSchema = z
  .object({
    latest_views: z.number().int().nonnegative(),
    channel_avg_views: z.number().nonnegative().nullable(),
    channel_subs: z.number().int().nonnegative().nullable(),
    snapshots: z.array(DailySnapshotSchema).default([]),
  })
  .strict();
export type ComputeMetricsInput = z.infer<typeof ComputeMetricsInputSchema>;

export type ComputeMetricsOutput = {
  contribution: number | null;
  performance: number | null;
  exposure_probability: number | null;
  // Diagnostics so the agent can explain "why low" to the user.
  window_7d_delta: number | null;
  window_30d_delta: number | null;
  snapshots_used: number;
  units_consumed: number;
  quota_session_id?: string;
};

// Sum of (today - earliest within window) across the daily snapshots that
// fall inside the time window. Falls back to delta against the oldest in-
// window snapshot when intermediate days are missing. Cutoff is anchored to
// the start of today so clock-time-of-day never excludes a boundary snapshot.
function deltaWithinWindow(
  snapshots: { snapshot_date: string; views: number | null }[],
  windowDays: number,
  now: Date,
): { delta: number | null; usedCount: number } {
  if (snapshots.length === 0) return { delta: null, usedCount: 0 };
  const todayStart = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const cutoffMs = todayStart - windowDays * 24 * 60 * 60 * 1000;
  const inWindow = snapshots
    .filter((s) => s.views != null && Date.parse(s.snapshot_date) >= cutoffMs)
    .sort((a, b) => Date.parse(a.snapshot_date) - Date.parse(b.snapshot_date));
  if (inWindow.length < 2) return { delta: null, usedCount: inWindow.length };
  const first = inWindow[0]!.views!;
  const last = inWindow[inWindow.length - 1]!.views!;
  return { delta: Math.max(0, last - first), usedCount: inWindow.length };
}

export async function computeMetrics(
  input: ComputeMetricsInput,
): Promise<ComputeMetricsOutput> {
  const { result, sessionId } = await runWithBudget<ComputeMetricsOutput>({
    operation: 'compute-metrics',
    units: 0,
    call: async () => {
      const now = new Date();
      const contribution =
        input.channel_avg_views && input.channel_avg_views > 0
          ? input.latest_views / input.channel_avg_views
          : null;
      const performance =
        input.channel_subs && input.channel_subs > 0
          ? input.latest_views / input.channel_subs
          : null;

      const w7 = deltaWithinWindow(input.snapshots, 7, now);
      const w30 = deltaWithinWindow(input.snapshots, 30, now);

      let exposure: number | null = null;
      if (
        w7.delta != null &&
        w30.delta != null &&
        w30.delta > 0
      ) {
        exposure = w7.delta / 7 / (w30.delta / 30);
      }

      const payload: ComputeMetricsOutput = {
        contribution,
        performance,
        exposure_probability: exposure,
        window_7d_delta: w7.delta,
        window_30d_delta: w30.delta,
        snapshots_used: input.snapshots.length,
        units_consumed: 0,
      };
      return { resultCount: 1, payload };
    },
  });

  return attachQuotaSession(result, sessionId);
}
