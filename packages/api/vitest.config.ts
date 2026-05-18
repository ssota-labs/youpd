import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
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
