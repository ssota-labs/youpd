'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { runKeywordSearchBatchAction } from './actions';

type KeywordRunFormProps = {
  defaultRegionCode: string;
};

export function KeywordRunForm({ defaultRegionCode }: KeywordRunFormProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [results, setResults] = useState<
    Array<{
      keyword: string;
      status: string;
      videoCount: number;
      unitsConsumed: number;
      error?: string;
    }>
  >([]);

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="text-lg font-semibold">키워드 검색 실행</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        한 줄에 하나씩 입력하거나 쉼표로 구분해 여러 키워드를 실행할 수 있습니다.
      </p>

      <form
        className="mt-4 grid gap-3"
        action={(formData) => {
          setMessage(null);
          startTransition(async () => {
            try {
              const response = await runKeywordSearchBatchAction(formData);
              setResults(response.data.results);
              setMessage(
                `${response.data.successCount}/${response.data.totalKeywords} 성공 · quota ${response.data.totalUnitsConsumed}`,
              );
            } catch (error) {
              setMessage(error instanceof Error ? error.message : '실행 실패');
              setResults([]);
            }
          });
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Keywords</span>
          <textarea
            name="keywords"
            required
            rows={5}
            placeholder={'엑셀 자동화\n노션 템플릿\n업무 자동화'}
            className="rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm"
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Region</span>
            <Input
              type="text"
              name="regionCode"
              defaultValue={defaultRegionCode}
              maxLength={2}
              className="w-20 uppercase"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Limit</span>
            <Input
              type="number"
              name="limit"
              defaultValue={50}
              min={1}
              max={50}
              className="w-24"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Order</span>
            <select
              name="order"
              defaultValue="relevance"
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="relevance">relevance</option>
              <option value="date">date</option>
              <option value="viewCount">viewCount</option>
              <option value="rating">rating</option>
              <option value="title">title</option>
              <option value="videoCount">videoCount</option>
            </select>
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" name="forceRefresh" />
            <span>forceRefresh</span>
          </label>
        </div>

        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending ? '실행 중…' : '키워드 검색 실행'}
        </Button>
      </form>

      {message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}

      {results.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Keyword</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Videos</th>
                <th className="px-3 py-2">Quota</th>
                <th className="px-3 py-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.keyword} className="border-b border-border/60">
                  <td className="px-3 py-2 font-medium">{result.keyword}</td>
                  <td className="px-3 py-2">{result.status}</td>
                  <td className="px-3 py-2">{result.videoCount}</td>
                  <td className="px-3 py-2">{result.unitsConsumed}</td>
                  <td className="px-3 py-2 text-destructive">{result.error ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
