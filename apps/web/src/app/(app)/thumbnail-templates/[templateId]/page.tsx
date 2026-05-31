import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ThumbnailTemplatesError,
  getThumbnailTemplateDetail,
} from '@youpd/api/thumbnail-templates';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { ObservedAxesChips } from '@/components/thumbnail-templates/observed-axes-chips';
import { SkeletonPreview } from '@/components/thumbnail-templates/skeleton-preview';
import { Badge } from '@youpd/ui/components/ui/badge';
import { Button } from '@youpd/ui/components/ui/button';

type PageProps = {
  params: Promise<{ templateId: string }>;
};

export default async function ThumbnailTemplateDetailPage({ params }: PageProps) {
  await requireSessionUserId();
  const { templateId } = await params;

  let detail;
  try {
    detail = await getThumbnailTemplateDetail(templateId);
  } catch (error) {
    if (error instanceof ThumbnailTemplatesError && error.code === 'NOT_FOUND') {
      notFound();
    }
    throw error;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        <Link
          href="/thumbnail-templates"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← 라이브러리
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">{detail.name}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{detail.useWhen}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {detail.primaryCategory ? (
            <Badge variant="secondary">{detail.primaryCategory.name}</Badge>
          ) : null}
          {detail.tags.map((tag) => (
            <Badge key={tag.code} variant="outline">
              {tag.name}
            </Badge>
          ))}
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:px-8">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold">스켈레톤</h2>
          <SkeletonPreview skeleton={detail.skeleton} />
          <p className="text-sm text-muted-foreground">{detail.summary}</p>
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold">슬롯</h2>
            <div className="mt-2 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 font-medium">키</th>
                    <th className="px-3 py-2 font-medium">라벨</th>
                    <th className="px-3 py-2 font-medium">타입</th>
                    <th className="px-3 py-2 font-medium">필수</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.slotSchema.slots.map((slot) => (
                    <tr key={slot.key} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-mono text-xs">{slot.key}</td>
                      <td className="px-3 py-2">{slot.label}</td>
                      <td className="px-3 py-2">{slot.type}</td>
                      <td className="px-3 py-2">{slot.required ? '예' : '아니오'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold">프롬프트 스캐폴드</h2>
            <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-xs leading-relaxed">
              {detail.promptScaffold}
            </pre>
          </div>
        </section>
      </div>

      <section className="mx-auto max-w-6xl space-y-4 px-4 sm:px-6 lg:px-8">
        <h2 className="text-sm font-semibold">레퍼런스 증거 ({detail.references.length})</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {detail.references.map((ref) => (
            <li
              key={ref.videoId}
              className="rounded-lg border border-border bg-card p-4 shadow-sm"
            >
              {ref.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ref.thumbnailUrl}
                  alt=""
                  className="mb-3 aspect-video w-full rounded-md object-cover"
                />
              ) : null}
              <p className="line-clamp-2 text-sm font-medium">{ref.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{ref.channelTitle}</p>
              <div className="mt-3">
                <ObservedAxesChips axes={ref.observedAxes} />
              </div>
              {ref.lineage ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  성과 등급: {ref.lineage.performanceGrade}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl justify-end">
          <Button asChild>
            <Link href={`/thumbnail-create?templateId=${detail.id}`}>
              이 템플릿으로 썸네일 제작
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
