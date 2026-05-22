import { Badge } from '@/components/ui/badge';
import { loadHotVideoPageData } from '@/lib/hot-videos/load-page-data';

type HotVideoStatusBarProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function HotVideoStatusBar({ searchParams }: HotVideoStatusBarProps) {
  const sp = await searchParams;
  const { result, statusLabel, scoreIncomplete } = await loadHotVideoPageData(sp);

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      {scoreIncomplete ? (
        <Badge variant="outline">일부 점수 Unknown</Badge>
      ) : null}
      <Badge variant="secondary">
        {result.data.total.toLocaleString('ko-KR')}건
      </Badge>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{statusLabel}</span>
        <span className="mx-2 text-border">·</span>
        <span>
          {result.data.videos.length.toLocaleString('ko-KR')} /{' '}
          {result.data.total.toLocaleString('ko-KR')}
        </span>
      </p>
    </div>
  );
}
