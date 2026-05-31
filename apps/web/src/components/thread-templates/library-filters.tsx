import Link from 'next/link';
import type { ThreadTemplateCategory, ThreadTemplateTag } from '@youpd/types';
import { cn } from '@youpd/ui/lib/utils';
import { Badge } from '@youpd/ui/components/ui/badge';

type LibraryFiltersProps = {
  categories: ThreadTemplateCategory[];
  tags: ThreadTemplateTag[];
  activeCategory?: string;
  activeTag?: string;
  q?: string;
};

function buildHref(input: { category?: string; tag?: string; q?: string }) {
  const params = new URLSearchParams();
  if (input.category) params.set('category', input.category);
  if (input.tag) params.set('tag', input.tag);
  if (input.q) params.set('q', input.q);
  const query = params.toString();
  return query ? `/thread-templates?${query}` : '/thread-templates';
}

export function ThreadLibraryFilters({
  categories,
  tags,
  activeCategory,
  activeTag,
  q,
}: LibraryFiltersProps) {
  return (
    <aside className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">카테고리</h2>
        <ul className="flex flex-col gap-1">
          <li>
            <Link
              href={buildHref({ tag: activeTag, q })}
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
        <h2 className="text-sm font-semibold">태그</h2>
        <ul className="flex flex-col gap-1">
          <li>
            <Link
              href={buildHref({ category: activeCategory, q })}
              className={cn(
                'block rounded-md px-2 py-1.5 text-sm hover:bg-muted',
                !activeTag && 'bg-muted font-medium',
              )}
            >
              전체
            </Link>
          </li>
          {tags.map((tag) => (
            <li key={tag.code}>
              <Link
                href={buildHref({
                  category: activeCategory,
                  tag: tag.code,
                  q,
                })}
                className={cn(
                  'flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted',
                  activeTag === tag.code && 'bg-muted font-medium',
                )}
              >
                <span>{tag.name}</span>
                <Badge variant="outline" className="font-normal">
                  {tag.templateCount}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
