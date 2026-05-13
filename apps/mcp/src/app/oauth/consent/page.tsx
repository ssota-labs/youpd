import { redirect } from 'next/navigation';
import {
  createUserContextClient,
  getAuthRequest,
  getOauthClient,
} from '@youpd/supabase';
import { getIssuer } from '@/oauth/config';

export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ConsentPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const rid = typeof sp.rid === 'string' ? sp.rid : null;
  if (!rid) {
    return (
      <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <h1>Invalid request</h1>
        <p>Missing or malformed request id.</p>
      </main>
    );
  }

  const supabase = await createUserContextClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) {
    const issuer = getIssuer();
    redirect(
      `${issuer}/oauth/login?next=${encodeURIComponent(`${issuer}/oauth/consent?rid=${rid}`)}`,
    );
  }

  const reqRow = await getAuthRequest(rid);
  if (!reqRow) {
    return (
      <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <h1>Request expired</h1>
        <p>This authorization request is no longer valid. Please start again from your MCP client.</p>
      </main>
    );
  }

  const client = await getOauthClient(reqRow.clientId);
  const clientLabel = client?.clientName ?? reqRow.clientId;

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 520 }}>
      <h1>Authorize MCP access</h1>
      <p>
        <strong>{clientLabel}</strong> is requesting access to your YouPD account
        with scope <code>{reqRow.scope}</code>.
      </p>
      <p style={{ color: '#555' }}>
        Signed in as <strong>{user.email ?? user.id}</strong>.
      </p>
      <form method="post" action="/oauth/consent/decision" style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <input type="hidden" name="rid" value={rid} />
        <button type="submit" name="decision" value="approve" style={{ padding: '8px 16px' }}>
          Approve
        </button>
        <button type="submit" name="decision" value="deny" style={{ padding: '8px 16px' }}>
          Deny
        </button>
      </form>
    </main>
  );
}
