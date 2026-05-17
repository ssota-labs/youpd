import { describe, expect, it } from 'vitest';

import {
  TRACKING_PERIOD_MONTHLY,
  TRACKING_PERIOD_WEEKLY,
  deterministicSlot,
  plannedSlot,
} from './tracking-slots.js';

describe('deterministicSlot', () => {
  it('returns a value in [1, range] for any page id', () => {
    for (let i = 0; i < 100; i += 1) {
      const id = `abc${i.toString(16).padStart(8, '0')}-0000-0000-0000-000000000000`;
      const w = deterministicSlot(id, 7);
      const m = deterministicSlot(id, 30);
      expect(w).toBeGreaterThanOrEqual(1);
      expect(w).toBeLessThanOrEqual(7);
      expect(m).toBeGreaterThanOrEqual(1);
      expect(m).toBeLessThanOrEqual(30);
    }
  });

  it('is stable for the same input', () => {
    const id = '12345678-abcd-ef00-0000-000000000000';
    expect(deterministicSlot(id, 7)).toBe(deterministicSlot(id, 7));
  });
});

describe('plannedSlot', () => {
  const PID = '12345678-abcd-ef00-0000-000000000000';

  it('returns null for 수동/중지/missing period', () => {
    expect(plannedSlot(PID, null, null, false)).toBeNull();
    expect(plannedSlot(PID, '수동', null, false)).toBeNull();
    expect(plannedSlot(PID, '중지', null, false)).toBeNull();
  });

  it('preserves an existing slot when force_rebalance is false', () => {
    expect(plannedSlot(PID, TRACKING_PERIOD_WEEKLY, 3, false)).toBe(3);
    expect(plannedSlot(PID, TRACKING_PERIOD_MONTHLY, 17, false)).toBe(17);
  });

  it('reassigns when force_rebalance is true', () => {
    const newSlot = plannedSlot(PID, TRACKING_PERIOD_WEEKLY, 3, true);
    expect(newSlot).not.toBe(3);
    expect(newSlot).toBe(deterministicSlot(PID, 7));
  });

  it('assigns a fresh slot when current is null', () => {
    expect(plannedSlot(PID, TRACKING_PERIOD_WEEKLY, null, false)).toBe(
      deterministicSlot(PID, 7),
    );
  });

  it('spreads ideas across the weekly range', () => {
    const counts: Record<number, number> = {};
    for (let i = 0; i < 70; i += 1) {
      const id = `${(0xdeadbeef + i).toString(16).padStart(8, '0')}-0000-0000-0000-000000000000`;
      const slot = plannedSlot(id, TRACKING_PERIOD_WEEKLY, null, false);
      if (slot == null) continue;
      counts[slot] = (counts[slot] ?? 0) + 1;
    }
    expect(Object.keys(counts).length).toBeGreaterThan(3);
  });
});
