// Slot-assignment helpers for trackKeywordIdeasDue.
// Pure functions kept here so they can be unit-tested without touching Notion.

export const TRACKING_PERIOD_WEEKLY = '주 1회';
export const TRACKING_PERIOD_MONTHLY = '월 1회';
export const SLOT_RANGE_WEEKLY = 7;
export const SLOT_RANGE_MONTHLY = 30;

/** Stable slot derived from the first 8 hex chars of a page id. */
export function deterministicSlot(pageId: string, range: number): number {
  const hex = pageId.replace(/-/g, '').slice(0, 8);
  const n = parseInt(hex, 16);
  if (!Number.isFinite(n)) return 1;
  return (n % range) + 1;
}

export function plannedSlot(
  pageId: string,
  period: string | null,
  currentSlot: number | null,
  forceRebalance: boolean,
): number | null {
  if (period == null) return null;
  if (period === '수동' || period === '중지') return null;
  if (currentSlot != null && currentSlot > 0 && !forceRebalance) {
    return currentSlot;
  }
  if (period === TRACKING_PERIOD_WEEKLY) {
    return deterministicSlot(pageId, SLOT_RANGE_WEEKLY);
  }
  if (period === TRACKING_PERIOD_MONTHLY) {
    return deterministicSlot(pageId, SLOT_RANGE_MONTHLY);
  }
  return null;
}
