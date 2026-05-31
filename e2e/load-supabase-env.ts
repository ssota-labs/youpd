import { execSync } from 'node:child_process';

/** Inject local Supabase connection env for Playwright webServer child processes. */
export function loadSupabaseEnv(): void {
  let raw: string;
  try {
    raw = execSync('supabase status -o json', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    throw new Error(
      'supabase local stack is not running. Run `pnpm db:up && pnpm db:reset` before `pnpm test:e2e`.',
    );
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`supabase status returned non-JSON output:\n${raw}`);
  }

  const apiUrl = String(parsed.API_URL ?? '');
  const dbUrl = String(parsed.DB_URL ?? '');
  if (!apiUrl || !dbUrl) {
    throw new Error('supabase status missing API_URL/DB_URL — run `supabase start` first');
  }

  process.env.DATABASE_URL ??= dbUrl;
  process.env.SUPABASE_URL ??= apiUrl;
  if (parsed.ANON_KEY) {
    process.env.SUPABASE_ANON_KEY ??= String(parsed.ANON_KEY);
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= String(parsed.ANON_KEY);
  }
  if (parsed.SERVICE_ROLE_KEY) {
    process.env.SUPABASE_SERVICE_ROLE_KEY ??= String(parsed.SERVICE_ROLE_KEY);
  }
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= apiUrl;
}

export function supabaseWebServerEnv(): NodeJS.ProcessEnv {
  loadSupabaseEnv();
  return {
    DATABASE_URL: process.env.DATABASE_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    YOUPD_E2E_SKIP_AUTH: '1',
    YOUPD_HOME_FEED_FIXTURE: '1',
    THUMBNAIL_IMAGE_PROVIDER: 'stub',
  };
}
