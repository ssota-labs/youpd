import type { HomeFeedResponse } from '@youpd/types';
import { Badge } from '@youpd/ui/components/ui/badge';

const KEY_LABELS: Record<
  HomeFeedResponse['systemStatus']['youtubeKeys'],
  string
> = {
  healthy: 'YouTube API 키 정상',
  degraded: 'YouTube API 할당량 주의',
  not_configured: 'YouTube API 키 미설정',
};

export function SystemStatusPanel({
  status,
  source,
}: {
  status: HomeFeedResponse['systemStatus'];
  source: HomeFeedResponse['source'];
}) {
  return (
    <section
      className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm"
      aria-label="시스템 상태"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-foreground">시스템 상태</span>
        <Badge variant="outline">{KEY_LABELS[status.youtubeKeys]}</Badge>
        {source === 'fixture' ? (
          <Badge variant="secondary">Fixture 데이터</Badge>
        ) : null}
        {status.quotaLabel ? (
          <span className="text-muted-foreground">{status.quotaLabel}</span>
        ) : null}
      </div>
    </section>
  );
}
