'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@youpd/ui/components/ui/button';
import { Input } from '@youpd/ui/components/ui/input';
import { Label } from '@youpd/ui/components/ui/label';
import type { SocialPostSummary, SocialSourceSummary } from '@youpd/types';

const PROVIDER_LABEL: Record<string, string> = {
  manual: '수동 URL',
  threads: 'Threads',
  x_bookmarks: 'X 북마크',
};

const STATUS_LABEL: Record<string, string> = {
  not_configured: '미구성',
  configured: '연동됨',
  error: '오류',
  disabled: '비활성',
};

export function SocialHub() {
  const router = useRouter();
  const [sources, setSources] = useState<SocialSourceSummary[]>([]);
  const [posts, setPosts] = useState<SocialPostSummary[]>([]);
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const [sourcesRes, postsRes] = await Promise.all([
      fetch('/api/social/sources'),
      fetch('/api/social/posts'),
    ]);
    if (sourcesRes.ok) {
      const data = (await sourcesRes.json()) as { sources: SocialSourceSummary[] };
      setSources(data.sources);
    }
    if (postsRes.ok) {
      const data = (await postsRes.json()) as { posts: SocialPostSummary[] };
      setPosts(data.posts);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleIngestUrl() {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    const res = await fetch('/api/social/ingest-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.trim() }),
    });
    setLoading(false);
    if (!res.ok) {
      const payload = (await res.json()) as { error?: string };
      setError(payload.error ?? 'URL 저장에 실패했습니다');
      return;
    }
    const data = (await res.json()) as { post: { id: string } };
    setUrl('');
    router.push(`/social/posts/${data.post.id}`);
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-medium">URL로 저장</h2>
        <p className="text-sm text-muted-foreground">
          Threads 또는 X 공개 URL을 붙여넣으세요. API 키 없이도 로컬 픽스처로 동작합니다.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.threads.net/..."
            className="flex-1"
          />
          <Button type="button" onClick={() => void handleIngestUrl()} disabled={loading}>
            {loading ? '저장 중…' : '저장'}
          </Button>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">연동 상태</h2>
        <ul className="grid gap-2 sm:grid-cols-3">
          {sources.map((source) => (
            <li
              key={source.provider}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              <p className="font-medium">{PROVIDER_LABEL[source.provider] ?? source.provider}</p>
              <p className="text-muted-foreground">
                {STATUS_LABEL[source.connectionStatus] ?? source.connectionStatus}
              </p>
              {source.provider !== 'manual' && source.connectionStatus === 'not_configured' ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  URL을 직접 붙여넣을 수 있습니다.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">최근 포스트</h2>
          <Button type="button" variant="ghost" size="sm" onClick={() => void refresh()}>
            새로고침
          </Button>
        </div>
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            아직 저장된 소셜 포스트가 없습니다. 위에서 URL을 붙여넣어 시작하세요.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {posts.map((post) => (
              <li key={post.id} className="px-4 py-3">
                <Link href={`/social/posts/${post.id}`} className="block hover:underline">
                  <p className="font-medium">@{post.authorHandle}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{post.textPreview}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {post.latestGrades.performance} / {post.latestGrades.engagement} /{' '}
                    {post.latestGrades.recency}
                    {post.ingestMode === 'manual' ? ' · 수동 입력' : null}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2 border-t border-border pt-6">
        <Label className="text-muted-foreground">수동 입력이 필요할 때</Label>
        <p className="text-sm text-muted-foreground">
          URL 가져오기가 실패하면 포스트 상세에서 수동 필드를 사용하거나{' '}
          <code className="text-xs">POST /api/social/ingest-manual</code>을 호출하세요.
        </p>
      </section>
    </div>
  );
}
