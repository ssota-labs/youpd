import { defineConfig, devices } from '@playwright/test';
import { supabaseWebServerEnv } from './e2e/load-supabase-env';

const WEB_PORT = Number(process.env.WEB_PORT ?? 3000);
const ADMIN_PORT = Number(process.env.ADMIN_PORT ?? 3001);
const MCP_PORT = Number(process.env.MCP_PORT ?? 3002);
const sharedEnv = supabaseWebServerEnv();

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  globalSetup: './e2e/global-setup.ts',
  use: {
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @youpd/web dev',
      url: `http://127.0.0.1:${WEB_PORT}/`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: sharedEnv,
    },
    {
      command: 'pnpm --filter @youpd/admin dev',
      url: `http://127.0.0.1:${ADMIN_PORT}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: sharedEnv,
    },
    {
      command: 'pnpm --filter @youpd/mcp dev',
      url: `http://127.0.0.1:${MCP_PORT}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: sharedEnv,
    },
  ],
});
