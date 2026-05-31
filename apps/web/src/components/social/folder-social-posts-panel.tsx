'use client';

import Link from 'next/link';
import type { ReferenceFolderSocialPostItem } from '@youpd/types';

type FolderSocialPostsPanelProps = {
  folderId: string;
  socialPosts: ReferenceFolderSocialPostItem[];
};

export function FolderSocialPostsPanel({
  folderId,
  socialPosts,
}: FolderSocialPostsPanelProps) {
  if (socialPosts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        이 폴더에 저장된 소셜 포스트가 없습니다.{' '}
        <Link href="/social" className="underline">
          Social
        </Link>
        에서 포스트를 저장하세요.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {socialPosts.map((item) => (
        <li key={item.id} className="px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <Link
                href={`/social/posts/${item.socialPostId}`}
                className="font-medium hover:underline"
              >
                @{item.authorHandle}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">{item.textPreview}</p>
              {item.saveReason ? (
                <p className="mt-1 text-xs text-muted-foreground">메모: {item.saveReason}</p>
              ) : null}
            </div>
            <a
              href={item.permalink}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted-foreground underline"
            >
              원문
            </a>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {item.lineage.performanceGrade} / {item.lineage.engagementGrade} /{' '}
            {item.lineage.recencyGrade} · {item.lineage.policyVersion}
          </p>
        </li>
      ))}
    </ul>
  );
}
