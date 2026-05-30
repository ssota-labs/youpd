/**
 * URL classification for link badges: X (Twitter), YouTube, or generic link.
 */

export type LinkType = 'x' | 'youtube' | 'link';

// URL regex to extract URLs from plain text (http, https)
const URL_REGEX =
  /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/g;

const X_HOSTS = new Set(['x.com', 'twitter.com', 'www.x.com', 'www.twitter.com']);
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'www.youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

function getHostFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname.toLowerCase().replace(/^www\./, '') || u.hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function parseAndClassifyUrl(
  url: string
): { url: string; type: LinkType } | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  let toParse = trimmed;
  if (!/^https?:\/\//i.test(toParse)) {
    toParse = `https://${toParse}`;
  }

  try {
    const u = new URL(toParse);
    if (!['http:', 'https:'].includes(u.protocol)) return null;

    const host = u.hostname.toLowerCase().replace(/^www\./, '');

    if (X_HOSTS.has(host) || X_HOSTS.has(u.hostname.toLowerCase())) {
      return { url: u.href, type: 'x' };
    }
    if (YOUTUBE_HOSTS.has(host) || YOUTUBE_HOSTS.has(u.hostname.toLowerCase())) {
      return { url: u.href, type: 'youtube' };
    }
    return { url: u.href, type: 'link' };
  } catch {
    return null;
  }
}

/** Returns normalized URLs to add as links, and the raw regex matches for removal from text. */
export function extractUrlsWithRemaining(text: string): {
  urls: string[];
  remaining: string;
} {
  if (!text || typeof text !== 'string') return { urls: [], remaining: text };
  const matches = text.match(URL_REGEX);
  if (!matches) return { urls: [], remaining: text };

  const seen = new Set<string>();
  const urls: string[] = [];
  let remaining = text;
  for (const raw of matches) {
    const parsed = parseAndClassifyUrl(raw);
    if (parsed && !seen.has(parsed.url)) {
      seen.add(parsed.url);
      urls.push(parsed.url);
    }
    remaining = remaining.replace(raw, ' ');
  }
  remaining = remaining.replace(/\s{2,}/g, ' ').trim();
  return { urls, remaining };
}

export function extractUrlsFromText(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  const matches = text.match(URL_REGEX);
  if (!matches) return [];

  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of matches) {
    const parsed = parseAndClassifyUrl(raw);
    if (parsed && !seen.has(parsed.url)) {
      seen.add(parsed.url);
      result.push(parsed.url);
    }
  }
  return result;
}
