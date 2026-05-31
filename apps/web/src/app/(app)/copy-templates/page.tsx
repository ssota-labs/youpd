import Link from 'next/link';
import {
  listCopyTemplateCategories,
  listCopyTemplateTags,
  listCopyTemplates,
} from '@youpd/api/copy-templates';
import { TitleHookTypeSchema } from '@youpd/types';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { LibraryFilters } from '@/components/copy-templates/library-filters';
import { CopyTemplateSearchForm } from '@/components/copy-templates/search-form';
import { CopyTemplateCardView } from '@/components/copy-templates/template-card';

type PageProps = {
  searchParams: Promise<{
    category?: string;
    tag?: string;
    hookType?: string;
    q?: string;
  }>;
};

export default async function CopyTemplatesPage({ searchParams }: PageProps) {
  await requireSessionUserId();
  const params = await searchParams;
  const hookType =
    params.hookType && TitleHookTypeSchema.safeParse(params.hookType).success
      ? TitleHookTypeSchema.parse(params.hookType)
      : undefined;

  const [categories, tags, list] = await Promise.all([
    listCopyTemplateCategories(),
    listCopyTemplateTags(),
    listCopyTemplates({
      category: params.category,
      tag: params.tag,
      hookType,
      q: params.q,
      limit: 24,
    }),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        <h1 className="text-xl font-semibold tracking-tight">카피 템플릿 라이브러리</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          관찰된 제목 증거와 재사용 가능한 문장 구조를 분리해 탐색합니다. 썸네일 템플릿과
          many-to-many로 조합할 수 있습니다.
        </p>
      </header>

      <div className="grid gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8 xl:px-10">
        <LibraryFilters
          categories={categories}
          tags={tags}
          activeCategory={params.category}
          activeTag={params.tag}
          activeHookType={params.hookType}
          q={params.q}
        />

        <div className="space-y-6">
          <CopyTemplateSearchForm
            defaultQuery={params.q}
            activeCategory={params.category}
            activeTag={params.tag}
            activeHookType={params.hookType}
          />

          {list.templates.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-8 text-sm text-muted-foreground">
              <p>조건에 맞는 카피 템플릿이 없습니다.</p>
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
                  <CopyTemplateCardView template={template} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
