import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/** Isolate Vite from package-root `.env.local` (sandbox/EPERM-safe for unit tests). */
const envDir = fileURLToPath(new URL('./vitest-env-dir', import.meta.url));

export default defineConfig({
  envDir,
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: false,
  },
});
