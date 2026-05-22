import { loadSupabaseEnv } from '../../e2e/load-supabase-env';

export default async function globalSetup(): Promise<void> {
  if (process.env.DATABASE_URL?.trim()) {
    return;
  }
  loadSupabaseEnv();
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error(
      'DATABASE_URL is not set. Run `pnpm db:up && pnpm db:reset` or export DATABASE_URL before `pnpm test:integration`.',
    );
  }
}
