import type { NotionDatabaseSchema } from '../types';

export const channelSnapshotsSchema: NotionDatabaseSchema = {
  key: 'channel_snapshots',
  title: 'Channel Snapshots 채널 일별 스냅샷',
  description: '채널의 구독자·누적조회수·총 영상 수 일별 시계열 (성장속도 입력)',
  icon: '📊',
  properties: [
    { name: 'ID', schema: { type: 'title', title: {} } },
    {
      name: '채널',
      schema: {
        type: 'relation',
        relation: { database_ref: 'channels', type: 'dual_property' },
      },
    },
    { name: '스냅샷일', schema: { type: 'date', date: {} } },
    {
      name: '구독자',
      schema: { type: 'number', number: { format: 'number_with_commas' } },
    },
    {
      name: '누적조회수',
      schema: { type: 'number', number: { format: 'number_with_commas' } },
    },
    {
      name: '총 영상 수',
      schema: { type: 'number', number: { format: 'number_with_commas' } },
    },
    {
      name: '전일 대비 구독자 증가',
      schema: { type: 'number', number: { format: 'number_with_commas' } },
    },
  ],
};
