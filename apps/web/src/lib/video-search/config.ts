import type { ReactNode } from 'react';

export type VideoSearchFieldConfig = {
  q: boolean;
  date: boolean;
  categoryId: boolean;
  source: boolean;
};

export type VideoSearchConfig = {
  basePath: string;
  apiPath: string;
  title: string;
  description?: string;
  fields: VideoSearchFieldConfig;
  headerExtras?: ReactNode;
  resetHref?: string;
};

export const HOT_VIDEOS_SEARCH_CONFIG: Omit<
  VideoSearchConfig,
  'headerExtras'
> = {
  basePath: '/hot-videos',
  apiPath: '/api/hot-videos',
  title: 'Hot Videos',
  description:
    'YouTube 전체 트렌딩이 아니라, 검색한 키워드 풀 안의 성과 좋은 영상입니다.',
  resetHref: '/hot-videos',
  fields: {
    q: true,
    date: true,
    categoryId: true,
    source: true,
  },
};

export function keywordHarvestSearchConfig(
  harvestId: string,
  keyword: string,
): Omit<VideoSearchConfig, 'headerExtras'> {
  return {
    basePath: `/keywords/${harvestId}`,
    apiPath: `/api/keywords/${harvestId}/results`,
    title: `${keyword} · Keyword Harvest`,
    resetHref: `/keywords/${harvestId}`,
    fields: {
      q: true,
      date: false,
      categoryId: false,
      source: false,
    },
  };
}
