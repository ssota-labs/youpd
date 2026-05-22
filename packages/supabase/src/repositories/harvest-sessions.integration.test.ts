import { describe, expect, it } from 'vitest';
import { completeHarvestSession, createHarvestSession } from './youtube';

describe('youtube harvest sessions (integration)', () => {
  it('creates and completes a harvest session row', async () => {
    const created = await createHarvestSession({
      type: 'integration_test',
      query: { suite: 'harvest-sessions.integration.test.ts' },
      status: 'running',
    });

    expect(created.status).toBe('running');
    expect(created.type).toBe('integration_test');

    const completed = await completeHarvestSession({
      id: created.id,
      status: 'success',
      resultCount: 3,
    });

    expect(completed.id).toBe(created.id);
    expect(completed.status).toBe('success');
    expect(completed.resultCount).toBe(3);
    expect(completed.completedAt).not.toBeNull();
  });
});
