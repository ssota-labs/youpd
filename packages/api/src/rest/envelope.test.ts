import { describe, expect, it } from 'vitest';
import {
  metaFromResult,
  splitQuotaSession,
  wrapRestEnvelope,
} from '../rest/envelope';

describe('wrapRestEnvelope', () => {
  it('adds timestamps and merges meta', () => {
    const { data, meta } = wrapRestEnvelope({ x: 1 }, { jobId: 'jid' });
    expect(data).toEqual({ x: 1 });
    expect(meta.source).toBe('youpd-cron');
    expect(meta.jobId).toBe('jid');
    expect(meta.fetchedAt).toMatch(/^\d{4}-/);
  });
});

describe('splitQuotaSession', () => {
  it('removes quota_session_id from payload', () => {
    const { body, quotaSessionId } = splitQuotaSession({
      foo: 'bar',
      quota_session_id: 'abc',
    });
    expect(quotaSessionId).toBe('abc');
    expect(body).toEqual({ foo: 'bar' });
  });
});

describe('metaFromResult', () => {
  it('maps audit id and units consumed', () => {
    const m = metaFromResult({
      quota_session_id: 's1',
      units_consumed: 12,
    });
    expect(m.jobId).toBe('s1');
    expect(m.unitsConsumed).toBe(12);
  });
});
