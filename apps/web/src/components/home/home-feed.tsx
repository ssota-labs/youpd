'use client';

import { useCallback, useMemo, useState } from 'react';
import type { HomeFeedResponse } from '@youpd/types';
import { Button } from '@youpd/ui/components/ui/button';
import { OnboardingForm } from './onboarding-form';
import { ProbeCard } from './probe-card';
import { SystemStatusPanel } from './system-status';

export function HomeFeed({ initial }: { initial: HomeFeedResponse }) {
  const [feed, setFeed] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  const reloadFeed = useCallback(async () => {
    const res = await fetch('/api/home/feed');
    if (!res.ok) return;
    const data = (await res.json()) as HomeFeedResponse;
    setFeed(data);
    setEditing(false);
  }, []);

  const visibleCandidates = useMemo(
    () => feed.candidates.filter((c) => !dismissed.has(c.id)),
    [feed.candidates, dismissed],
  );

  const showOnboarding = !feed.onboarding || editing;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Planning Recommendation Feed</h1>
        <p className="text-sm text-muted-foreground">
          오늘 탐색할 Keyword Probe와 레퍼런스 후보를 추천합니다.
        </p>
      </header>

      <SystemStatusPanel status={feed.systemStatus} source={feed.source} />

      {feed.onboarding && !editing ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          <span className="text-muted-foreground">저장된 맥락:</span>
          <span className="line-clamp-1 font-medium">{feed.onboarding.interestTopics}</span>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(true)}>
            수정
          </Button>
        </div>
      ) : null}

      {showOnboarding ? (
        <OnboardingForm initial={feed.onboarding} onSaved={reloadFeed} />
      ) : feed.probes.length === 0 ? (
        <p className="text-sm text-muted-foreground">추천 프로브가 없습니다. 맥락을 수정해 보세요.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {feed.probes.map((probe) => (
            <ProbeCard
              key={probe.id}
              probe={probe}
              candidates={visibleCandidates.filter((c) => c.probeId === probe.id)}
              onDismissCandidate={(id) =>
                setDismissed((prev) => new Set(prev).add(id))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
