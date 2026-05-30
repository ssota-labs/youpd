'use client';

import { useState } from 'react';
import { Button } from '@youpd/ui/components/ui/button';
import type { HomeFeedResponse, HomeOnboarding } from '@youpd/types';

type OnboardingFormProps = {
  initial?: HomeOnboarding | null;
  onSaved: (feed: HomeFeedResponse, stubBanner?: boolean) => void;
};

export function OnboardingForm({ initial, onSaved }: OnboardingFormProps) {
  const [interestTopics, setInterestTopics] = useState(initial?.interestTopics ?? '');
  const [channelDescription, setChannelDescription] = useState(
    initial?.channelDescription ?? '',
  );
  const [ownChannelUrl, setOwnChannelUrl] = useState('');
  const [referenceUrls, setReferenceUrls] = useState('');
  const [excludedTopics, setExcludedTopics] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function buildPayload() {
    const referenceChannelUrls = referenceUrls
      .split(/[\n,]+/)
      .map((url) => url.trim())
      .filter(Boolean);
    const excluded = excludedTopics
      .split(/[\n,]+/)
      .map((topic) => topic.trim())
      .filter(Boolean);

    return {
      interestTopics,
      channelDescription,
      ownChannelUrl: ownChannelUrl.trim() || undefined,
      referenceChannelUrls,
      excludedTopics: excluded,
      preferredRegionCode: 'KR',
      autoRunHarvest: false,
    };
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const payload = buildPayload();

      const generateRes = await fetch('/api/probes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (generateRes.ok) {
        const body = (await generateRes.json()) as {
          feed: HomeFeedResponse;
          stubBanner?: boolean;
        };
        onSaved(body.feed, body.stubBanner);
        return;
      }

      if (generateRes.status !== 401) {
        const body = (await generateRes.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? `생성 실패 (${generateRes.status})`);
      }

      const res = await fetch('/api/home/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `저장 실패 (${res.status})`);
      }
      const feed = (await res.json()) as HomeFeedResponse;
      onSaved(feed, feed.source === 'fixture');
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패');
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border bg-card p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold">관심 주제와 채널 맥락</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        SEO 검색 키워드가 아니라, 어떤 시청자·문제·소비 단계의 YouTube 레퍼런스 풀을
        찾을지 알려주세요.
      </p>

      <label htmlFor="interest-topics" className="mt-4 flex flex-col gap-1 text-sm">
        <span className="font-medium">관심 주제</span>
        <textarea
          id="interest-topics"
          required
          rows={3}
          value={interestTopics}
          onChange={(e) => setInterestTopics(e.target.value)}
          placeholder="예: 엑셀 자동화, 1인 기업 노션 운영, 쇼츠 기획"
          className="rounded-md border border-input bg-transparent px-3 py-2"
        />
      </label>

      <label htmlFor="channel-description" className="mt-3 flex flex-col gap-1 text-sm">
        <span className="font-medium">채널 설명</span>
        <textarea
          id="channel-description"
          required
          rows={4}
          value={channelDescription}
          onChange={(e) => setChannelDescription(e.target.value)}
          placeholder="채널 포지션, 타깃, 다루는 문제·목표를 짧게 적어주세요."
          className="rounded-md border border-input bg-transparent px-3 py-2"
        />
      </label>

      <label htmlFor="own-channel-url" className="mt-3 flex flex-col gap-1 text-sm">
        <span className="font-medium">내 채널 URL (선택)</span>
        <input
          id="own-channel-url"
          type="url"
          value={ownChannelUrl}
          onChange={(e) => setOwnChannelUrl(e.target.value)}
          placeholder="https://www.youtube.com/@..."
          className="rounded-md border border-input bg-transparent px-3 py-2"
        />
      </label>

      <label htmlFor="reference-urls" className="mt-3 flex flex-col gap-1 text-sm">
        <span className="font-medium">참고 채널 URL (선택, 쉼표/줄바꿈)</span>
        <textarea
          id="reference-urls"
          rows={2}
          value={referenceUrls}
          onChange={(e) => setReferenceUrls(e.target.value)}
          placeholder="참고할 채널 링크"
          className="rounded-md border border-input bg-transparent px-3 py-2"
        />
      </label>

      <label htmlFor="excluded-topics" className="mt-3 flex flex-col gap-1 text-sm">
        <span className="font-medium">제외 주제 (선택)</span>
        <input
          id="excluded-topics"
          value={excludedTopics}
          onChange={(e) => setExcludedTopics(e.target.value)}
          placeholder="예: 게임, 먹방"
          className="rounded-md border border-input bg-transparent px-3 py-2"
        />
      </label>

      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}

      <Button type="submit" className="mt-4" disabled={pending}>
        {pending ? '생성 중…' : '프로브 추천 받기'}
      </Button>
    </form>
  );
}
