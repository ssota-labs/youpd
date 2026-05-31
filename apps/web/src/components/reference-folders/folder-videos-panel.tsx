'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ReferenceFolderVideoItem } from '@youpd/types';
import { Button } from '@youpd/ui/components/ui/button';
import { gradeLabelKo } from '@/lib/video-search/format';
import { IntroExtractActions } from '@/components/reference-folders/intro-extract-actions';

type FolderVideosPanelProps = {
  folderId: string;
  groupId: string;
  videos: ReferenceFolderVideoItem[];
};

export function FolderVideosPanel({
  folderId,
  groupId,
  videos: initialVideos,
}: FolderVideosPanelProps) {
  const router = useRouter();
  const [videos, setVideos] = useState(initialVideos);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleRemove(itemId: string) {
    if (!window.confirm('이 폴더에서 영상을 제거할까요?')) return;
    setRemovingId(itemId);
    const res = await fetch(
      `/api/reference-folders/${folderId}/videos/${itemId}`,
      { method: 'DELETE' },
    );
    setRemovingId(null);
    if (!res.ok) return;
    setVideos((current) => current.filter((v) => v.id !== itemId));
    router.refresh();
  }

  if (videos.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
        아직 저장된 영상이 없습니다.{' '}
        <Link href="/keywords" className="underline">
          키워드 수확
        </Link>
        에서 레퍼런스에 저장하세요.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {videos.map((item) => (
        <li
          key={item.id}
          className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm sm:flex-row"
        >
          <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-md bg-muted sm:h-20 sm:w-36">
            {item.thumbnailUrl ? (
              <Image
                src={item.thumbnailUrl}
                alt={item.title}
                fill
                className="object-cover"
                sizes="144px"
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <Link
                href={`https://www.youtube.com/watch?v=${item.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:text-primary"
              >
                {item.title}
              </Link>
              <p className="text-xs text-muted-foreground">{item.channelTitle}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              키워드 {item.lineage.sourceKeyword} · 순위 {item.lineage.keywordRank}{' '}
              · 성과 {gradeLabelKo(item.lineage.performanceGrade)} · 기여{' '}
              {gradeLabelKo(item.lineage.contributionGrade)}
            </p>
            {item.saveReason ? (
              <p className="text-sm text-muted-foreground">{item.saveReason}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-start gap-2 sm:flex-col">
            <IntroExtractActions folderId={folderId} itemId={item.id} />
            <Button variant="outline" size="sm" asChild>
              <Link href={`/references/groups/${groupId}`}>그룹</Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={removingId === item.id}
              onClick={() => void handleRemove(item.id)}
            >
              {removingId === item.id ? '제거 중…' : '제거'}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
