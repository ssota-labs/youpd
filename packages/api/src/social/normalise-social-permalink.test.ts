import { describe, expect, it } from 'vitest';
import {
  normaliseSocialPermalink,
  SocialUrlError,
} from './normalise-social-permalink';

describe('normaliseSocialPermalink', () => {
  it('normalises threads URLs', () => {
    const result = normaliseSocialPermalink(
      'https://www.threads.net/@creator/post/ABC123?utm_source=share',
    );
    expect(result.provider).toBe('threads');
    expect(result.permalink).toBe('https://www.threads.net/@creator/post/ABC123');
    expect(result.permalinkHash).toHaveLength(64);
  });

  it('normalises x.com URLs', () => {
    const result = normaliseSocialPermalink(
      'https://twitter.com/handle/status/1234567890',
    );
    expect(result.provider).toBe('x_bookmarks');
    expect(result.permalink).toBe('https://x.com/handle/status/1234567890');
  });

  it('rejects private DM URLs', () => {
    expect(() =>
      normaliseSocialPermalink('https://x.com/messages/thread-1'),
    ).toThrow(SocialUrlError);
  });
});
