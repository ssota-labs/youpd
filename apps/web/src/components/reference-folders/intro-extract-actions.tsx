'use client';

import { useState } from 'react';
import { Button } from '@youpd/ui/components/ui/button';

type IntroExtractActionsProps = {
  folderId: string;
  itemId: string;
};

export function IntroExtractActions({ folderId, itemId }: IntroExtractActionsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleExtract() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/reference-folders/${folderId}/videos/${itemId}/intro-segments/extract`,
        { method: 'POST' },
      );
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? '추출에 실패했습니다.');
        return;
      }
      setMessage('인트로 구조를 추출했습니다.');
    } catch {
      setMessage('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={() => void handleExtract()}
      >
        {loading ? '추출 중…' : '인트로 구조 추출'}
      </Button>
      {message ? (
        <p className="max-w-[12rem] text-xs text-muted-foreground">{message}</p>
      ) : null}
    </div>
  );
}
