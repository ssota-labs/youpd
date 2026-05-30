import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getReferenceGroup } from '@youpd/api/reference-folders';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { consumerStageLabel } from '@/lib/reference-folders/stage-labels';

type PageProps = {
  params: Promise<{ groupId: string }>;
};

export default async function ReferenceGroupPage({ params }: PageProps) {
  const { groupId } = await params;
  const userId = await requireSessionUserId();

  let group;
  try {
    group = await getReferenceGroup(userId, groupId);
  } catch {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        <Link
          href="/references"
          className="text-sm text-muted-foreground underline"
        >
          ← 레퍼런스 목록
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">
          {group.title}
        </h1>
        <dl className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <div>
            <dt className="font-medium text-foreground">타깃</dt>
            <dd>{group.audience}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">시드 테마</dt>
            <dd>{group.seedTheme}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-medium text-foreground">기획 의도</dt>
            <dd>{group.intentSummary}</dd>
          </div>
        </dl>
      </header>

      <div className="px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        <h2 className="text-sm font-semibold">폴더 ({group.folders.length})</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {group.folders
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((folder) => (
              <li key={folder.id}>
                <Link
                  href={`/references/folders/${folder.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm transition-colors hover:border-primary/40"
                >
                  <div>
                    <p className="font-medium">{folder.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {consumerStageLabel(folder.consumerStage)}
                      {folder.isUnspecified ? ' · 미지정' : null}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {folder.videoCount}개
                  </span>
                </Link>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
