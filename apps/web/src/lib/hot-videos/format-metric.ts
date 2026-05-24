export function formatCompactMetric(value: number): string {
  if (!Number.isFinite(value)) return '-';

  const abs = Math.abs(value);
  if (abs >= 100_000_000) {
    const scaled = value / 100_000_000;
    return `${scaled.toFixed(1).replace(/\.0$/, '')}억`;
  }
  if (abs >= 10_000) {
    const scaled = value / 10_000;
    return `${scaled.toFixed(1).replace(/\.0$/, '')}만`;
  }

  return value.toLocaleString('ko-KR');
}

export function formatRangeBound(value: number, isMax = false, sliderMax?: number): string {
  if (isMax && sliderMax != null && value >= sliderMax) {
    return `${sliderMax.toLocaleString('ko-KR')}+`;
  }

  return value.toLocaleString('ko-KR');
}
