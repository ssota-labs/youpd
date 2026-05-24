import {
  listKeywordHarvestResults,
  listKeywordHarvestSessionsByDate,
} from '@youpd/supabase/repositories/youtube';
import type { ListKeywordHarvestsInput } from './schemas';
import { createDefaultWorkflowDeps, workflowEnvelope, type WorkflowDeps } from './deps';

export async function listKeywordHarvestsByDate(
  input: ListKeywordHarvestsInput,
  deps: WorkflowDeps = createDefaultWorkflowDeps(),
) {
  const harvests = await listKeywordHarvestSessionsByDate({
    date: input.date,
    regionCode: input.regionCode,
  });

  return workflowEnvelope({
    date: input.date,
    regionCode: input.regionCode,
    harvests,
  });
}

export async function getKeywordHarvestResults(
  input: {
    harvestId: string;
    regionCode: string;
    hotDate?: string;
  },
  deps: WorkflowDeps = createDefaultWorkflowDeps(),
) {
  const hotDate = input.hotDate ?? deps.clock.todayYmd();
  const results = await listKeywordHarvestResults({
    harvestId: input.harvestId,
    hotDate,
    regionCode: input.regionCode,
  });

  return workflowEnvelope({
    harvestId: input.harvestId,
    hotDate,
    regionCode: input.regionCode,
    results,
  });
}
