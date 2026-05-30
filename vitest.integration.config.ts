import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.join(root, 'apps/web/src'),
      'server-only': path.join(root, 'test/integration/stubs/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    include: [
      'packages/api/src/**/*.integration.test.ts',
      'packages/supabase/src/**/*.integration.test.ts',
      'apps/admin/src/**/*.integration.test.ts',
      'apps/web/src/**/*.integration.test.ts',
    ],
    globals: false,
    globalSetup: ['./test/integration/global-setup.ts'],
    pool: 'forks',
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
