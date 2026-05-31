import { describe, expect, it } from 'vitest';
import { buildThumbnailPrompt } from './prompt-builder';
import { validateSlotValuesAgainstSchema } from './slot-validation';
import { createImageGenerationPort, stubImageGenerationPort } from './image-generation-port';

describe('buildThumbnailPrompt', () => {
  it('replaces slot placeholders and hashes prompt', () => {
    const result = buildThumbnailPrompt({
      promptScaffold: 'Headline: {{headline}}.',
      defaultStyle: { accent: '#000' },
      slotValues: { version: 1, values: { headline: '테스트' } },
      referenceNotes: ['Ref video'],
    });
    expect(result.promptText).toContain('테스트');
    expect(result.promptText).toContain('Ref video');
    expect(result.promptHash).toHaveLength(64);
    expect(result.promptVersion).toBe('thumbnail-prompt-v1');
  });
});

describe('validateSlotValuesAgainstSchema', () => {
  const schema = {
    version: 1 as const,
    slots: [
      { key: 'headline', label: '헤드라인', type: 'text' as const, required: true },
      { key: 'metric', label: '숫자', type: 'number' as const, required: true },
    ],
  };

  it('rejects missing required slots', () => {
    const result = validateSlotValuesAgainstSchema(schema, {
      version: 1,
      values: { metric: 42 },
    });
    expect(result.ok).toBe(false);
  });

  it('accepts valid values', () => {
    const result = validateSlotValuesAgainstSchema(schema, {
      version: 1,
      values: { headline: 'Hi', metric: '99' },
    });
    expect(result.ok).toBe(true);
  });
});

describe('image generation port', () => {
  it('stub port is configured and returns png bytes', async () => {
    expect(stubImageGenerationPort.isConfigured()).toBe(true);
    const out = await stubImageGenerationPort.generate({
      prompt: 'test',
      aspect: '16:9',
    });
    expect(out.mimeType).toBe('image/png');
    expect(out.imageBytes.length).toBeGreaterThan(0);
  });

  it('none provider when env set', () => {
    const port = createImageGenerationPort({ THUMBNAIL_IMAGE_PROVIDER: 'none' });
    expect(port.isConfigured()).toBe(false);
  });
});
