import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: '../../supabase/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  },
  // drizzle-kit generate is allowed as a sanity-check diff.
  // AGENTS.md forbids `drizzle-kit migrate`; runtime migrations are owned by Supabase CLI.
});
