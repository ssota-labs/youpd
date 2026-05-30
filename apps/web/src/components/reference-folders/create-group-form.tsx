'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@youpd/ui/components/ui/button';
import { Input } from '@youpd/ui/components/ui/input';
import { Label } from '@youpd/ui/components/ui/label';
import { Textarea } from '@youpd/ui/components/ui/textarea';

export function CreateReferenceGroupForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    setLoading(true);
    setError(null);
    const res = await fetch('/api/reference-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: String(form.get('title')),
        audience: String(form.get('audience')),
        seedTheme: String(form.get('seedTheme')),
        intentSummary: String(form.get('intentSummary')),
        seedStageFolders: form.get('seedStageFolders') === 'on',
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const payload = (await res.json()) as { error?: string };
      setError(payload.error ?? '그룹 생성에 실패했습니다');
      return;
    }
    formEl.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">새 레퍼런스 그룹</h2>
      <div className="space-y-2">
        <Label htmlFor="title">제목</Label>
        <Input id="title" name="title" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="audience">타깃</Label>
        <Textarea id="audience" name="audience" required rows={2} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="seedTheme">시드 테마</Label>
        <Textarea id="seedTheme" name="seedTheme" required rows={2} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="intentSummary">기획 의도</Label>
        <Textarea id="intentSummary" name="intentSummary" required rows={3} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="seedStageFolders" defaultChecked />
        소비자 단계 폴더 7개 자동 생성
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={loading}>
        {loading ? '생성 중…' : '그룹 만들기'}
      </Button>
    </form>
  );
}
