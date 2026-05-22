/**
 * Country–category targets for bulk mostPopular chart collection.
 * Only assignable upload categories per region (no "overall" / null categoryId).
 */

export type TrendingChartTarget = {
  regionCode: string;
  categoryId: string;
  /** Korean labels from videoCategories.list regionCode=KR hl=ko */
  titleKo: string;
};

/** KR upload-assignable categories (assignable: true), verified via YouTube API. */
export const KR_ASSIGNABLE_CATEGORY_IDS = [
  '1',
  '2',
  '10',
  '15',
  '17',
  '19',
  '20',
  '22',
  '23',
  '24',
  '25',
  '26',
  '27',
  '28',
] as const;

const KR_TARGETS: TrendingChartTarget[] = [
  { regionCode: 'KR', categoryId: '1', titleKo: '영화/애니메이션' },
  { regionCode: 'KR', categoryId: '2', titleKo: '자동차' },
  { regionCode: 'KR', categoryId: '10', titleKo: '음악' },
  { regionCode: 'KR', categoryId: '15', titleKo: '반려동물/동물' },
  { regionCode: 'KR', categoryId: '17', titleKo: '스포츠' },
  { regionCode: 'KR', categoryId: '19', titleKo: '여행/이벤트' },
  { regionCode: 'KR', categoryId: '20', titleKo: '게임' },
  { regionCode: 'KR', categoryId: '22', titleKo: '인물/블로그' },
  { regionCode: 'KR', categoryId: '23', titleKo: '코미디' },
  { regionCode: 'KR', categoryId: '24', titleKo: '엔터테인먼트' },
  { regionCode: 'KR', categoryId: '25', titleKo: '뉴스/정치' },
  { regionCode: 'KR', categoryId: '26', titleKo: '노하우/스타일' },
  { regionCode: 'KR', categoryId: '27', titleKo: '교육' },
  { regionCode: 'KR', categoryId: '28', titleKo: '과학기술' },
];

/** Active region codes for matrix collection (extend when adding more countries). */
export const ACTIVE_TRENDING_REGION_CODES = ['KR'] as const;

const TARGETS_BY_REGION: Record<string, TrendingChartTarget[]> = {
  KR: KR_TARGETS,
};

export function listTrendingChartTargets(opts?: {
  regionCodes?: string[];
  categoryIds?: string[];
}): TrendingChartTarget[] {
  const regions =
    opts?.regionCodes?.length
      ? opts.regionCodes
      : [...ACTIVE_TRENDING_REGION_CODES];

  let targets: TrendingChartTarget[] = [];
  for (const code of regions) {
    const list = TARGETS_BY_REGION[code];
    if (list) targets = targets.concat(list);
  }

  if (opts?.categoryIds?.length) {
    const allowed = new Set(opts.categoryIds);
    targets = targets.filter((t) => allowed.has(t.categoryId));
  }

  return targets;
}
