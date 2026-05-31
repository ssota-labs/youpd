import {
  CopySkeletonSchema,
  CreativeTemplateSlotSchemaJson,
  type CopyTemplateFillResponse,
} from '@youpd/types';

export class CopyTemplateFillError extends Error {
  constructor(
    message: string,
    readonly code: 'VALIDATION' | 'MISSING_SLOT',
  ) {
    super(message);
    this.name = 'CopyTemplateFillError';
  }
}

function extractPatternTokens(pattern: string): string[] {
  const tokens = new Set<string>();
  const re = /\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(pattern)) !== null) {
    tokens.add(match[1]!);
  }
  return [...tokens];
}

export function fillCopyTemplateSlots(input: {
  skeletonJson: unknown;
  slotSchemaJson: unknown;
  slotValues: Record<string, string>;
}): CopyTemplateFillResponse {
  const skeleton = CopySkeletonSchema.parse(input.skeletonJson);
  const slotSchema = CreativeTemplateSlotSchemaJson.parse(input.slotSchemaJson);

  for (const slot of slotSchema.slots) {
    if (slot.type !== 'text' && slot.type !== 'number') {
      throw new CopyTemplateFillError(
        `Copy templates only support text/number slots: ${slot.key}`,
        'VALIDATION',
      );
    }
  }

  const patternTokens = extractPatternTokens(skeleton.pattern);
  const slotKeys = new Set(slotSchema.slots.map((s) => s.key));

  for (const token of patternTokens) {
    if (!slotKeys.has(token)) {
      throw new CopyTemplateFillError(
        `Pattern token {{${token}}} has no slot definition`,
        'VALIDATION',
      );
    }
  }

  const normalized: Record<string, string> = {};
  for (const slot of slotSchema.slots) {
    const raw = input.slotValues[slot.key];
    const value = raw?.trim() ?? '';
    if (slot.required && !value) {
      throw new CopyTemplateFillError(
        `Missing required slot: ${slot.key}`,
        'MISSING_SLOT',
      );
    }
    if (value) {
      normalized[slot.key] = value;
    }
  }

  let filledTitle = skeleton.pattern;
  for (const [key, value] of Object.entries(normalized)) {
    filledTitle = filledTitle.replaceAll(`{{${key}}}`, value);
  }

  const unresolved = extractPatternTokens(filledTitle);
  if (unresolved.length > 0) {
    throw new CopyTemplateFillError(
      `Unresolved tokens after fill: ${unresolved.join(', ')}`,
      'MISSING_SLOT',
    );
  }

  return {
    filledTitle,
    slotValues: normalized,
  };
}
