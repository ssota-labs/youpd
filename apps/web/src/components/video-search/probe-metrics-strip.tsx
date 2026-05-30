import Link from 'next/link';
import { Badge } from '@youpd/ui/components/ui/badge';
import type { KeywordProbeMetrics } from '@youpd/types';

function formatCount(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
}

function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

type ProbeMetricsStripProps = {
  harvestId: string;
  metrics: KeywordProbeMetrics;
};

export function ProbeMetricsStrip({ harvestId, metrics }: ProbeMetricsStripProps) {
  const hotCandidatesHref = `/hot-videos?sources=keyword,keyword_promoted&regionCode=${encodeURIComponent(metrics.regionCode)}`;

  return (
    <section className="border-b border-border bg-muted/30 px-4 py-3 sm:px-6 lg:px-8 xl:px-10">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Keyword Probe metrics
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {metrics.keywords.join(' · ')} · {metrics.regionCode} ·{' '}
            {metrics.policyVersion}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">후보 {formatCount(metrics.candidateCount)}</Badge>
          <Badge variant="secondary">
            총 조회 {formatCount(metrics.totalViews)}
          </Badge>
          <Badge variant="secondary">
            평균 조회 {formatCount(metrics.averageViews)}
          </Badge>
          <Badge variant="default">
            Good+ {formatPercent(metrics.goodPlusRatio)} (
            {formatCount(metrics.goodPlusCount)})
          </Badge>
        </div>
        <Link
          href={hotCandidatesHref}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Hot Candidates에서 키워드 풀 보기
        </Link>
      </div>
    </section>
  );
}
