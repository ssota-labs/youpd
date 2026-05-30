'use client';

import Link from 'next/link';
import { Button } from '@youpd/ui/components/ui/button';
import { Badge } from '@youpd/ui/components/ui/badge';
import type { ReferenceCandidate } from '@youpd/types';

export function CandidateRow({
  candidate,
  onDismiss,
}: {
  candidate: ReferenceCandidate;
  onDismiss: () => void;
}) {
  return (
    <li className="rounded-md border border-border/80 bg-muted/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{candidate.title}</p>
          <p className="text-xs text-muted-foreground">{candidate.channelTitle}</p>
        </div>
        {candidate.performanceHint ? (
          <Badge variant="secondary">{candidate.performanceHint}</Badge>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-foreground">{candidate.recommendationReason}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled title="S2">
          레퍼런스 저장
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
          숨기기
        </Button>
        <Button asChild size="sm" variant="secondary">
          <Link href="/hot-videos">Hot Candidates에서 보기</Link>
        </Button>
      </div>
    </li>
  );
}
