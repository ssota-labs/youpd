// SERVER-ONLY. End-user session client (anon key + cookie store) for Next.js
// App Router server components and route handlers. Distinct from
// createServerSupabaseClient() in ./server which is the privileged service-role
// client that bypasses RLS.
import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient, type CookieMethodsServer } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function createUserContextClient(): Promise<SupabaseClient> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error('SUPABASE_URL is not set');
  if (!anonKey) throw new Error('SUPABASE_ANON_KEY is not set');
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // setAll is called from a Server Component — cookies() is read-only
          // there. Routes that need to mutate session cookies should be Route
          // Handlers or Server Actions; in those, this branch is not reached.
        }
      },
    } satisfies CookieMethodsServer,
  });
}
