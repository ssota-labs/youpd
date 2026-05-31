import { createHash } from 'node:crypto';
import { THUMBNAIL_PROMPT_VERSION, type ThumbnailSlotValues } from '@youpd/types';

export type PromptBuildInput = {
  promptScaffold: string;
  defaultStyle: Record<string, unknown>;
  slotValues: ThumbnailSlotValues;
  referenceNotes?: string[];
};

export type PromptBuildResult = {
  promptText: string;
  promptVersion: string;
  promptHash: string;
};

function replaceSlotPlaceholders(
  scaffold: string,
  values: Record<string, string | number>,
): string {
  let text = scaffold;
  for (const [key, value] of Object.entries(values)) {
    text = text.replaceAll(`{{${key}}}`, String(value));
  }
  return text;
}

export function buildThumbnailPrompt(input: PromptBuildInput): PromptBuildResult {
  const base = replaceSlotPlaceholders(
    input.promptScaffold,
    input.slotValues.values,
  );

  const styleBlock =
    Object.keys(input.defaultStyle).length > 0
      ? `\nStyle: ${JSON.stringify(input.defaultStyle)}`
      : '';

  const referenceBlock =
    input.referenceNotes && input.referenceNotes.length > 0
      ? `\nReference context:\n${input.referenceNotes.join('\n')}`
      : '';

  const promptText = `${base.trim()}${styleBlock}${referenceBlock}`.trim();
  const promptHash = createHash('sha256').update(promptText).digest('hex');

  return {
    promptText,
    promptVersion: THUMBNAIL_PROMPT_VERSION,
    promptHash,
  };
}
