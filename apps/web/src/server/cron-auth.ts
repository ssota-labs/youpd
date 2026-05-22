import 'server-only';

import { RestAuthError } from '@youpd/api/rest';

export function requireCronSecret(request: Request): void {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    throw new RestAuthError(500, 'CRON_SECRET is not configured');
  }
  const header = request.headers.get('authorization');
  if (header !== `Bearer ${expected}`) {
    throw new RestAuthError(401, 'Unauthorized cron request');
  }
}
