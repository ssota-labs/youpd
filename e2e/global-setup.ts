import { execSync } from 'node:child_process';

export default async function globalSetup() {
  let raw: string;
  try {
    raw = execSync('supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    throw new Error(
      'supabase local stack is not running. Run `pnpm db:up && pnpm db:reset` before `pnpm test:e2e`.',
    );
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('supabase status returned non-JSON output:\n' + raw);
  }

  const apiUrl = String(parsed.API_URL ?? '');
  const dbUrl = String(parsed.DB_URL ?? '');
  if (!apiUrl || !dbUrl) {
    throw new Error('supabase status missing API_URL/DB_URL — run `supabase start` first');
  }

  if (!process.env.DATABASE_URL) process.env.DATABASE_URL = dbUrl;
  if (!process.env.SUPABASE_URL) process.env.SUPABASE_URL = apiUrl;
  if (!process.env.SUPABASE_ANON_KEY && parsed.ANON_KEY) {
    process.env.SUPABASE_ANON_KEY = String(parsed.ANON_KEY);
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && parsed.SERVICE_ROLE_KEY) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = String(parsed.SERVICE_ROLE_KEY);
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) process.env.NEXT_PUBLIC_SUPABASE_URL = apiUrl;
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && parsed.ANON_KEY) {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = String(parsed.ANON_KEY);
  }
}
