import { z } from 'zod';
import {
  UNIT_COST,
  videosList,
  type YouTubeClient,
} from '@youpd/youtube';
import { getYouTubeClient } from '../youtube-client';
import { runWithBudget } from '../quota';

export const SnapshotNowInputSchema = z
  .object({
    video_ids: z.array(z.string().min(1).max(50)).min(1).max(500),
  })
  .strict();
export type SnapshotNowInput = z.infer<typeof SnapshotNowInputSchema>;

export type DailySnapshot = {
  video_id: string;
  snapshot_date: string; // YYYY-MM-DD, PT calendar — matches YouTube quota day
  views: number | null;
  likes: number | null;
  comments: number | null;
};

export type SnapshotNowOutput = {
  snapshots: DailySnapshot[];
  missing_video_ids: string[];
  batches: number;
  units_consumed: number;
};

const PT_TZ = 'America/Los_Angeles';

function ptDate(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: PT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(now);
}

function toNum(v: string | undefined): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// videos.list batched 50 at a time, requesting statistics only. Each batch is
// 1u. Returns one snapshot row per video that YouTube actually returned;
// missing/private videos are reported separately so the agent can drop them
// from its tracking list.
export async function snapshotNow(
  input: SnapshotNowInput,
  client: YouTubeClient = getYouTubeClient(),
): Promise<SnapshotNowOutput> {
  const uniqueIds = Array.from(new Set(input.video_ids));
  const expectedBatches = Math.ceil(uniqueIds.length / 50);
  const upperBoundUnits = expectedBatches * UNIT_COST.videos_list;

  const { result } = await runWithBudget<SnapshotNowOutput>({
    operation: 'daily-snapshot',
    units: upperBoundUnits,
    videoIds: uniqueIds,
    call: async () => {
      const res = await videosList(client, {
        ids: uniqueIds,
        parts: ['statistics'],
      });
      const today = ptDate();
      const seen = new Set<string>();
      const snapshots: DailySnapshot[] = res.items.map((raw) => {
        seen.add(raw.id);
        return {
          video_id: raw.id,
          snapshot_date: today,
          views: toNum(raw.statistics?.viewCount),
          likes: toNum(raw.statistics?.likeCount),
          comments: toNum(raw.statistics?.commentCount),
        };
      });
      const missing = uniqueIds.filter((id) => !seen.has(id));

      const payload: SnapshotNowOutput = {
        snapshots,
        missing_video_ids: missing,
        batches: res.batches,
        units_consumed: res.batches * UNIT_COST.videos_list,
      };
      return { resultCount: snapshots.length, payload };
    },
  });

  return result;
}
