import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ThreadTemplatesError,
  getThreadTemplateDetail,
} from '@youpd/api/thread-templates';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { GenerateThreadForm } from '@/components/thread-templates/generate-thread-form';
import { ThreadSlotOrderPreview } from '@/components/thread-templates/slot-order-preview';
import { Badge } from '@youpd/ui/components/ui/badge';

type PageProps = {
  params: Promise<{ templateId: string }>;
};

export default async function ThreadTemplateDetailPage({ params }: PageProps) {
  await requireSessionUserId();
  const { templateId } = await params;

  let detail;
  try {
    detail = await getThreadTemplateDetail(templateId);
  } catch (error) {
    if (error instanceof ThreadTemplatesError && error.code === 'NOT_FOUND') {
      notFound();
    }
    throw error;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        <Link
          href="/thread-templates"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← 스레드 라이브러리
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">{detail.name}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{detail.useWhen}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {detail.primaryCategory ? (
            <Badge variant="secondary">{detail.primaryCategory.name}</Badge>
          ) : null}
          {detail.structureType ? (
            <Badge variant="outline">{detail.structureType}</Badge>
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
          <h2 className="text-sm font-semibold">슬롯 순서</h2>
          <ThreadSlotOrderPreview skeleton={detail.skeleton} />
          <p className="text-sm text-muted-foreground">{detail.summary}</p>

          {detail.examples.length > 0 ? (
            <div>
              <h2 className="text-sm font-semibold">예시</h2>
              <ul className="mt-2 space-y-2">
                {detail.examples.map((example) => (
                  <li
                    key={example.label}
                    className="rounded-lg border border-border bg-card p-3 text-sm"
                  >
                    <p className="text-xs text-muted-foreground">{example.label}</p>
                    <pre className="mt-1 whitespace-pre-wrap font-sans text-sm">
                      {example.filledThreadText}
                    </pre>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold">스레드 초안 생성</h2>
            <div className="mt-3">
              <GenerateThreadForm template={detail} />
            </div>
          </div>
        </section>
      </div>

      {detail.evidence.length > 0 ? (
        <section className="mx-auto max-w-6xl space-y-4 px-4 pb-12 sm:px-6 lg:px-8">
          <h2 className="text-sm font-semibold">레퍼런스 소셜 증거</h2>
          <ul className="grid gap-3 lg:grid-cols-2">
            {detail.evidence.map((row) => (
              <li
                key={row.evidenceId}
                className="rounded-lg border border-border bg-card p-4 text-sm"
              >
                <p className="font-medium">@{row.authorHandle}</p>
                <p className="mt-2 line-clamp-3 text-muted-foreground">{row.excerptText}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">{row.structureType}</Badge>
                  <Badge variant="outline">{row.sourceMode}</Badge>
                </div>
                <a
                  href={row.permalink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs text-muted-foreground underline"
                >
                  원문 보기
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
