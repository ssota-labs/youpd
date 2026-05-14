import { sendMagicLinkAction } from './action';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const next = typeof sp.next === 'string' && sp.next.startsWith('/') ? sp.next : '/';
  const sent = sp.sent === '1';
  const error = typeof sp.error === 'string' ? sp.error : null;

  return (
    <main className="mx-auto max-w-md p-6 font-sans">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Sign in to YouPD</h1>

        {sent ? (
          <p className="mt-4 text-sm text-gray-700">
            We sent a magic link to your inbox. Click it to finish signing in;
            you&apos;ll come back here to complete authorization.
          </p>
        ) : (
          <form action={sendMagicLinkAction} className="mt-4 space-y-3">
            <input type="hidden" name="next" value={next} />
            <label className="block text-sm">
              <span className="text-gray-700">Email</span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Send magic link
            </button>
          </form>
        )}

        {error ? (
          <p className="mt-3 text-xs text-red-600">{error}</p>
        ) : null}
      </div>
    </main>
  );
}
