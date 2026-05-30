'use server';

import {
  getKeywordHarvestResults,
  listKeywordHarvestsByDate,
  runKeywordSearchBatch,
  RunKeywordSearchBatchInputSchema,
} from '@youpd/api/youtube';

function todayYmd(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export async function loadKeywordHarvestsAction(date: string, regionCode = 'KR') {
  const result = await listKeywordHarvestsByDate({ date, regionCode });
  return result.data;
}

export async function loadKeywordHarvestResultsAction(
  harvestId: string,
  regionCode = 'KR',
  hotDate?: string,
) {
  const result = await getKeywordHarvestResults({
    harvestId,
    regionCode,
    hotDate: hotDate ?? todayYmd(),
  });
  return result.data;
}

export async function runKeywordSearchBatchAction(formData: FormData) {
  const keywordsRaw = String(formData.get('keywords') ?? '');
  const keywords = keywordsRaw
    .split(/[\n,]+/)
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0);

  const parsed = RunKeywordSearchBatchInputSchema.parse({
    keywords,
    regionCode: String(formData.get('regionCode') ?? 'KR'),
    limit: Number(formData.get('limit') ?? 50),
    order: String(formData.get('order') ?? 'relevance'),
    forceRefresh: formData.get('forceRefresh') === 'on',
  });

  const result = await runKeywordSearchBatch(parsed);
  return result;
}
