import { describe, expect, it } from 'vitest';
import { getTodayInKorea, resolveHotVideoDate } from './today-korea';

describe('today-korea', () => {
  it('returns YYYY-MM-DD for Korea timezone', () => {
    expect(getTodayInKorea()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('uses provided valid date when present', () => {
    expect(resolveHotVideoDate('2026-05-01')).toBe('2026-05-01');
  });

  it('falls back to today when date is missing or invalid', () => {
    const today = getTodayInKorea();
    expect(resolveHotVideoDate()).toBe(today);
    expect(resolveHotVideoDate('')).toBe(today);
    expect(resolveHotVideoDate('invalid')).toBe(today);
  });
});
