import Link from 'next/link';
import { Button } from '@youpd/ui/components/ui/button';
import { Input } from '@youpd/ui/components/ui/input';
import { loadKeywordHarvestsAction } from './actions';
import { KeywordRunForm } from './keyword-run-form';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function todayYmd(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function pickString(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = sp[key];
  return typeof value === 'string' ? value : undefined;
}

export default async function KeywordsAdminPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const date = pickString(sp, 'date') ?? todayYmd();
  const regionCode = pickString(sp, 'regionCode') ?? 'KR';
  const prefillRaw = pickString(sp, 'prefill');
  const defaultKeywords = prefillRaw
    ? decodeURIComponent(prefillRaw)
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean)
        .join('\n')
    : undefined;
  const data = await loadKeywordHarvestsAction(date, regionCode);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Keyword Harvest</h1>
          <p className="text-sm text-muted-foreground">
            키워드 검색 실행과 날짜별 수집 내역을 관리합니다.
          </p>
        </div>
      </header>

      <KeywordRunForm
        defaultRegionCode={regionCode}
        defaultKeywords={defaultKeywords}
      />

      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <form className="mb-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">수집일</span>
            <Input type="date" name="date" defaultValue={date} className="w-[160px]" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Region</span>
            <Input
              type="text"
              name="regionCode"
              defaultValue={regionCode}
              maxLength={2}
              className="w-20 uppercase"
            />
          </label>
          <Button type="submit" size="sm">
            조회
          </Button>
        </form>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-3 py-2">시작 시각</th>
                <th className="px-3 py-2">키워드</th>
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2">Limit</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Results</th>
                <th className="px-3 py-2">상세</th>
              </tr>
            </thead>
            <tbody>
              {data.harvests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-muted-foreground">
                    {date}에 수집된 키워드 검색이 없습니다.
                  </td>
                </tr>
              ) : (
                data.harvests.map((harvest) => (
                  <tr key={harvest.id} className="border-b border-border/60">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {harvest.startedAt.toLocaleString('ko-KR', {
                        timeZone: 'Asia/Seoul',
                      })}
                    </td>
                    <td className="px-3 py-2 font-medium">{harvest.keyword}</td>
                    <td className="px-3 py-2">{harvest.searchOrder}</td>
                    <td className="px-3 py-2">{harvest.limit}</td>
                    <td className="px-3 py-2">{harvest.status}</td>
                    <td className="px-3 py-2">{harvest.resultCount}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/keywords/${harvest.id}?regionCode=${regionCode}&date=${date}`}
                        className="text-primary underline"
                      >
                        결과 보기
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
