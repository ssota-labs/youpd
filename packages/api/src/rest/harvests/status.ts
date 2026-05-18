import { getHarvestStatus } from '@youpd/supabase/repositories/harvests';
import { HarvestNotFoundError } from './errors';

export type HarvestSummary = {
  id: string;
  keyword: string;
  keyword_idea_page_id: string;
  status: string;
  total_videos: number;
  total_channels: number;
  unpublished_videos: number;
  unpublished_channels: number;
  finalized: boolean;
  notion_keyword_page_id: string | null;
  created_at: string;
  finished_at: string | null;
};

export async function getHarvestSummary(
  harvestId: string,
): Promise<HarvestSummary> {
  const row = await getHarvestStatus(harvestId);
  if (!row) throw new HarvestNotFoundError(harvestId);
  return {
    id: row.id,
    keyword: row.keyword,
    keyword_idea_page_id: row.keywordIdeaPageId,
    status: row.status,
    total_videos: row.totalVideos,
    total_channels: row.totalChannels,
    unpublished_videos: row.unpublishedVideos,
    unpublished_channels: row.unpublishedChannels,
    finalized: row.finalized,
    notion_keyword_page_id: row.notionKeywordPageId,
    created_at: row.createdAt.toISOString(),
    finished_at: row.finishedAt ? row.finishedAt.toISOString() : null,
  };
}
