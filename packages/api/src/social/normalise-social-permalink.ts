import { createHash } from 'node:crypto';
import type { SocialProvider } from '@youpd/types';

export class SocialUrlError extends Error {
  constructor(
    message: string,
    readonly code: 'UNSUPPORTED_URL' | 'INVALID_URL',
  ) {
    super(message);
    this.name = 'SocialUrlError';
  }
}

export type NormalisedSocialPermalink = {
  permalink: string;
  permalinkHash: string;
  provider: SocialProvider;
};

function hostMatches(hostname: string, suffix: string) {
  return hostname === suffix || hostname.endsWith(`.${suffix}`);
}

export function normaliseSocialPermalink(rawUrl: string): NormalisedSocialPermalink {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new SocialUrlError('Invalid URL', 'INVALID_URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new SocialUrlError('Unsupported URL scheme', 'UNSUPPORTED_URL');
  }

  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname.replace(/\/+$/, '') || '/';

  if (path.includes('/messages') || path.includes('/dm')) {
    throw new SocialUrlError('Private or DM URLs are not supported', 'UNSUPPORTED_URL');
  }

  let provider: SocialProvider = 'manual';
  let permalink = parsed.toString();

  if (hostMatches(host, 'threads.net')) {
    provider = 'threads';
    permalink = `https://www.threads.net${path}`;
  } else if (
    hostMatches(host, 'x.com') ||
    hostMatches(host, 'twitter.com') ||
    hostMatches(host, 'mobile.twitter.com')
  ) {
    provider = 'x_bookmarks';
    const canonicalHost = 'x.com';
    permalink = `https://${canonicalHost}${path}`;
  } else {
    throw new SocialUrlError(
      'Only Threads and X/Twitter public URLs are supported',
      'UNSUPPORTED_URL',
    );
  }

  const permalinkHash = createHash('sha256').update(permalink).digest('hex');

  return { permalink, permalinkHash, provider };
}
