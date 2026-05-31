import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  CopyTemplatesError,
  getCopyTemplateDetail,
} from '@youpd/api/copy-templates';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { FillSlotsForm } from '@/components/copy-templates/fill-slots-form';
import { SkeletonPattern } from '@/components/copy-templates/skeleton-pattern';
import { TitleAxesChips } from '@/components/copy-templates/title-axes-chips';
import { Badge } from '@youpd/ui/components/ui/badge';
import { Button } from '@youpd/ui/components/ui/button';

type PageProps = {
  params: Promise<{ templateId: string }>;
};

export default async function CopyTemplateDetailPage({ params }: PageProps) {
  await requireSessionUserId();
  const { templateId } = await params;

  let detail;
  try {
    detail = await getCopyTemplateDetail(templateId);
  } catch (error) {
    if (error instanceof CopyTemplatesError && error.code === 'NOT_FOUND') {
      notFound();
    }
    throw error;
  }

  const primaryPairing = detail.thumbnailPairings[0];

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        <Link
          href="/copy-templates"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← 카피 라이브러리
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">{detail.name}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{detail.useWhen}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {detail.primaryCategory ? (
            <Badge variant="secondary">{detail.primaryCategory.name}</Badge>
          ) : null}
          {detail.hookType ? <Badge variant="outline">{detail.hookType}</Badge> : null}
          {detail.titleShape ? <Badge variant="outline">{detail.titleShape}</Badge> : null}
          {detail.tones.map((tone) => (
            <Badge key={tone} variant="outline">
              {tone}
            </Badge>
          ))}
          {detail.tags.map((tag) => (
            <Badge key={tag.code} variant="outline">
              {tag.name}
            </Badge>
          ))}
        </div>
        {detail.rationale ? (
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">{detail.rationale}</p>
        ) : null}
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:px-8">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold">문장 스켈레톤</h2>
          <SkeletonPattern skeleton={detail.skeleton} />
          <p className="text-sm text-muted-foreground">{detail.summary}</p>
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold">슬롯 채우기</h2>
            <div className="mt-3">
              <FillSlotsForm template={detail} />
            </div>
          </div>

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
                    <p className="mt-1 font-medium">{example.filledTitle}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>

      <section className="mx-auto max-w-6xl space-y-4 px-4 sm:px-6 lg:px-8">
        <h2 className="text-sm font-semibold">
          제목 증거 ({detail.titleEvidence.length})
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {detail.titleEvidence.map((row) => (
            <li
              key={row.analysisId}
              className="rounded-lg border border-border bg-card p-4 shadow-sm"
            >
              <p className="line-clamp-2 text-sm font-medium">{row.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{row.channelTitle}</p>
              <div className="mt-3">
                <TitleAxesChips axes={row.observedAxes} />
              </div>
              {row.lineage ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  성과 등급: {row.lineage.performanceGrade}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {detail.thumbnailPairings.length > 0 ? (
        <section className="mx-auto mt-10 max-w-6xl space-y-4 px-4 sm:px-6 lg:px-8">
          <h2 className="text-sm font-semibold">추천 썸네일 페어링</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {detail.thumbnailPairings.map((pairing) => (
              <li
                key={pairing.thumbnailTemplateId}
                className="rounded-lg border border-border bg-card p-4"
              >
                {pairing.previewImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pairing.previewImageUrl}
                    alt=""
                    className="mb-3 aspect-video w-full rounded-md object-cover"
                  />
                ) : null}
                <p className="text-sm font-medium">{pairing.name}</p>
                {pairing.pairingRationale ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {pairing.pairingRationale}
                  </p>
                ) : null}
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link
                    href={`/thumbnail-create?templateId=${pairing.thumbnailTemplateId}&copyTemplateId=${detail.id}`}
                  >
                    이 조합으로 제작
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-end gap-2">
          {primaryPairing ? (
            <Button asChild>
              <Link
                href={`/thumbnail-create?templateId=${primaryPairing.thumbnailTemplateId}&copyTemplateId=${detail.id}`}
              >
                이 구조 + 썸네일로 제작
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
