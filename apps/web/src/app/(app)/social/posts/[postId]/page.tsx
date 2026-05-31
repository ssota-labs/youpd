import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSocialPost } from '@youpd/api/social';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { SaveSocialReferenceButton } from '@/components/social/save-social-reference-button';

type PageProps = {
  params: Promise<{ postId: string }>;
};

export default async function SocialPostDetailPage({ params }: PageProps) {
  const { postId } = await params;
  const userId = await requireSessionUserId();
  const post = await getSocialPost(userId, postId);
  if (!post) notFound();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        <Link href="/social" className="text-sm text-muted-foreground underline">
          ← Social
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">@{post.authorHandle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {post.provider}
          {post.ingestMode === 'manual' ? ' · 수동 입력' : null}
          {post.fetchStatus === 'user_provided' ? ' · 사용자 제공' : null}
        </p>
        <div className="mt-4">
          <SaveSocialReferenceButton socialPostId={post.id} />
        </div>
      </header>

      <div className="space-y-8 px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        <section>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.textContent}</p>
          <a
            href={post.permalink}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-sm text-muted-foreground underline"
          >
            원문 보기
          </a>
        </section>

        {post.latestScore ? (
          <section className="space-y-2">
            <h2 className="text-lg font-medium">점수</h2>
            <p className="text-sm text-muted-foreground">
              성과 {post.latestScore.performanceGrade} · 참여{' '}
              {post.latestScore.engagementGrade} · 최신성 {post.latestScore.recencyGrade}
              {post.latestScore.rankScore !== null
                ? ` · rank ${post.latestScore.rankScore}`
                : null}
            </p>
          </section>
        ) : null}

        <section className="space-y-2">
          <h2 className="text-lg font-medium">메트릭 이력</h2>
          {post.metricSnapshots.length === 0 ? (
            <p className="text-sm text-muted-foreground">스냅샷 없음</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {post.metricSnapshots.map((snap) => (
                <li key={snap.id} className="rounded-md border border-border px-3 py-2">
                  <p className="text-muted-foreground">{snap.capturedAt}</p>
                  <pre className="mt-1 overflow-x-auto text-xs">
                    {JSON.stringify(snap.metrics, null, 2)}
                  </pre>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
