import {
  HOT_VIDEO_SOURCE_KEYWORD_PROMOTED,
  queryPromotableKeywordResults,
  upsertHotVideos,
} from '@youpd/supabase/repositories/youtube';
import type { PromoteKeywordResultsInput } from './schemas';
import { createDefaultWorkflowDeps, workflowEnvelope, type WorkflowDeps } from './deps';

function subtractDays(ymd: string, days: number): string {
  const date = new Date(`${ymd}T12:00:00+09:00`);
  date.setDate(date.getDate() - days);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export async function promoteKeywordResultsToHotVideos(
  input: PromoteKeywordResultsInput,
  deps: WorkflowDeps = createDefaultWorkflowDeps(),
) {
  const hotDate = input.hotDate ?? deps.clock.todayYmd();
  const sourceCollectedDate =
    input.sourceCollectedDate ?? subtractDays(hotDate, 1);

  const candidates = await queryPromotableKeywordResults({
    collectedDate: sourceCollectedDate,
    regionCode: input.regionCode,
  });

  if (candidates.length > 0) {
    await upsertHotVideos(
      candidates.map((candidate, index) => ({
        hotDate,
        regionCode: candidate.regionCode,
        categoryId: candidate.categoryId,
        videoId: candidate.videoId,
        rank: index + 1,
        source: HOT_VIDEO_SOURCE_KEYWORD_PROMOTED,
      })),
    );
  }

  return workflowEnvelope({
    hotDate,
    sourceCollectedDate,
    regionCode: input.regionCode,
    candidateCount: candidates.length,
    promotedCount: candidates.length,
    source: HOT_VIDEO_SOURCE_KEYWORD_PROMOTED,
  });
}
