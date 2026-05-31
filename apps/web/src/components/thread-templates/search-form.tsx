'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@youpd/ui/components/ui/button';
import { Input } from '@youpd/ui/components/ui/input';

type ThreadTemplateSearchFormProps = {
  defaultQuery?: string;
  activeCategory?: string;
  activeTag?: string;
};

export function ThreadTemplateSearchForm({
  defaultQuery = '',
  activeCategory,
  activeTag,
}: ThreadTemplateSearchFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultQuery);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (activeCategory) params.set('category', activeCategory);
    if (activeTag) params.set('tag', activeTag);
    if (query.trim()) params.set('q', query.trim());
    const suffix = params.toString();
    router.push(suffix ? `/thread-templates?${suffix}` : '/thread-templates');
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="스레드 템플릿 검색"
        className="max-w-md flex-1"
      />
      <Button type="submit">검색</Button>
    </form>
  );
}
