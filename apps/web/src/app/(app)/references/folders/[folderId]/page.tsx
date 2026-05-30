import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFolderWithVideos, getReferenceGroup } from '@youpd/api/reference-folders';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { FolderVideosPanel } from '@/components/reference-folders/folder-videos-panel';
import { consumerStageLabel } from '@/lib/reference-folders/stage-labels';

type PageProps = {
  params: Promise<{ folderId: string }>;
};

export default async function ReferenceFolderPage({ params }: PageProps) {
  const { folderId } = await params;
  const userId = await requireSessionUserId();

  let folder;
  try {
    folder = await getFolderWithVideos(userId, folderId);
  } catch {
    notFound();
  }

  let groupTitle = '그룹';
  try {
    const group = await getReferenceGroup(userId, folder.groupId);
    groupTitle = group.title;
  } catch {
    // group may be inaccessible; folder view still works
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        <Link
          href={`/references/groups/${folder.groupId}`}
          className="text-sm text-muted-foreground underline"
        >
          ← {groupTitle}
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">
          {folder.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {consumerStageLabel(folder.consumerStage)} · {folder.videos.length}개
          영상
        </p>
      </header>

      <div className="px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        <FolderVideosPanel
          folderId={folder.folderId}
          groupId={folder.groupId}
          videos={folder.videos}
        />
      </div>
    </div>
  );
}
