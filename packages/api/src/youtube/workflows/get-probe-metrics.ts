import type { WorkflowWarning } from '../core/models';
import {
  aggregateProbeMetricsFromScored,
  PROBE_METRICS_MAX_ROWS,
  scoreHarvestRows,
} from '../probes/probe-metrics';
import { createDefaultWorkflowDeps, workflowEnvelope, type WorkflowDeps } from './deps';

export async function getProbeMetrics(
  harvestId: string,
  deps: WorkflowDeps = createDefaultWorkflowDeps(),
) {
  const warnings: WorkflowWarning[] = [];
  const { getKeywordHarvestSession, listKeywordHarvestResults } = await import(
    '@youpd/supabase/repositories/youtube'
  );

  const session = await getKeywordHarvestSession(harvestId);
  if (!session) {
    warnings.push({
      code: 'KEYWORD_HARVEST_NOT_FOUND',
      message: `Keyword harvest session not found: ${harvestId}`,
      target: { harvestId },
    });
    return workflowEnvelope(null, warnings);
  }

  const rows = await listKeywordHarvestResults({
    harvestId,
    regionCode: session.regionCode,
  });

  if (rows.length > PROBE_METRICS_MAX_ROWS) {
    warnings.push({
      code: 'PROBE_METRICS_TRUNCATED',
      message: `Probe metrics computed on first ${PROBE_METRICS_MAX_ROWS} results only.`,
      target: { harvestId, total: rows.length, cap: PROBE_METRICS_MAX_ROWS },
    });
  }

  const slice = rows.slice(0, PROBE_METRICS_MAX_ROWS);
  const now = new Date(deps.clock.nowIso());
  const scored = scoreHarvestRows(slice, now);
  const collectedAt =
    slice[0]?.result.collectedAt ??
    session.completedAt ??
    session.startedAt ??
    now;

  const metrics = aggregateProbeMetricsFromScored({
    harvestId,
    probeId: harvestId,
    keywords: [session.keyword],
    regionCode: session.regionCode,
    collectedAt,
    scored,
    truncated: rows.length > PROBE_METRICS_MAX_ROWS,
  });

  const incomplete = scored.filter(
    (entry) =>
      entry.score.performance.grade === 'Unknown' ||
      entry.score.contribution.grade === 'Unknown',
  ).length;
  if (incomplete > 0) {
    warnings.push({
      code: 'SCORE_DATA_INCOMPLETE',
      message:
        'Some videos are missing channel subscriber or average view data required for full score calculation.',
      target: { count: incomplete },
    });
  }

  return workflowEnvelope(metrics, warnings);
}
