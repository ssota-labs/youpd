export class RestAuthError extends Error {
  override readonly name = 'RestAuthError';
  readonly status: number;

  constructor(
    status: number,
    message: string,
  ) {
    super(message);
    this.status = status;
  }
}

/** Bearer token parity with Workers secret `YOUPD_API_TOKEN`. */
export function requireYoupdRestToken(request: Request): void {
  const expected = process.env.YOUPD_API_TOKEN;
  if (!expected || expected.length === 0) {
    throw new RestAuthError(503, 'REST API token is not configured');
  }

  const header = request.headers.get('authorization') ?? '';
  const token =
    header.startsWith('Bearer ') ? header.slice(7).trim() : header.trim();

  if (token !== expected) {
    throw new RestAuthError(401, 'Unauthorized');
  }
}
