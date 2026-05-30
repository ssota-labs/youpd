import Link from 'next/link';
import { listReferenceGroups } from '@youpd/api/reference-folders';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { CreateReferenceGroupForm } from '@/components/reference-folders/create-group-form';

export default async function ReferencesPage() {
  const userId = await requireSessionUserId();
  const groups = await listReferenceGroups(userId);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        <h1 className="text-xl font-semibold tracking-tight">레퍼런스</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          키워드 수확·Hot Candidates에서 저장한 영상을 소비자 단계별 폴더로
          모읍니다.
        </p>
      </header>

      <div className="grid gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:px-8 xl:px-10">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold">내 그룹 ({groups.length})</h2>
          {groups.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
              아직 레퍼런스 그룹이 없습니다. 오른쪽에서 그룹을 만들거나 키워드
              수확 결과에서 영상을 저장하세요.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {groups.map((group) => (
                <li key={group.id}>
                  <Link
                    href={`/references/groups/${group.id}`}
                    className="block rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{group.title}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {group.intentSummary}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-xs text-muted-foreground">
                        <p>폴더 {group.folderCount}</p>
                        <p>영상 {group.videoCount}</p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside>
          <CreateReferenceGroupForm />
        </aside>
      </div>
    </div>
  );
}
