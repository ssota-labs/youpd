import {
  listThumbnailTemplateCategories,
  listThumbnailTemplateTags,
  listThumbnailTemplates,
} from '@youpd/api/thumbnail-templates';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { LibraryFilters } from '@/components/thumbnail-templates/library-filters';
import { ThumbnailTemplateSearchForm } from '@/components/thumbnail-templates/search-form';
import { TemplateCard } from '@/components/thumbnail-templates/template-card';
import Link from 'next/link';

type PageProps = {
  searchParams: Promise<{
    category?: string;
    tag?: string;
    q?: string;
  }>;
};

export default async function ThumbnailTemplatesPage({ searchParams }: PageProps) {
  await requireSessionUserId();
  const params = await searchParams;

  const [categories, tags, list] = await Promise.all([
    listThumbnailTemplateCategories(),
    listThumbnailTemplateTags(),
    listThumbnailTemplates({
      category: params.category,
      tag: params.tag,
      q: params.q,
      limit: 24,
    }),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        <h1 className="text-xl font-semibold tracking-tight">썸네일 템플릿 라이브러리</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          성과 레퍼런스에서 추출한 재사용 가능한 썸네일 구조를 탐색합니다. 카테고리·태그로
          고르고, 상세에서 슬롯·프롬프트·증거 영상을 확인하세요.
        </p>
      </header>

      <div className="grid gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8 xl:px-10">
        <LibraryFilters
          categories={categories}
          tags={tags}
          activeCategory={params.category}
          activeTag={params.tag}
          q={params.q}
        />

        <div className="space-y-6">
          <ThumbnailTemplateSearchForm
            defaultQuery={params.q}
            activeCategory={params.category}
            activeTag={params.tag}
          />

          {list.templates.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-8 text-sm text-muted-foreground">
              <p>조건에 맞는 템플릿이 없습니다.</p>
              <p className="mt-2">
                <Link href="/references" className="text-primary underline-offset-4 hover:underline">
                  레퍼런스 폴더
                </Link>
                에서 영상을 저장한 뒤 다시 시도하거나 필터를 초기화하세요.
              </p>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {list.templates.map((template) => (
                <li key={template.id}>
                  <TemplateCard template={template} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
