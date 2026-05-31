import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  IntroTemplatesError,
  getIntroTemplateDetail,
} from '@youpd/api/intro-templates';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { GenerateIntroForm } from '@/components/intro-templates/generate-intro-form';
import { SlotOrderPreview } from '@/components/intro-templates/slot-order-preview';
import { Badge } from '@youpd/ui/components/ui/badge';

type PageProps = {
  params: Promise<{ templateId: string }>;
};

export default async function IntroTemplateDetailPage({ params }: PageProps) {
  await requireSessionUserId();
  const { templateId } = await params;

  let detail;
  try {
    detail = await getIntroTemplateDetail(templateId);
  } catch (error) {
    if (error instanceof IntroTemplatesError && error.code === 'NOT_FOUND') {
      notFound();
    }
    throw error;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        <Link
          href="/intro-templates"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← 인트로 라이브러리
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
          <h2 className="text-sm font-semibold">슬롯 순서</h2>
          <SlotOrderPreview skeleton={detail.skeleton} />
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
                      {example.filledIntro}
                    </pre>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold">인트로 초안 생성</h2>
            <div className="mt-3">
              <GenerateIntroForm template={detail} />
            </div>
          </div>
        </section>
      </div>

      {detail.evidence.length > 0 ? (
        <section className="mx-auto max-w-6xl space-y-4 px-4 pb-12 sm:px-6 lg:px-8">
          <h2 className="text-sm font-semibold">레퍼런스 인트로 증거</h2>
          <ul className="grid gap-3 lg:grid-cols-2">
            {detail.evidence.map((row) => (
              <li
                key={row.segmentId}
                className="rounded-lg border border-border bg-card p-4 text-sm"
              >
                <p className="font-medium">{row.title}</p>
                {row.channelTitle ? (
                  <p className="text-xs text-muted-foreground">{row.channelTitle}</p>
                ) : null}
                <p className="mt-2 line-clamp-3 text-muted-foreground">{row.excerptText}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">{row.sourceMode}</Badge>
                  {row.lineage?.performanceGrade ? (
                    <Badge variant="outline">{row.lineage.performanceGrade}</Badge>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
