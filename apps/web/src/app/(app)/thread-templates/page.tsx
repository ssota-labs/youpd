import Link from 'next/link';
import {
  listThreadTemplateCategories,
  listThreadTemplateTags,
  listThreadTemplates,
} from '@youpd/api/thread-templates';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { ThreadLibraryFilters } from '@/components/thread-templates/library-filters';
import { ThreadTemplateSearchForm } from '@/components/thread-templates/search-form';
import { ThreadTemplateCardView } from '@/components/thread-templates/template-card';

type PageProps = {
  searchParams: Promise<{
    category?: string;
    tag?: string;
    q?: string;
  }>;
};

export default async function ThreadTemplatesPage({ searchParams }: PageProps) {
  await requireSessionUserId();
  const params = await searchParams;

  const [categories, tags, list] = await Promise.all([
    listThreadTemplateCategories(),
    listThreadTemplateTags(),
    listThreadTemplates({
      category: params.category,
      tag: params.tag,
      q: params.q,
      limit: 24,
    }),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        <h1 className="text-xl font-semibold tracking-tight">스레드 템플릿</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          소셜 레퍼런스 게시물에서 추출한 글쓰기 구조를 탐색하고, 주제에 맞는 스레드 초안을
          생성합니다.
        </p>
      </header>

      <div className="grid gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8 xl:px-10">
        <ThreadLibraryFilters
          categories={categories}
          tags={tags}
          activeCategory={params.category}
          activeTag={params.tag}
          q={params.q}
        />

        <div className="space-y-6">
          <ThreadTemplateSearchForm
            defaultQuery={params.q}
            activeCategory={params.category}
            activeTag={params.tag}
          />

          {list.templates.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-8 text-sm text-muted-foreground">
              <p>조건에 맞는 스레드 템플릿이 없습니다.</p>
              <p className="mt-2">
                <Link href="/social" className="text-primary underline-offset-4 hover:underline">
                  Social
                </Link>
                에서 게시물을 저장한 뒤 구조를 추출하거나 필터를 초기화하세요.
              </p>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {list.templates.map((template) => (
                <li key={template.id}>
                  <ThreadTemplateCardView template={template} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
