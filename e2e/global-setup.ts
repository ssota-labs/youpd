import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { loadSupabaseEnv } from './load-supabase-env';

export default async function globalSetup() {
  loadSupabaseEnv();

  const seedScript = path.resolve(process.cwd(), 'e2e', 'seed-hot-videos.ts');
  execFileSync(
    'pnpm',
    ['--filter', '@youpd/api', 'exec', 'tsx', seedScript],
    {
      stdio: 'inherit',
      env: process.env,
    },
  );
}
