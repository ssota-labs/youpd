export * from './client';
export * from './errors';
export * from './schemas';
export * from './endpoints/search';
export * from './endpoints/videos';
export * from './endpoints/channels';
export * from './endpoints/commentThreads';
export * from './endpoints/playlistItems';

// Static unit costs per YouTube Data API v3 endpoint. videos.list / channels.list
// / commentThreads.list / playlistItems.list are 1u; search.list is 100u; the
// snapshot/captions endpoints are pricier (50u / 200u) — kept here for tools
// that may use them later.
export const UNIT_COST = {
  search_list: 100,
  videos_list: 1,
  channels_list: 1,
  comment_threads_list: 1,
  playlist_items_list: 1,
  captions_list: 50,
  captions_download: 200,
} as const;
export type UnitCostKey = keyof typeof UNIT_COST;
