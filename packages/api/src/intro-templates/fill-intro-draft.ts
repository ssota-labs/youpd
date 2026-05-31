import {
  IntroGenerateResponseSchema,
  IntroSkeletonSchema,
  IntroStructureSlotCodeSchema,
  type IntroGenerateResponse,
  type IntroStructureSlotCode,
} from '@youpd/types';
import { slotCodeToStructureKey } from './slice-transcript-first30s';

const SLOT_LABEL_KO: Record<IntroStructureSlotCode, string> = {
  situation: '상황',
  tension: '문제·갈등',
  surprising_claim: '의외의 주장',
  credibility_proof: '신뢰·증거',
  promise: '약속',
  transition: '연결',
};

export class IntroGenerateError extends Error {
  constructor(
    message: string,
    readonly code: 'VALIDATION' | 'NOT_FOUND',
  ) {
    super(message);
    this.name = 'IntroGenerateError';
  }
}

function splitBriefParts(brief: string): string[] {
  return brief
    .split(/[\n.!?…]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function generateIntroDraft(input: {
  templateId: string;
  skeletonJson: unknown;
  userBrief: string;
  sourceSegmentIds: string[];
  sourceVideoIds: string[];
  sourceMode: string;
  structureExtractor: string;
}): IntroGenerateResponse {
  const skeleton = IntroSkeletonSchema.parse(input.skeletonJson);
  const parts = splitBriefParts(input.userBrief);
  const paragraphs: string[] = [];

  skeleton.slotOrder.forEach((slotCode, index) => {
    IntroStructureSlotCodeSchema.parse(slotCode);
    const label = SLOT_LABEL_KO[slotCode];
    const part =
      parts[index] ??
      parts[parts.length - 1] ??
      input.userBrief.trim().slice(0, 280);
    paragraphs.push(`【${label}】\n${part}`);
  });

  const draftText = paragraphs.join('\n\n');

  return IntroGenerateResponseSchema.parse({
    jobId: crypto.randomUUID(),
    status: 'succeeded',
    draftText,
    lineage: {
      introTemplateId: input.templateId,
      sourceSegmentIds: input.sourceSegmentIds,
      sourceVideoIds: input.sourceVideoIds,
      structureExtractor: input.structureExtractor,
      sourceMode: input.sourceMode,
    },
  });
}

export function introSlotValuesFromStructure(
  slotOrder: IntroStructureSlotCode[],
  slots: Record<string, string | undefined>,
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const code of slotOrder) {
    const key = slotCodeToStructureKey(code);
    if (!key) continue;
    const value = slots[key];
    if (value?.trim()) {
      values[code] = value.trim();
    }
  }
  return values;
}
