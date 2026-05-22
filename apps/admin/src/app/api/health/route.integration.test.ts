import { describe, expect, it } from 'vitest';
import { GET } from './route';

describe('apps/admin /api/health (integration)', () => {
  it('returns liveness from local Supabase seed', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ status: 'ok', key: 'liveness', value: 'ok' });
  });
});
