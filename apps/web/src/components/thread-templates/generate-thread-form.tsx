'use client';

import { useState } from 'react';
import type { ThreadTemplateDetail } from '@youpd/types';
import { Button } from '@youpd/ui/components/ui/button';
import { Input } from '@youpd/ui/components/ui/input';
import { Label } from '@youpd/ui/components/ui/label';
import { Textarea } from '@youpd/ui/components/ui/textarea';
import { Badge } from '@youpd/ui/components/ui/badge';

type GenerateThreadFormProps = {
  template: ThreadTemplateDetail;
};

export function GenerateThreadForm({ template }: GenerateThreadFormProps) {
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [contextNotes, setContextNotes] = useState('');
  const [draft, setDraft] = useState<string | null>(null);
  const [parts, setParts] = useState<Array<{ index: number; text: string }> | null>(
    null,
  );
  const [generator, setGenerator] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/thread-templates/${template.id}/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, audience: audience || undefined, contextNotes }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? '스레드 생성에 실패했습니다.');
        setDraft(null);
        setParts(null);
        return;
      }
      setDraft(data.draftText ?? null);
      setParts(data.parts ?? null);
      setGenerator(data.lineage?.generator ?? null);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
      setDraft(null);
      setParts(null);
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
        <Label htmlFor="thread-topic">주제</Label>
        <Textarea
          id="thread-topic"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="이번 스레드의 핵심 주제와 메시지"
          rows={4}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="thread-audience">타깃 (선택)</Label>
        <Input
          id="thread-audience"
          value={audience}
          onChange={(event) => setAudience(event.target.value)}
          placeholder="예: 1인 크리에이터, 마케터"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="thread-context">추가 맥락 (선택)</Label>
        <Textarea
          id="thread-context"
          value={contextNotes}
          onChange={(event) => setContextNotes(event.target.value)}
          placeholder="참고할 사례, 금지 표현, 톤 등"
          rows={2}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={loading || !topic.trim()}>
          {loading ? '생성 중…' : '스레드 초안 생성'}
        </Button>
        {draft ? (
          <Button type="button" variant="outline" onClick={() => void copyDraft()}>
            전체 복사
          </Button>
        ) : null}
      </div>
      {generator === 'deterministic' ? (
        <Badge variant="outline">기본 뼈대</Badge>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {parts && parts.length > 0 ? (
        <ol className="space-y-2">
          {parts.map((part) => (
            <li
              key={part.index}
              className="rounded-lg border border-border bg-muted/40 p-3 text-sm"
            >
              <p className="text-xs text-muted-foreground">Part {part.index}</p>
              <p className="mt-1 whitespace-pre-wrap">{part.text}</p>
            </li>
          ))}
        </ol>
      ) : draft ? (
        <pre className="whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-4 text-sm">
          {draft}
        </pre>
      ) : null}
    </form>
  );
}
