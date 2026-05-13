import type { NotionDatabaseSchema } from '../types';

export const agentMetaSchema: NotionDatabaseSchema = {
  key: 'agent_meta',
  title: 'Agent Meta — 스키마 버전 추적',
  description: '운영 메타 — 9개 DB + Agent Bundle row 1개 (스키마 버전 동기화용)',
  icon: '⚙',
  properties: [
    { name: 'DB 이름', schema: { type: 'title', title: {} } },
    { name: 'DB 링크', schema: { type: 'url', url: {} } },
    { name: '현재 버전', schema: { type: 'rich_text', rich_text: {} } },
    { name: '최신 버전 (캐시)', schema: { type: 'rich_text', rich_text: {} } },
    { name: '속성 스냅샷', schema: { type: 'rich_text', rich_text: {} } },
    {
      name: '상태',
      schema: {
        type: 'select',
        select: {
          options: [
            { name: 'synced', color: 'green' },
            { name: 'outdated', color: 'orange' },
            { name: 'migrating', color: 'blue' },
            { name: 'unknown', color: 'gray' },
          ],
        },
      },
    },
    { name: '마지막 동기화', schema: { type: 'date', date: {} } },
    { name: '마지막 점검', schema: { type: 'date', date: {} } },
    { name: '변경 로그', schema: { type: 'rich_text', rich_text: {} } },
    { name: 'MCP 서버 URL', schema: { type: 'url', url: {} } },
  ],
};
