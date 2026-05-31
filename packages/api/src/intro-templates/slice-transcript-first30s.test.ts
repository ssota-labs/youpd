import { describe, expect, it } from 'vitest';
import {
  deterministicExtractIntroStructure,
  sliceTranscriptFirst30s,
} from './slice-transcript-first30s';

describe('sliceTranscriptFirst30s', () => {
  it('joins segments within the first 30 seconds', () => {
    const result = sliceTranscriptFirst30s([
      { startMs: 0, endMs: 5000, text: '첫 문장.' },
      { startMs: 5000, endMs: 12000, text: '두 번째.' },
      { startMs: 35000, endMs: 40000, text: '본편.' },
    ]);

    expect(result.windowStartMs).toBe(0);
    expect(result.windowEndMs).toBe(30000);
    expect(result.excerptText).toBe('첫 문장. 두 번째.');
  });

  it('returns empty excerpt when no segments', () => {
    const result = sliceTranscriptFirst30s([]);
    expect(result.excerptText).toBe('');
    expect(result.windowEndMs).toBe(0);
  });
});

describe('deterministicExtractIntroStructure', () => {
  it('maps sentences onto intro slots', () => {
    const slots = deterministicExtractIntroStructure(
      '상황입니다. 갈등이 있습니다. 약속합니다.',
    );
    expect(slots.situation).toContain('상황');
    expect(slots.tension).toContain('갈등');
    expect(slots.surprisingClaim ?? slots.promise).toBeTruthy();
  });
});
