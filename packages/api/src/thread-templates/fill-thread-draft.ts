import {
  ThreadGenerateResponseSchema,
  ThreadGenerationLineageSchema,
  ThreadSkeletonSchema,
  ThreadStructureSlotCodeSchema,
  type ThreadGenerateResponse,
  type ThreadStructureSlotCode,
  type ThreadStructureType,
} from '@youpd/types';

const SLOT_LABEL_KO: Record<ThreadStructureSlotCode, string> = {
  hook: '훅',
  context: '배경',
  tension: '갈등·문제',
  insight: '통찰',
  proof: '증거',
  tactical_step: '실행 팁',
  cta: '행동 유도',
  bridge: '연결',
};

export class ThreadGenerateError extends Error {
  constructor(
    message: string,
    readonly code: 'VALIDATION' | 'NOT_FOUND',
  ) {
    super(message);
    this.name = 'ThreadGenerateError';
  }
}

function splitTopicParts(topic: string): string[] {
  return topic
    .split(/[\n.!?…]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function generateThreadDraft(input: {
  templateId: string;
  skeletonJson: unknown;
  topic: string;
  audience?: string;
  contextNotes?: string;
  locale: string;
  sourceEvidenceIds: string[];
  sourceSocialPostIds: string[];
  sourceMode: string;
  structureType?: ThreadStructureType | null;
}): ThreadGenerateResponse {
  const skeleton = ThreadSkeletonSchema.parse(input.skeletonJson);
  const parts = splitTopicParts(input.topic);
  const threadParts: { index: number; text: string }[] = [];
  const paragraphs: string[] = [];

  skeleton.slotOrder.forEach((slotCode, index) => {
    ThreadStructureSlotCodeSchema.parse(slotCode);
    const label = SLOT_LABEL_KO[slotCode];
    const part =
      parts[index] ??
      parts[parts.length - 1] ??
      input.topic.trim().slice(0, 280);
    const audienceHint = input.audience?.trim()
      ? ` (${input.audience.trim()} 대상)`
      : '';
    const text = `${part}${audienceHint}`;
    threadParts.push({ index: index + 1, text });
    paragraphs.push(`【${label}】\n${text}`);
  });

  const draftText = paragraphs.join('\n\n');
  const lineage = ThreadGenerationLineageSchema.parse({
    threadTemplateId: input.templateId,
    sourceEvidenceIds: input.sourceEvidenceIds,
    sourceSocialPostIds: input.sourceSocialPostIds,
    promptVersion: 'thread_gen_v1',
    generator: 'deterministic',
    sourceMode: input.sourceMode as 'extracted' | 'manual' | 'imported_seed',
  });

  return ThreadGenerateResponseSchema.parse({
    jobId: crypto.randomUUID(),
    status: 'succeeded',
    draftText,
    parts: threadParts,
    lineage,
  });
}

export function slotCodeToStructureKey(
  code: ThreadStructureSlotCode,
): keyof import('@youpd/types').ThreadStructureSlots | null {
  const map: Record<
    ThreadStructureSlotCode,
    keyof import('@youpd/types').ThreadStructureSlots
  > = {
    hook: 'hook',
    context: 'context',
    tension: 'tension',
    insight: 'insight',
    proof: 'proof',
    tactical_step: 'tacticalStep',
    cta: 'cta',
    bridge: 'bridge',
  };
  return map[code] ?? null;
}
