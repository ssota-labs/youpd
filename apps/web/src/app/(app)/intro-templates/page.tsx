import Link from 'next/link';
import {
  listIntroTemplateCategories,
  listIntroTemplateTags,
  listIntroTemplates,
} from '@youpd/api/intro-templates';
import { requireSessionUserId } from '@/lib/auth/require-session-user';
import { IntroLibraryFilters } from '@/components/intro-templates/library-filters';
import { IntroTemplateSearchForm } from '@/components/intro-templates/search-form';
import { IntroTemplateCardView } from '@/components/intro-templates/template-card';

type PageProps = {
  searchParams: Promise<{
    category?: string;
    tag?: string;
    q?: string;
  }>;
};

export default async function IntroTemplatesPage({ searchParams }: PageProps) {
  await requireSessionUserId();
  const params = await searchParams;

  const [categories, tags, list] = await Promise.all([
    listIntroTemplateCategories(),
    listIntroTemplateTags(),
    listIntroTemplates({
      category: params.category,
      tag: params.tag,
      q: params.q,
      limit: 24,
    }),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        <h1 className="text-xl font-semibold tracking-tight">인트로 구조 템플릿</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          첫 30초 발췌·구조 슬롯 증거를 바탕으로 재사용 가능한 인트로 패턴을 탐색하고 초안을
          생성합니다.
        </p>
      </header>

      <div className="grid gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8 xl:px-10">
        <IntroLibraryFilters
          categories={categories}
          tags={tags}
          activeCategory={params.category}
          activeTag={params.tag}
          q={params.q}
        />

        <div className="space-y-6">
          <IntroTemplateSearchForm
            defaultQuery={params.q}
            activeCategory={params.category}
            activeTag={params.tag}
          />

          {list.templates.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-8 text-sm text-muted-foreground">
              <p>조건에 맞는 인트로 템플릿이 없습니다.</p>
              <p className="mt-2">
                <Link href="/references" className="text-primary underline-offset-4 hover:underline">
                  레퍼런스 폴더
                </Link>
                에서 영상을 저장한 뒤 인트로 구조를 추출하거나 필터를 초기화하세요.
              </p>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {list.templates.map((template) => (
                <li key={template.id}>
                  <IntroTemplateCardView template={template} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
