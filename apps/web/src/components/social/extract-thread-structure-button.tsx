'use client';

import { useState } from 'react';
import { Button } from '@youpd/ui/components/ui/button';
import { Badge } from '@youpd/ui/components/ui/badge';

type ExtractThreadStructureButtonProps = {
  socialPostId: string;
};

export function ExtractThreadStructureButton({
  socialPostId,
}: ExtractThreadStructureButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [structureType, setStructureType] = useState<string | null>(null);
  const [sourceMode, setSourceMode] = useState<string | null>(null);

  async function handleExtract() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/social/posts/${socialPostId}/structure-evidence`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? '구조 추출에 실패했습니다.');
        return;
      }
      setStructureType(data.structureType ?? null);
      setSourceMode(data.sourceMode ?? null);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" disabled={loading} onClick={() => void handleExtract()}>
        {loading ? '추출 중…' : '구조 추출'}
      </Button>
      {structureType ? (
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{structureType}</Badge>
          {sourceMode ? <Badge variant="outline">{sourceMode}</Badge> : null}
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
