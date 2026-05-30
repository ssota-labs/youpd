import Link from 'next/link';
import { requireSessionUserId } from '@/lib/auth/require-session-user';

type PageProps = {
  searchParams: Promise<{ templateId?: string }>;
};

export default async function ThumbnailCreatePage({ searchParams }: PageProps) {
  await requireSessionUserId();
  const { templateId } = await searchParams;

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <h1 className="text-xl font-semibold">썸네일 제작 (준비 중)</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        S6에서 슬롯 기반 생성 플로우가 연결됩니다.
        {templateId ? (
          <>
            {' '}
            선택된 템플릿 ID: <code className="text-xs">{templateId}</code>
          </>
        ) : null}
      </p>
      <Link
        href="/thumbnail-templates"
        className="mt-6 inline-block text-sm text-primary underline-offset-4 hover:underline"
      >
        템플릿 라이브러리로 돌아가기
      </Link>
    </div>
  );
}
