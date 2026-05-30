'use client';

import { useState } from 'react';
import { Button } from '@youpd/ui/components/ui/button';
import type { HomeOnboarding } from '@youpd/types';

type OnboardingFormProps = {
  initial?: HomeOnboarding | null;
  onSaved: () => void;
};

export function OnboardingForm({ initial, onSaved }: OnboardingFormProps) {
  const [interestTopics, setInterestTopics] = useState(initial?.interestTopics ?? '');
  const [channelDescription, setChannelDescription] = useState(
    initial?.channelDescription ?? '',
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/home/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interestTopics, channelDescription }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `저장 실패 (${res.status})`);
      }
      onSaved();
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

      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}

      <Button type="submit" className="mt-4" disabled={pending}>
        {pending ? '저장 중…' : '추천 프로브 받기'}
      </Button>
    </form>
  );
}
