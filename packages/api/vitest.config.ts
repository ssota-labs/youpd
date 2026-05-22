import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      'server-only': path.join(dir, 'src/test-utils/server-only-stub.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.integration.test.ts'],
    globals: false,
    // Pin the inter-page YouTube throttle to 0 across the suite so the
    // paginated tools (search_keyword, get_channel_all_videos, …) don't
    // accumulate 150ms sleeps per fake page. The throttle has its own
    // dedicated unit tests via setInterPageDelayForTests.
    env: {
      YOUPD_INTER_PAGE_DELAY_MS: '0',
    },
  },
});
