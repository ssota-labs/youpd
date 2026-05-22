import 'server-only';

import { HttpAuthError } from './http-error';

export function requireCronSecret(request: Request): void {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    throw new HttpAuthError(500, 'CRON_SECRET is not configured');
  }
  const header = request.headers.get('authorization');
  if (header !== `Bearer ${expected}`) {
    throw new HttpAuthError(401, 'Unauthorized cron request');
  }
}
