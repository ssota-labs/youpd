import type { NotionDatabaseSchema } from '../types';

export const videosSchema: NotionDatabaseSchema = {
  key: 'videos',
  title: 'Videos 영상',
  description: '개별 영상 메타(제목, 썸네일, 게시일, 최신 조회수 등) + 뷰트랩 대체 지표',
  icon: '🎬',
  properties: [
    { name: '제목', schema: { type: 'title', title: {} } },
    { name: 'videoId', schema: { type: 'rich_text', rich_text: {} } },
    { name: '썸네일', schema: { type: 'files', files: {} } },
    {
      name: '조회수(최신)',
      schema: { type: 'number', number: { format: 'number_with_commas' } },
    },
    {
      name: '좋아요(최신)',
      schema: { type: 'number', number: { format: 'number_with_commas' } },
    },
    {
      name: '댓글수(최신)',
      schema: { type: 'number', number: { format: 'number_with_commas' } },
    },
    { name: '게시일', schema: { type: 'date', date: {} } },
    { name: '시간(초)', schema: { type: 'number', number: { format: 'number' } } },
    {
      name: '채널',
      schema: { type: 'relation', relation: { database_ref: 'channels' } },
    },
    {
      name: '연결된 키워드',
      schema: { type: 'relation', relation: { database_ref: 'keywords' } },
    },
    {
      name: '주제군',
      schema: {
        type: 'multi_select',
        multi_select: {
          options: [
            { name: '현상', color: 'gray' },
            { name: '욕구', color: 'red' },
            { name: '계획', color: 'orange' },
            { name: '행동', color: 'green' },
            { name: '보상', color: 'blue' },
          ],
        },
      },
    },
    {
      name: '채널 평균조회수',
      schema: {
        type: 'rollup',
        rollup: {
          relation_property: '채널',
          rollup_property: '평균조회수',
          function: 'average',
        },
      },
    },
    {
      name: '채널 구독자',
      schema: {
        type: 'rollup',
        rollup: {
          relation_property: '채널',
          rollup_property: '구독자',
          function: 'sum',
        },
      },
    },
    {
      name: '최근7일 증가',
      schema: {
        type: 'rollup',
        rollup: {
          relation_property: '일별 스냅샷',
          rollup_property: '전일 대비 증가',
          function: 'sum',
        },
      },
    },
    {
      name: '최근30일 증가',
      schema: {
        type: 'rollup',
        rollup: {
          relation_property: '일별 스냅샷',
          rollup_property: '전일 대비 증가',
          function: 'sum',
        },
      },
    },
    {
      name: '기여도',
      schema: {
        type: 'formula',
        formula: {
          expression:
            'if(prop("채널 평균조회수") > 0, prop("조회수(최신)") / prop("채널 평균조회수"), 0)',
        },
      },
    },
    {
      name: '성과도',
      schema: {
        type: 'formula',
        formula: {
          expression:
            'if(prop("채널 구독자") > 0, prop("조회수(최신)") / prop("채널 구독자"), 0)',
        },
      },
    },
    {
      name: '노출확률',
      schema: {
        type: 'formula',
        formula: {
          expression:
            'if(prop("최근30일 증가") > 0, (prop("최근7일 증가") / 7) / (prop("최근30일 증가") / 30), 0)',
        },
      },
    },
    {
      name: '일별 스냅샷',
      schema: {
        type: 'relation',
        relation: { database_ref: 'video_snapshots' },
      },
    },
    {
      name: '키콘 후보',
      schema: {
        type: 'relation',
        relation: { database_ref: 'key_content_candidates' },
      },
    },
    {
      name: '풀링 후보',
      schema: {
        type: 'relation',
        relation: { database_ref: 'pull_content_candidates' },
      },
    },
    { name: 'URL', schema: { type: 'url', url: {} } },
    { name: '수집일', schema: { type: 'date', date: {} } },
  ],
};
