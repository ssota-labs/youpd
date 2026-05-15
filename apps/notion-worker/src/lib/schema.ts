/**
 * Canonical Notion column contract for YouPD template DBs (Worker SSOT).
 * Property names must match exactly; healthcheck fails on rename/type drift.
 */
export const CANONICAL = {
  videos: {
    title: '제목',
    videoId: 'videoId',
    views: '조회수(최신)',
    likes: '좋아요(최신)',
    comments: '댓글수(최신)',
    publishedAt: '게시일',
    channelRelation: '채널',
    url: 'URL',
    collectedAt: '수집일',
  },
  channels: {
    title: '채널명',
    channelId: 'channelId',
    subscribers: '구독자',
    viewCount: '누적조회수',
    videoCount: '총 영상 수',
    publishedAt: '개설일',
    avgLikes: '평균좋아요',
    url: '온라인 URL',
  },
  videoSnapshots: {
    idTitle: 'ID',
    videoRelation: '영상',
    snapshotDate: '스냅샷일',
    views: '조회수',
    likes: '좋아요',
    comments: '댓글수',
    delta: '전일 대비 증가',
  },
  channelSnapshots: {
    idTitle: 'ID',
    channelRelation: '채널',
    snapshotDate: '스냅샷일',
    subscribers: '구독자',
    viewCount: '누적조회수',
    videoCount: '총 영상 수',
    subscriberDelta: '전일 대비 구독자 증가',
  },
  comments: {
    title: '제목',
    commentId: 'commentId',
    videoRelation: '영상',
    body: '본문',
    likeCount: '좋아요수',
    publishedAt: '작성일시',
  },
} as const;

export type TableKey = keyof typeof CANONICAL;

export type PropertyExpectation = { name: string; types: readonly string[] };

export function expectationsForTable(table: TableKey): PropertyExpectation[] {
  switch (table) {
    case 'videos':
      return [
        { name: CANONICAL.videos.title, types: ['title'] },
        { name: CANONICAL.videos.videoId, types: ['rich_text'] },
        { name: CANONICAL.videos.views, types: ['number'] },
        { name: CANONICAL.videos.likes, types: ['number'] },
        { name: CANONICAL.videos.comments, types: ['number'] },
        { name: CANONICAL.videos.publishedAt, types: ['date'] },
        { name: CANONICAL.videos.channelRelation, types: ['relation'] },
        { name: CANONICAL.videos.url, types: ['url'] },
        { name: CANONICAL.videos.collectedAt, types: ['date'] },
      ];
    case 'channels':
      return [
        { name: CANONICAL.channels.title, types: ['title'] },
        { name: CANONICAL.channels.channelId, types: ['rich_text'] },
        { name: CANONICAL.channels.subscribers, types: ['number'] },
        { name: CANONICAL.channels.viewCount, types: ['number'] },
        { name: CANONICAL.channels.videoCount, types: ['number'] },
        { name: CANONICAL.channels.publishedAt, types: ['date'] },
        { name: CANONICAL.channels.avgLikes, types: ['number'] },
        { name: CANONICAL.channels.url, types: ['url'] },
      ];
    case 'videoSnapshots':
      return [
        { name: CANONICAL.videoSnapshots.idTitle, types: ['title'] },
        { name: CANONICAL.videoSnapshots.videoRelation, types: ['relation'] },
        { name: CANONICAL.videoSnapshots.snapshotDate, types: ['date'] },
        { name: CANONICAL.videoSnapshots.views, types: ['number'] },
        { name: CANONICAL.videoSnapshots.likes, types: ['number'] },
        { name: CANONICAL.videoSnapshots.comments, types: ['number'] },
        { name: CANONICAL.videoSnapshots.delta, types: ['number'] },
      ];
    case 'channelSnapshots':
      return [
        { name: CANONICAL.channelSnapshots.idTitle, types: ['title'] },
        { name: CANONICAL.channelSnapshots.channelRelation, types: ['relation'] },
        { name: CANONICAL.channelSnapshots.snapshotDate, types: ['date'] },
        { name: CANONICAL.channelSnapshots.subscribers, types: ['number'] },
        { name: CANONICAL.channelSnapshots.viewCount, types: ['number'] },
        { name: CANONICAL.channelSnapshots.videoCount, types: ['number'] },
        { name: CANONICAL.channelSnapshots.subscriberDelta, types: ['number'] },
      ];
    case 'comments':
      return [
        { name: CANONICAL.comments.title, types: ['title'] },
        { name: CANONICAL.comments.commentId, types: ['rich_text'] },
        { name: CANONICAL.comments.videoRelation, types: ['relation'] },
        { name: CANONICAL.comments.body, types: ['rich_text'] },
        { name: CANONICAL.comments.likeCount, types: ['number'] },
        { name: CANONICAL.comments.publishedAt, types: ['date'] },
      ];
    default:
      return [];
  }
}

/** Minimal data source property map from `notion.dataSources.retrieve`. */
export type DataSourceSchema = Record<
  string,
  { id: string; name: string; type: string }
>;

export function validateCanonicalSchema(
  table: TableKey,
  schema: DataSourceSchema,
): { ok: true } | { ok: false; message: string } {
  const expected = expectationsForTable(table);
  for (const exp of expected) {
    const prop = Object.values(schema).find((p) => p.name === exp.name);
    if (!prop) {
      return {
        ok: false,
        message: `${table}: missing required property "${exp.name}".`,
      };
    }
    if (!exp.types.includes(prop.type)) {
      return {
        ok: false,
        message: `${table}: property "${exp.name}" has type ${prop.type}, expected one of ${exp.types.join(', ')}.`,
      };
    }
  }
  return { ok: true };
}
