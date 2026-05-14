import { redirect } from 'next/navigation';
import { createUserContextClient } from '@youpd/supabase';
import {
  getAuthorization,
  SupabaseAuthError,
  type AuthorizationDetails,
} from '@/lib/supabase-fetch';
import { approveAction, denyAction } from './actions';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pickScopes(res: AuthorizationDetails): string[] {
  if (Array.isArray(res.scopes)) return res.scopes;
  if (typeof res.scope === 'string') {
    return res.scope.split(' ').filter(Boolean);
  }
  return [];
}

function renderRecovery(title: string, body: string) {
  return (
    <main className="mx-auto max-w-md p-6 font-sans">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm text-gray-700">{body}</p>
      </div>
    </main>
  );
}

export default async function ConsentPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const authorizationId =
    typeof sp.authorization_id === 'string' ? sp.authorization_id : null;

  if (!authorizationId) {
    return (
      <main className="mx-auto max-w-md p-6 font-sans">
        <h1 className="text-xl font-semibold">Invalid request</h1>
        <p className="mt-2 text-sm text-gray-600">
          Missing or malformed authorization_id.
        </p>
      </main>
    );
  }

  const supabase = await createUserContextClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) {
    const next = `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  // session is defined here — redirect above terminates otherwise.
  let result: Awaited<ReturnType<typeof getAuthorization>>;
  try {
    result = await getAuthorization(authorizationId, session!.access_token);
  } catch (err) {
    // Surface a friendly recovery page for known terminal states instead of
    // letting the error bubble to Next.js's 500 page.
    if (err instanceof SupabaseAuthError) {
      if (err.status === 404 || err.errorCode === 'oauth_authorization_not_found') {
        return renderRecovery(
          'Authorization expired',
          'This authorization request is no longer valid. Please restart the connection from the application that initiated it.',
        );
      }
      if (err.status === 400 && err.errorCode === 'validation_failed') {
        return renderRecovery(
          'Authorization already processed',
          'This authorization has already been approved or denied. Please restart the connection from the application that initiated it.',
        );
      }
    }
    throw err;
  }

  // Auto-approve case: Supabase already flipped the authorization to Approved
  // because the user has a prior consent that covers the requested scope.
  // Skip the UI and forward straight to the OAuth client's redirect_uri.
  if (result.kind === 'auto_approved') {
    redirect(result.redirectUrl);
  }

  const auth = result.details;
  const scopes = pickScopes(auth);
  const userLabel =
    auth.user?.email ?? session!.user.email ?? session!.user.id;

  return (
    <main className="mx-auto max-w-md p-6 font-sans">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Authorize MCP access</h1>
        <p className="mt-3 text-sm">
          <strong>{auth.client.name || auth.client.id}</strong> is requesting
          access to your YouPD account.
        </p>

        {scopes.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Requested scopes
            </p>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {scopes.map((s) => (
                <li
                  key={s}
                  className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono"
                >
                  {s}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="mt-4 text-xs text-gray-500">
          Signed in as <strong>{userLabel}</strong>.
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Redirects to{' '}
          <code className="break-all">{auth.redirect_uri}</code>
        </p>

        <form className="mt-6 flex gap-2">
          <input
            type="hidden"
            name="authorization_id"
            value={authorizationId}
          />
          <button
            type="submit"
            formAction={approveAction}
            className="flex-1 rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Allow
          </button>
          <button
            type="submit"
            formAction={denyAction}
            className="flex-1 rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Deny
          </button>
        </form>
      </div>
    </main>
  );
}
