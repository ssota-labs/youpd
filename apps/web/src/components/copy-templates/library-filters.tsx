import Link from 'next/link';
import type { CopyTemplateCategory, CopyTemplateTag, TitleHookType } from '@youpd/types';
import { cn } from '@youpd/ui/lib/utils';
import { Badge } from '@youpd/ui/components/ui/badge';

const HOOK_FILTERS: Array<{ code: TitleHookType; label: string }> = [
  { code: 'curiosity_gap', label: '호기심 갭' },
  { code: 'numeric_emphasis', label: '숫자 강조' },
  { code: 'question', label: '질문' },
  { code: 'social_proof', label: '사회적 증거' },
  { code: 'contrast', label: '대비' },
  { code: 'how_to_promise', label: '방법 약속' },
];

type LibraryFiltersProps = {
  categories: CopyTemplateCategory[];
  tags: CopyTemplateTag[];
  activeCategory?: string;
  activeTag?: string;
  activeHookType?: string;
  q?: string;
};

function buildHref(input: {
  category?: string;
  tag?: string;
  hookType?: string;
  q?: string;
}) {
  const params = new URLSearchParams();
  if (input.category) params.set('category', input.category);
  if (input.tag) params.set('tag', input.tag);
  if (input.hookType) params.set('hookType', input.hookType);
  if (input.q) params.set('q', input.q);
  const query = params.toString();
  return query ? `/copy-templates?${query}` : '/copy-templates';
}

export function LibraryFilters({
  categories,
  tags,
  activeCategory,
  activeTag,
  activeHookType,
  q,
}: LibraryFiltersProps) {
  return (
    <aside className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">카테고리</h2>
        <ul className="flex flex-col gap-1">
          <li>
            <Link
              href={buildHref({ tag: activeTag, hookType: activeHookType, q })}
              className={cn(
                'block rounded-md px-2 py-1.5 text-sm hover:bg-muted',
                !activeCategory && 'bg-muted font-medium',
              )}
            >
              전체
            </Link>
          </li>
          {categories.map((category) => (
            <li key={category.code}>
              <Link
                href={buildHref({
                  category: category.code,
                  tag: activeTag,
                  hookType: activeHookType,
                  q,
                })}
                className={cn(
                  'flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted',
                  activeCategory === category.code && 'bg-muted font-medium',
                )}
              >
                <span>{category.name}</span>
                <Badge variant="outline" className="font-normal">
                  {category.templateCount}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">훅 유형</h2>
        <div className="flex flex-wrap gap-2">
          {HOOK_FILTERS.map((hook) => {
            const isActive = activeHookType === hook.code;
            return (
              <Link
                key={hook.code}
                href={
                  isActive
                    ? buildHref({ category: activeCategory, tag: activeTag, q })
                    : buildHref({
                        category: activeCategory,
                        tag: activeTag,
                        hookType: hook.code,
                        q,
                      })
                }
              >
                <Badge variant={isActive ? 'default' : 'outline'}>{hook.label}</Badge>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">태그</h2>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const isActive = activeTag === tag.code;
            return (
              <Link
                key={tag.code}
                href={
                  isActive
                    ? buildHref({
                        category: activeCategory,
                        hookType: activeHookType,
                        q,
                      })
                    : buildHref({
                        category: activeCategory,
                        tag: tag.code,
                        hookType: activeHookType,
                        q,
                      })
                }
              >
                <Badge variant={isActive ? 'default' : 'outline'}>
                  {tag.name} ({tag.templateCount})
                </Badge>
              </Link>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
