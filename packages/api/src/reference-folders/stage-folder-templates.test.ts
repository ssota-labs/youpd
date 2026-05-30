import { describe, expect, it } from 'vitest';
import { DEFAULT_STAGE_FOLDER_TEMPLATES } from './stage-folder-templates';

describe('DEFAULT_STAGE_FOLDER_TEMPLATES', () => {
  it('seeds seven consumer-stage folders including unspecified', () => {
    expect(DEFAULT_STAGE_FOLDER_TEMPLATES).toHaveLength(7);
    expect(DEFAULT_STAGE_FOLDER_TEMPLATES.filter((f) => f.isUnspecified)).toHaveLength(1);
    expect(DEFAULT_STAGE_FOLDER_TEMPLATES.map((f) => f.consumerStage)).toContain(
      'most_aware',
    );
  });
});
