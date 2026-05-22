import { describe, expect, it } from 'vitest';
import { getLivenessRow } from './healthChecks';

describe('getLivenessRow (integration)', () => {
  it('reads seeded liveness row from local Supabase', async () => {
    const row = await getLivenessRow();
    expect(row.key).toBe('liveness');
    expect(row.value).toBe('ok');
  });
});
