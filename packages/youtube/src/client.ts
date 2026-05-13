import { z } from 'zod';
import {
  QuotaExceededError,
  RateLimitError,
  YouTubeApiError,
  type YouTubeErrorReason,
} from './errors';

const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';

export type YouTubeClient = {
  request: <T>(opts: {
    path: string;
    params: Record<string, string | number | undefined>;
    schema: z.ZodType<T>;
    signal?: AbortSignal;
  }) => Promise<T>;
};

type CreateOptions = {
  apiKey: string;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
};

const GoogleErrorBodySchema = z.object({
  error: z.object({
    code: z.number().int(),
    message: z.string(),
    errors: z
      .array(
        z.object({
          domain: z.string().optional(),
          reason: z.string().optional(),
          message: z.string().optional(),
        }),
      )
      .optional(),
  }),
});

const RATE_LIMIT_REASONS = new Set<YouTubeErrorReason>([
  'rateLimitExceeded',
  'userRateLimitExceeded',
]);

function classifyReason(reason: string | undefined): YouTubeErrorReason {
  switch (reason) {
    case 'quotaExceeded':
      return 'quotaExceeded';
    case 'rateLimitExceeded':
      return 'rateLimitExceeded';
    case 'userRateLimitExceeded':
      return 'userRateLimitExceeded';
    case 'forbidden':
      return 'forbidden';
    case 'keyInvalid':
      return 'keyInvalid';
    case 'commentsDisabled':
      return 'commentsDisabled';
    case 'videoNotFound':
      return 'videoNotFound';
    case 'channelNotFound':
      return 'channelNotFound';
    default:
      return 'unknown';
  }
}

function toQueryString(
  params: Record<string, string | number | undefined>,
): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    usp.set(k, String(v));
  }
  return usp.toString();
}

export function createYouTubeClient(opts: CreateOptions): YouTubeClient {
  if (!opts.apiKey) {
    throw new Error('YouTube API key is required');
  }
  const fetchImpl: typeof fetch = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const baseUrl = opts.baseUrl ?? YOUTUBE_BASE_URL;

  return {
    async request<T>(req: {
      path: string;
      params: Record<string, string | number | undefined>;
      schema: z.ZodType<T>;
      signal?: AbortSignal;
    }): Promise<T> {
      const qs = toQueryString({ ...req.params, key: opts.apiKey });
      const url = `${baseUrl}${req.path}?${qs}`;
      const response = await fetchImpl(url, {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: req.signal,
      });

      if (!response.ok) {
        let rawBody: unknown = null;
        try {
          rawBody = await response.json();
        } catch {
          // not JSON — keep null
        }
        const parsed = GoogleErrorBodySchema.safeParse(rawBody);
        const firstReason = parsed.success
          ? parsed.data.error.errors?.[0]?.reason
          : undefined;
        const reason = classifyReason(firstReason);
        const message = parsed.success
          ? parsed.data.error.message
          : `YouTube API error (${response.status})`;
        if (reason === 'quotaExceeded') {
          throw new QuotaExceededError(rawBody);
        }
        if (RATE_LIMIT_REASONS.has(reason)) {
          throw new RateLimitError(reason, rawBody);
        }
        throw new YouTubeApiError({
          message,
          status: response.status,
          reason,
          raw: rawBody,
        });
      }

      const body: unknown = await response.json();
      return req.schema.parse(body);
    },
  };
}
