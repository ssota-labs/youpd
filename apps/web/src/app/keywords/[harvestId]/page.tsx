import Link from 'next/link';
import { loadKeywordHarvestResultsAction } from '../actions';

type PageProps = {
  params: Promise<{ harvestId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pickString(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = sp[key];
  return typeof value === 'string' ? value : undefined;
}

function gradeLabel(ratio: number | null): string {
  if (ratio == null || !Number.isFinite(ratio)) return 'Unknown';
  if (ratio < 0.1) return 'Worst';
  if (ratio < 1) return 'Bad';
  if (ratio < 10) return 'Normal';
  if (ratio < 100) return 'Good';
  return 'Great';
}

export default async function KeywordHarvestDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { harvestId } = await params;
  const sp = await searchParams;
  const regionCode = pickString(sp, 'regionCode') ?? 'KR';
  const date = pickString(sp, 'date');
  const data = await loadKeywordHarvestResultsAction(harvestId, regionCode);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Keyword Harvest Results</h1>
          <p className="text-sm text-muted-foreground">
            harvest {harvestId} · hot date {data.hotDate}
          </p>
        </div>
        <Link
          href={`/keywords${date ? `?date=${date}&regionCode=${regionCode}` : ''}`}
          className="text-sm text-muted-foreground underline"
        >
          목록으로
        </Link>
      </header>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Rank</th>
              <th className="px-3 py-2">Video</th>
              <th className="px-3 py-2">Channel</th>
              <th className="px-3 py-2">Views</th>
              <th className="px-3 py-2">Subs</th>
              <th className="px-3 py-2">Performance</th>
              <th className="px-3 py-2">Contribution</th>
              <th className="px-3 py-2">Promoted</th>
            </tr>
          </thead>
          <tbody>
            {data.results.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-muted-foreground">
                  결과가 없습니다.
                </td>
              </tr>
            ) : (
              data.results.map(
                ({
                  result,
                  video,
                  channel,
                  performanceRatio,
                  contributionRatio,
                  promoted,
                }) => (
                  <tr key={result.id} className="border-b border-border/60">
                    <td className="px-3 py-2">{result.rank}</td>
                    <td className="px-3 py-2">
                      <a
                        href={
                          video.videoUrl ??
                          `https://www.youtube.com/watch?v=${video.videoId}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary underline"
                      >
                        {video.title}
                      </a>
                    </td>
                    <td className="px-3 py-2">{channel?.title ?? '-'}</td>
                    <td className="px-3 py-2">
                      {video.viewCount?.toLocaleString() ?? '-'}
                    </td>
                    <td className="px-3 py-2">
                      {channel?.subscriberCount?.toLocaleString() ?? '-'}
                    </td>
                    <td className="px-3 py-2">
                      {gradeLabel(performanceRatio)}
                      {performanceRatio != null
                        ? ` (${performanceRatio.toFixed(2)})`
                        : ''}
                    </td>
                    <td className="px-3 py-2">
                      {gradeLabel(contributionRatio)}
                      {contributionRatio != null
                        ? ` (${contributionRatio.toFixed(2)})`
                        : ''}
                    </td>
                    <td className="px-3 py-2">{promoted ? 'yes' : 'no'}</td>
                  </tr>
                ),
              )
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
