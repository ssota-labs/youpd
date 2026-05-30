import type { WorkflowWarning } from '../core/models';
import {
  filterGoodPlusCandidates,
  scoreHarvestRows,
  sortScoredByRankScore,
  toKeywordHotCandidate,
} from '../probes/probe-metrics';
import type { ScoreGrade } from '../../query/scoring';
import { z } from 'zod';
import { createDefaultWorkflowDeps, workflowEnvelope, type WorkflowDeps } from './deps';

export const ListProbeCandidatesInputSchema = z
  .object({
    harvestId: z.string().uuid(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(24),
    goodPlusOnly: z.boolean().default(true),
    performanceGrades: z
      .array(
        z.enum(['Unknown', 'Worst', 'Bad', 'Normal', 'Good', 'Great']),
      )
      .optional(),
    contributionGrades: z
      .array(
        z.enum(['Unknown', 'Worst', 'Bad', 'Normal', 'Good', 'Great']),
      )
      .optional(),
  })
  .strict();

export type ListProbeCandidatesInput = z.infer<
  typeof ListProbeCandidatesInputSchema
>;

function matchesGrades(
  score: { performance: { grade: ScoreGrade }; contribution: { grade: ScoreGrade } },
  performanceGrades: ScoreGrade[] | undefined,
  contributionGrades: ScoreGrade[] | undefined,
): boolean {
  if (performanceGrades?.length) {
    if (!performanceGrades.includes(score.performance.grade)) return false;
  }
  if (contributionGrades?.length) {
    if (!contributionGrades.includes(score.contribution.grade)) return false;
  }
  return true;
}

export async function listProbeCandidates(
  input: ListProbeCandidatesInput,
  deps: WorkflowDeps = createDefaultWorkflowDeps(),
) {
  const warnings: WorkflowWarning[] = [];
  const { getKeywordHarvestSession, listKeywordHarvestResults } = await import(
    '@youpd/supabase/repositories/youtube'
  );

  const session = await getKeywordHarvestSession(input.harvestId);
  if (!session) {
    warnings.push({
      code: 'KEYWORD_HARVEST_NOT_FOUND',
      message: `Keyword harvest session not found: ${input.harvestId}`,
      target: { harvestId: input.harvestId },
    });
    return workflowEnvelope(
      {
        harvestId: input.harvestId,
        page: input.page,
        limit: input.limit,
        total: 0,
        hasMore: false,
        candidates: [],
      },
      warnings,
    );
  }

  const rows = await listKeywordHarvestResults({
    harvestId: input.harvestId,
    regionCode: session.regionCode,
  });

  let scored = scoreHarvestRows(rows, new Date(deps.clock.nowIso()));

  if (input.goodPlusOnly) {
    scored = filterGoodPlusCandidates(scored);
  } else {
    scored = scored.filter((entry) =>
      matchesGrades(
        entry.score,
        input.performanceGrades,
        input.contributionGrades,
      ),
    );
  }

  scored = sortScoredByRankScore(scored, 'desc');

  const total = scored.length;
  const offset = (input.page - 1) * input.limit;
  const pageRows = scored.slice(offset, offset + input.limit);
  const candidates = pageRows.map((entry) =>
    toKeywordHotCandidate(entry, input.harvestId),
  );

  if (candidates.length === 0) {
    warnings.push({
      code: 'PROBE_CANDIDATES_EMPTY',
      message:
        'No keyword-pool hot candidates matched filters for this probe.',
      target: { harvestId: input.harvestId },
    });
  }

  return workflowEnvelope(
    {
      harvestId: input.harvestId,
      page: input.page,
      limit: input.limit,
      total,
      hasMore: offset + candidates.length < total,
      candidates,
    },
    warnings,
  );
}
