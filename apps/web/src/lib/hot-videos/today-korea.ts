const KOREA_TIMEZONE = 'Asia/Seoul';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function getTodayInKorea(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: KOREA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function resolveHotVideoDate(date?: string | null): string {
  if (date && DATE_PATTERN.test(date)) {
    return date;
  }
  return getTodayInKorea();
}
