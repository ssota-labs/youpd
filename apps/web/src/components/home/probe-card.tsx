'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  onProbeDismissed,
}: {
  probe: KeywordProbe;
  candidates: ReferenceCandidate[];
  onDismissCandidate: (id: string) => void;
  onProbeDismissed?: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirmRun, setConfirmRun] = useState(false);

  const prefill = encodeURIComponent(probe.suggestedKeywords.join(','));
  const prefillHref = `/keywords?prefill=${prefill}`;

  async function dismissProbe() {
    setPending(true);
    try {
      const res = await fetch(`/api/probes/${probe.id}`, { method: 'DELETE' });
      if (res.ok) onProbeDismissed?.();
    } finally {
      setPending(false);
    }
  }

  async function runHarvest() {
    setPending(true);
    try {
      const res = await fetch(`/api/probes/${probe.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regionCode: 'KR' }),
      });
      const body = (await res.json()) as { harvestId?: string | null; error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? '검색 실행 실패');
      }
      if (body.harvestId) {
        router.push(`/keywords/${body.harvestId}`);
      } else {
        router.push(prefillHref);
      }
    } catch {
      router.push(prefillHref);
    } finally {
      setPending(false);
      setConfirmRun(false);
    }
  }

  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{probe.probeLabel}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{probe.rationale}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{STAGE_LABELS[probe.consumerStage]}</Badge>
          {probe.status ? (
            <Badge variant="secondary">{probe.status}</Badge>
          ) : null}
        </div>
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
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => setConfirmRun(true)}
        >
          YouTube 검색 실행
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={prefillHref}>키워드만 채우기</Link>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => void dismissProbe()}
        >
          숨기기
        </Button>
        <span className="self-center text-xs text-muted-foreground">
          상태: {probe.searchStatus}
        </span>
      </div>

      {confirmRun ? (
        <div
          className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950"
          role="alertdialog"
          aria-label="검색 실행 확인"
        >
          <p>
            YouTube 검색을 실행하면 API 할당량이 사용됩니다. 계속하시겠습니까?
          </p>
          <div className="mt-2 flex gap-2">
            <Button type="button" size="sm" disabled={pending} onClick={() => void runHarvest()}>
              실행
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setConfirmRun(false)}
            >
              취소
            </Button>
          </div>
        </div>
      ) : null}

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
