import type { ClockPort } from '../ports/clock';

export function createSystemClockPort(): ClockPort {
  return {
    todayYmd() {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: process.env.SNAPSHOT_DEFAULT_TIME_ZONE || 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
    },
    nowIso() {
      return new Date().toISOString();
    },
  };
}
