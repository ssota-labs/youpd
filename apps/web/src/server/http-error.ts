import 'server-only';

/** HTTP auth failures for cron and other server routes. */
export class HttpAuthError extends Error {
  override readonly name = 'HttpAuthError';
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
