import type { HotVideoRow } from '@youpd/api/youtube';

export function hotVideoRowKey(row: HotVideoRow): string {
  return [
    row.regionCode,
    row.hotDate,
    row.source,
    row.categoryId ?? '',
    row.rank,
    row.video?.id ?? '',
  ].join('|');
}

export function dedupeHotVideoRows(rows: HotVideoRow[]): HotVideoRow[] {
  const seen = new Set<string>();
  const deduped: HotVideoRow[] = [];

  for (const row of rows) {
    const key = hotVideoRowKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }

  return deduped;
}
