import { loadSupabaseEnv } from './load-supabase-env';

export default async function globalSetup() {
  loadSupabaseEnv();
}
