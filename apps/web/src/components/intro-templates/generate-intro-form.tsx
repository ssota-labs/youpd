'use client';

import { useState } from 'react';
import type { IntroTemplateDetail } from '@youpd/types';
import { Button } from '@youpd/ui/components/ui/button';
import { Label } from '@youpd/ui/components/ui/label';
import { Textarea } from '@youpd/ui/components/ui/textarea';

type GenerateIntroFormProps = {
  template: IntroTemplateDetail;
};

export function GenerateIntroForm({ template }: GenerateIntroFormProps) {
  const [userBrief, setUserBrief] = useState('');
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/intro-templates/${template.id}/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userBrief }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? '인트로 생성에 실패했습니다.');
        setDraft(null);
        return;
      }
      setDraft(data.draftText ?? null);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
      setDraft(null);
    } finally {
      setLoading(false);
    }
  }

  async function copyDraft() {
    if (!draft) return;
    await navigator.clipboard.writeText(draft);
  }

  return (
    <form onSubmit={handleGenerate} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="intro-brief">이번 영상 브리프</Label>
        <Textarea
          id="intro-brief"
          value={userBrief}
          onChange={(event) => setUserBrief(event.target.value)}
          placeholder="주제, 타깃, 강조할 포인트를 입력하세요."
          rows={5}
          required
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={loading || !userBrief.trim()}>
          {loading ? '생성 중…' : '인트로 초안 생성'}
        </Button>
        {draft ? (
          <Button type="button" variant="outline" onClick={() => void copyDraft()}>
            복사
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {draft ? (
        <pre className="whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-4 text-sm">
          {draft}
        </pre>
      ) : null}
    </form>
  );
}
