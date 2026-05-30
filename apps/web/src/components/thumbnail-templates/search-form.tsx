import { Badge } from '@youpd/ui/components/ui/badge';
import { Input } from '@youpd/ui/components/ui/input';

type SearchFormProps = {
  defaultQuery?: string;
  activeCategory?: string;
  activeTag?: string;
};

export function ThumbnailTemplateSearchForm({
  defaultQuery,
  activeCategory,
  activeTag,
}: SearchFormProps) {
  return (
    <form action="/thumbnail-templates" method="get" className="flex flex-col gap-2">
      {activeCategory ? (
        <input type="hidden" name="category" value={activeCategory} />
      ) : null}
      {activeTag ? <input type="hidden" name="tag" value={activeTag} /> : null}
      <div className="flex gap-2">
        <Input
          name="q"
          defaultValue={defaultQuery}
          placeholder="템플릿 이름·요약 검색"
          className="max-w-md"
        />
        <button
          type="submit"
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          검색
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        마케팅 카테고리·태그로 필터하고, 증거 축은 상세 페이지에서 확인합니다.
      </p>
      {activeCategory || activeTag ? (
        <div className="flex flex-wrap gap-2">
          {activeCategory ? (
            <Badge variant="secondary">카테고리: {activeCategory}</Badge>
          ) : null}
          {activeTag ? <Badge variant="secondary">태그: {activeTag}</Badge> : null}
        </div>
      ) : null}
    </form>
  );
}
