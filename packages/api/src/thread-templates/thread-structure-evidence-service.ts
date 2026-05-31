import {
  CreateThreadStructureEvidenceBodySchema,
  ThreadStructureEvidenceSummarySchema,
  ThreadStructureSlotsSchema,
  ThreadStructureTypeSchema,
  type ThreadStructureSlots,
  type ThreadStructureType,
} from '@youpd/types';
import {
  getSocialPostById,
  getStructureEvidenceBySocialPostId,
  upsertStructureEvidence,
} from '@youpd/supabase/repositories/thread-templates';

export class ThreadStructureEvidenceError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'NOT_FOUND'
      | 'FORBIDDEN'
      | 'VALIDATION'
      | 'LLM_NOT_CONFIGURED',
  ) {
    super(message);
    this.name = 'ThreadStructureEvidenceError';
  }
}

function deterministicExtractFromPost(text: string): {
  structureType: ThreadStructureType;
  hookStyle: string | null;
  slots: ThreadStructureSlots;
} {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const hook = lines[0]?.slice(0, 500);
  const context = lines[1]?.slice(0, 1000);
  const tension = lines[2]?.slice(0, 1000);
  const insight = lines[3]?.slice(0, 1000);
  const cta = lines[lines.length - 1]?.slice(0, 500);

  let structureType: ThreadStructureType = 'lesson';
  if (/틀렸|반대|사실은|하지만/.test(text)) {
    structureType = 'contrarian_take';
  } else if (/^\d+[\.)]|체크리스트|단계/.test(text)) {
    structureType = 'listicle';
  } else if (/분석|뜯|리뷰|teardown/i.test(text)) {
    structureType = 'teardown';
  }

  return {
    structureType,
    hookStyle: hook?.includes('?') ? 'question' : 'bold-claim',
    slots: ThreadStructureSlotsSchema.parse({
      hook,
      context,
      tension,
      insight,
      cta,
      notes: lines.length > 5 ? `Extracted ${lines.length} parts` : undefined,
    }),
  };
}

export async function getSocialPostStructureEvidence(
  userId: string,
  socialPostId: string,
) {
  const post = await getSocialPostById(socialPostId);
  if (!post) {
    throw new ThreadStructureEvidenceError('Social post not found', 'NOT_FOUND');
  }
  if (post.userId !== userId) {
    throw new ThreadStructureEvidenceError('Forbidden', 'FORBIDDEN');
  }

  const evidence = await getStructureEvidenceBySocialPostId(socialPostId);
  if (!evidence) return null;

  return ThreadStructureEvidenceSummarySchema.parse({
    id: evidence.id,
    socialPostId: evidence.socialPostId,
    structureType: ThreadStructureTypeSchema.parse(evidence.structureType),
    hookStyle: evidence.hookStyle,
    sourceMode: evidence.sourceMode,
    structureExtractor: evidence.structureExtractor,
    structureSlots: ThreadStructureSlotsSchema.parse(evidence.structureSlotsJson),
    manualStructureNotes: evidence.manualStructureNotesJson
      ? ThreadStructureSlotsSchema.parse(evidence.manualStructureNotesJson)
      : null,
  });
}

export async function createOrUpdateSocialPostStructureEvidence(
  userId: string,
  socialPostId: string,
  body: unknown,
) {
  const post = await getSocialPostById(socialPostId);
  if (!post) {
    throw new ThreadStructureEvidenceError('Social post not found', 'NOT_FOUND');
  }
  if (post.userId !== userId) {
    throw new ThreadStructureEvidenceError('Forbidden', 'FORBIDDEN');
  }

  const parsed = CreateThreadStructureEvidenceBodySchema.parse(body);

  if (parsed.manual && parsed.manualStructureNotes) {
    const row = await upsertStructureEvidence({
      socialPostId,
      userId,
      structureType: parsed.structureType ?? 'lesson',
      hookStyle: parsed.hookStyle ?? null,
      structureSlotsJson: parsed.manualStructureNotes,
      sourceMode: 'manual',
      structureExtractor: 'manual',
      manualStructureNotesJson: parsed.manualStructureNotes,
    });

    return ThreadStructureEvidenceSummarySchema.parse({
      id: row.id,
      socialPostId: row.socialPostId,
      structureType: ThreadStructureTypeSchema.parse(row.structureType),
      hookStyle: row.hookStyle,
      sourceMode: row.sourceMode,
      structureExtractor: row.structureExtractor,
      structureSlots: ThreadStructureSlotsSchema.parse(row.structureSlotsJson),
      manualStructureNotes: row.manualStructureNotesJson
        ? ThreadStructureSlotsSchema.parse(row.manualStructureNotesJson)
        : null,
    });
  }

  const llmEnabled = process.env.THREAD_STRUCTURE_LLM_ENABLED === 'true';
  if (llmEnabled) {
    throw new ThreadStructureEvidenceError(
      'LLM extractor not configured in this environment',
      'LLM_NOT_CONFIGURED',
    );
  }

  const extracted = deterministicExtractFromPost(post.textContent);
  const structureType = parsed.structureType ?? extracted.structureType;

  const row = await upsertStructureEvidence({
    socialPostId,
    userId,
    structureType,
    hookStyle: parsed.hookStyle ?? extracted.hookStyle,
    structureSlotsJson: extracted.slots,
    sourceMode: 'extracted',
    structureExtractor: 'deterministic_v1',
    lineageSnapshot: { promptVersion: 'thread_structure_v1', generator: 'deterministic' },
  });

  return ThreadStructureEvidenceSummarySchema.parse({
    id: row.id,
    socialPostId: row.socialPostId,
    structureType: ThreadStructureTypeSchema.parse(row.structureType),
    hookStyle: row.hookStyle,
    sourceMode: row.sourceMode,
    structureExtractor: row.structureExtractor,
    structureSlots: ThreadStructureSlotsSchema.parse(row.structureSlotsJson),
    manualStructureNotes: null,
  });
}
