import type { NotionDatabaseSchema } from '../types';

export const channelsSchema: NotionDatabaseSchema = {
  key: 'channels',
  title: 'Channels 채널',
  description: '채널 메타(구독자, 누적조회수, 개설일, 평균 조회수 등)',
  icon: '📺',
  properties: [
    { name: '채널명', schema: { type: 'title', title: {} } },
    { name: 'channelId', schema: { type: 'rich_text', rich_text: {} } },
    { name: '구독자', schema: { type: 'number', number: { format: 'number_with_commas' } } },
    {
      name: '누적조회수',
      schema: { type: 'number', number: { format: 'number_with_commas' } },
    },
    {
      name: '총 영상 수',
      schema: { type: 'number', number: { format: 'number_with_commas' } },
    },
    { name: '개설일', schema: { type: 'date', date: {} } },
    {
      name: '평균조회수',
      schema: {
        type: 'formula',
        formula: {
          expression:
            'if(prop("총 영상 수") > 0, prop("누적조회수") / prop("총 영상 수"), 0)',
        },
      },
    },
    {
      name: '평균좋아요',
      schema: { type: 'number', number: { format: 'number_with_commas' } },
    },
    {
      name: '월간 구독자 증가',
      schema: { type: 'number', number: { format: 'number_with_commas' } },
    },
    {
      name: '성장속도',
      schema: {
        type: 'formula',
        formula: { expression: 'prop("월간 구독자 증가") / 30' },
      },
    },
    { name: '온라인 URL', schema: { type: 'url', url: {} } },
    {
      name: '연결된 영상',
      schema: { type: 'relation', relation: { database_ref: 'videos' } },
    },
    {
      name: '일별 스냅샷',
      schema: {
        type: 'relation',
        relation: { database_ref: 'channel_snapshots' },
      },
    },
  ],
};
