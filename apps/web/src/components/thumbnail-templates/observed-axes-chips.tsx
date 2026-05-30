import type { ThumbnailObservedAxes } from '@youpd/types';
import { Badge } from '@youpd/ui/components/ui/badge';

const LABELS: Array<{ key: keyof ThumbnailObservedAxes; label: string }> = [
  { key: 'visualHierarchy', label: '시선 흐름' },
  { key: 'textDensity', label: '텍스트 밀도' },
  { key: 'faceTreatment', label: '얼굴 처리' },
  { key: 'thumbnailEmotion', label: '감정' },
  { key: 'titleThumbnailAlignment', label: '제목 정합' },
];

type ObservedAxesChipsProps = {
  axes: ThumbnailObservedAxes;
};

export function ObservedAxesChips({ axes }: ObservedAxesChipsProps) {
  const chips = LABELS.flatMap(({ key, label }) => {
    const value = axes[key];
    if (value == null || value === '') return [];
    return [`${label}: ${String(value)}`];
  });

  if (chips.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">기록된 증거 축이 없습니다.</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((chip) => (
        <Badge key={chip} variant="outline" className="font-normal">
          {chip}
        </Badge>
      ))}
    </div>
  );
}
