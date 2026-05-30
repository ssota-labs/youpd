import { Badge } from '@youpd/ui/components/ui/badge';

type VideoSearchStatusBarProps = {
  total: number;
  loadedCount: number;
  statusLabel: string;
  scoreIncomplete: boolean;
};

export function VideoSearchStatusBar({
  total,
  loadedCount,
  statusLabel,
  scoreIncomplete,
}: VideoSearchStatusBarProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      {scoreIncomplete ? (
        <Badge variant="outline">일부 점수 Unknown</Badge>
      ) : null}
      <Badge variant="secondary">{total.toLocaleString('ko-KR')}건</Badge>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{statusLabel}</span>
        <span className="mx-2 text-border">·</span>
        <span>
          {loadedCount.toLocaleString('ko-KR')} / {total.toLocaleString('ko-KR')}
        </span>
      </p>
    </div>
  );
}
