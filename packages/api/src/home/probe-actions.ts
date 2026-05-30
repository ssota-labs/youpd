import { KeywordProbeSchema, type KeywordProbe } from '@youpd/types';
import {
  createKeywordIdeaRun,
  getUserKeywordProbe,
  insertUserKeywordProbes,
  updateUserKeywordProbe,
} from '@youpd/supabase';
import { runKeywordSearchBatch } from '../youtube/workflows/run-keyword-search-batch';

export async function patchKeywordProbe(
  userId: string,
  probeId: string,
  body: unknown,
): Promise<KeywordProbe | null> {
  const partial = KeywordProbeSchema.partial().parse(body);
  return updateUserKeywordProbe(userId, probeId, {
    probeLabel: partial.probeLabel,
    audience: partial.audience,
    seedTheme: partial.seedTheme,
    problemOrSituation: partial.problemOrSituation,
    goal: partial.goal,
    consumerStage: partial.consumerStage,
    rationale: partial.rationale,
    suggestedKeywords: partial.suggestedKeywords,
    status: partial.status,
  });
}

export async function confirmKeywordProbe(
  userId: string,
  probeId: string,
): Promise<KeywordProbe | null> {
  return updateUserKeywordProbe(userId, probeId, { status: 'confirmed' });
}

export async function dismissKeywordProbe(
  userId: string,
  probeId: string,
): Promise<KeywordProbe | null> {
  return updateUserKeywordProbe(userId, probeId, { status: 'dismissed' });
}

export async function runProbeHarvest(
  userId: string,
  probeId: string,
  regionCode = 'KR',
): Promise<{ probe: KeywordProbe; harvestId: string | null }> {
  const probe = await getUserKeywordProbe(userId, probeId);
  if (!probe) {
    throw new Error('Probe not found');
  }

  const keywords =
    probe.suggestedKeywords.length > 0
      ? probe.suggestedKeywords
      : [probe.seedTheme];

  await updateUserKeywordProbe(userId, probeId, { status: 'running' });

  const batch = await runKeywordSearchBatch({
    keywords,
    regionCode,
    limit: 50,
    order: 'relevance',
    forceRefresh: false,
  });

  const firstSuccess = batch.data.results.find(
    (item) => item.status === 'success' && item.harvestId,
  );
  const harvestId = firstSuccess?.harvestId ?? null;

  const updated = await updateUserKeywordProbe(userId, probeId, {
    status: harvestId ? 'completed' : 'confirmed',
    linkedHarvestId: harvestId,
  });

  return { probe: updated ?? probe, harvestId };
}

export async function createManualKeywordProbe(
  userId: string,
  body: unknown,
): Promise<KeywordProbe> {
  const parsed = KeywordProbeSchema.omit({
    id: true,
    generationRunId: true,
    linkedHarvestId: true,
  }).parse(body);

  const run = await createKeywordIdeaRun({
    userId,
    profileSnapshot: {
      interestTopics: 'manual',
      channelDescription: 'manual probe',
      referenceChannelUrls: [],
      excludedTopics: [],
      preferredRegionCode: 'KR',
      autoRunHarvest: false,
    },
    provider: 'manual',
    status: 'completed',
  });

  const inserted = await insertUserKeywordProbes(userId, run.id, [
    { ...parsed, status: parsed.status ?? 'draft' },
  ]);
  const probe = inserted[0];
  if (!probe) throw new Error('failed to create manual probe');
  return probe;
}
