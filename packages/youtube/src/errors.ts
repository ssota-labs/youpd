// Domain errors for the YouTube Data API v3 client. The Google JSON error
// envelope buries useful detail under `error.errors[].reason`; we surface the
// reason as the discriminator so callers can branch on it without re-parsing.

export type YouTubeErrorReason =
  | 'quotaExceeded'
  | 'rateLimitExceeded'
  | 'userRateLimitExceeded'
  | 'forbidden'
  | 'keyInvalid'
  | 'commentsDisabled'
  | 'videoNotFound'
  | 'channelNotFound'
  | 'unknown';

export class YouTubeApiError extends Error {
  override readonly name: string = 'YouTubeApiError';
  readonly status: number;
  readonly reason: YouTubeErrorReason;
  readonly raw: unknown;

  constructor(opts: {
    message: string;
    status: number;
    reason: YouTubeErrorReason;
    raw: unknown;
  }) {
    super(opts.message);
    this.status = opts.status;
    this.reason = opts.reason;
    this.raw = opts.raw;
  }
}

export class QuotaExceededError extends YouTubeApiError {
  override readonly name: string = 'QuotaExceededError';
  constructor(raw: unknown) {
    super({
      message: 'YouTube Data API daily quota exceeded',
      status: 403,
      reason: 'quotaExceeded',
      raw,
    });
  }
}

export class RateLimitError extends YouTubeApiError {
  override readonly name: string = 'RateLimitError';
  constructor(reason: YouTubeErrorReason, raw: unknown) {
    super({
      message: `YouTube Data API rate limit hit: ${reason}`,
      status: 403,
      reason,
      raw,
    });
  }
}
