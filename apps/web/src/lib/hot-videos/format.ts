import type { VariantProps } from 'class-variance-authority';
import { badgeVariants } from '@/components/ui/badge';

export function formatCount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '-';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString('ko-KR');
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function formatScore(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return 'Unknown';
  return value.toFixed(2);
}

export function formatDateLabel(value: string | null | undefined): string {
  if (!value) return '전체 기간';
  return value;
}

export function gradeBadgeVariant(
  grade: string,
): VariantProps<typeof badgeVariants>['variant'] {
  switch (grade) {
    case 'Great':
    case 'Good':
      return 'default';
    case 'Normal':
      return 'secondary';
    case 'Bad':
    case 'Worst':
      return 'destructive';
    default:
      return 'outline';
  }
}

export function gradeLabelKo(grade: string): string {
  switch (grade) {
    case 'Great':
      return 'Great';
    case 'Good':
      return 'Good';
    case 'Normal':
      return 'Normal';
    case 'Bad':
      return 'Bad';
    case 'Worst':
      return 'Worst';
    default:
      return 'Unknown';
  }
}
