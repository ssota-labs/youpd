import { getIssuer } from '@/oauth/config';

export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function LoginPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const next = typeof sp.next === 'string' ? sp.next : `${getIssuer()}/`;
  const sent = sp.sent === '1';

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 520 }}>
      <h1>Sign in to YouPD MCP</h1>
      {sent ? (
        <p>Check your email for a magic link. After signing in you will be returned to complete authorization.</p>
      ) : (
        <form method="post" action="/oauth/login/action" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input type="hidden" name="next" value={next} />
          <label>
            Email
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              style={{ display: 'block', width: '100%', padding: 8 }}
            />
          </label>
          <button type="submit" style={{ padding: '8px 16px', alignSelf: 'flex-start' }}>
            Send magic link
          </button>
        </form>
      )}
    </main>
  );
}
