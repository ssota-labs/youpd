// SERVER-ONLY. This module reads the Supabase service-role key from process.env
// and constructs a privileged client that bypasses RLS by design. Never import
// this file from a client component, browser bundle, or anything reachable via
// NEXT_PUBLIC_*. The `server-only` guard is enforced inside apps that use Next.js
// (apps/web, apps/admin) at their adapter layer; apps/mcp is server-only by nature.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function createServerSupabaseClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('SUPABASE_URL is not set');
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  cached = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
