'use client';

import Link from 'next/link';
import { Button } from '@youpd/ui/components/ui/button';
import { Badge } from '@youpd/ui/components/ui/badge';
import type { KeywordProbe, ReferenceCandidate } from '@youpd/types';
import { CandidateRow } from './candidate-row';

const STAGE_LABELS: Record<KeywordProbe['consumerStage'], string> = {
  unaware: '비인지',
  problem_aware: '문제 인지',
  solution_aware: '솔루션 인지',
  product_aware: '제품 인지',
  most_aware: '구매 직전',
};

export function ProbeCard({
  probe,
  candidates,
  onDismissCandidate,
}: {
  probe: KeywordProbe;
  candidates: ReferenceCandidate[];
  onDismissCandidate: (id: string) => void;
}) {
  const prefill = encodeURIComponent(probe.suggestedKeywords.join(','));
  const runHref = `/keywords?prefill=${prefill}`;

  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{probe.probeLabel}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{probe.rationale}</p>
        </div>
        <Badge variant="outline">{STAGE_LABELS[probe.consumerStage]}</Badge>
      </div>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Audience</dt>
          <dd>{probe.audience}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Seed theme</dt>
          <dd>{probe.seedTheme}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Problem / situation</dt>
          <dd>{probe.problemOrSituation}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Goal</dt>
          <dd>{probe.goal}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href={runHref}>프로브 실행</Link>
        </Button>
        <span className="self-center text-xs text-muted-foreground">
          상태: {probe.searchStatus}
        </span>
      </div>

      {candidates.length > 0 ? (
        <ul className="mt-5 space-y-3 border-t border-border pt-4">
          {candidates.map((candidate) => (
            <CandidateRow
              key={candidate.id}
              candidate={candidate}
              onDismiss={() => onDismissCandidate(candidate.id)}
            />
          ))}
        </ul>
      ) : null}
    </article>
  );
}
