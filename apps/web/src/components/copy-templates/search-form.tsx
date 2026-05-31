import Link from 'next/link';

type CopyTemplateSearchFormProps = {
  defaultQuery?: string;
  activeCategory?: string;
  activeTag?: string;
  activeHookType?: string;
};

export function CopyTemplateSearchForm({
  defaultQuery = '',
  activeCategory,
  activeTag,
  activeHookType,
}: CopyTemplateSearchFormProps) {
  return (
    <form method="get" action="/copy-templates" className="flex flex-wrap gap-2">
      {activeCategory ? (
        <input type="hidden" name="category" value={activeCategory} />
      ) : null}
      {activeTag ? <input type="hidden" name="tag" value={activeTag} /> : null}
      {activeHookType ? (
        <input type="hidden" name="hookType" value={activeHookType} />
      ) : null}
      <input
        type="search"
        name="q"
        defaultValue={defaultQuery}
        placeholder="템플릿 이름·요약 검색"
        className="min-w-[200px] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <button
        type="submit"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        검색
      </button>
      {defaultQuery || activeCategory || activeTag || activeHookType ? (
        <Link
          href="/copy-templates"
          className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm"
        >
          초기화
        </Link>
      ) : null}
    </form>
  );
}
