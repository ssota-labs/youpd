// End-to-end smoke for the MCP OAuth + tools/call flow.
//   DCR → authorize → consent → token → POST /api/mcp tools/call ping
//
// Uses Supabase admin client to (a) create a test user, (b) sign in with a
// password to obtain @supabase/ssr-shaped cookies that our Next.js app can
// authenticate against, then drives the OAuth flow with manual cookie tracking.
//
// Requires SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
// MCP_OAUTH_ISSUER, MCP_OAUTH_RESOURCE in the environment (loaded by Next from
// .env.local for the server; this script reads them too).
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { createHash, randomBytes } from 'node:crypto';

const ORIGIN = process.env.MCP_OAUTH_ISSUER || 'http://localhost:3002';
const RESOURCE = process.env.MCP_OAUTH_RESOURCE || `${ORIGIN}/api/mcp`;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY must be set');
}

function step(name) {
  console.log(`\n=== ${name} ===`);
}
function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

// --- PKCE helpers (S256) ---
function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}
function pkce() {
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

// --- Cookie jar (host-scoped to our app origin) ---
class CookieJar {
  constructor() {
    this.store = new Map();
  }
  setFromHeader(setCookieHeader) {
    if (!setCookieHeader) return;
    // fetch's headers.getSetCookie() returns an array in Node 20+; we accept array or string
    const lines = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    for (const line of lines) {
      const [pair] = line.split(';');
      const idx = pair.indexOf('=');
      if (idx < 0) continue;
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      if (value === '' || /max-age=0/i.test(line) || /expires=Thu, 01 Jan 1970/i.test(line)) {
        this.store.delete(name);
      } else {
        this.store.set(name, value);
      }
    }
  }
  ingest(response) {
    const h = response.headers.getSetCookie?.() ?? response.headers.get('set-cookie');
    this.setFromHeader(h);
  }
  header() {
    return Array.from(this.store.entries())
      .map(([n, v]) => `${n}=${v}`)
      .join('; ');
  }
}

// --- Build SSR-compatible session cookies for our app's origin ---
// We instantiate a @supabase/ssr server client with our own cookie store and
// call signInWithPassword. The library writes the exact cookies the Next.js
// app's createServerClient will read back. We then replay those cookies as a
// Cookie header on every subsequent request to localhost:3002.
async function loginAsTestUser(email, password) {
  const jar = new CookieJar();
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () =>
        Array.from(jar.store.entries()).map(([name, value]) => ({ name, value })),
      setAll: (toSet) => {
        for (const { name, value, options } of toSet) {
          if (value === '' || options?.maxAge === 0) {
            jar.store.delete(name);
          } else {
            jar.store.set(name, value);
          }
        }
      },
    },
  });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signInWithPassword failed: ${error.message}`);
  return jar;
}

async function main() {
  // -------- 0. Bootstrap: ensure a Supabase test user exists --------
  step('0. Create test user via admin API');
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `smoke-${Date.now()}@example.com`;
  const password = 'SmokeTestPass!123';
  const { data: createData, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr) fail(`admin.createUser: ${createErr.message}`);
  const userId = createData.user.id;
  console.log(`created user ${email} (id=${userId})`);

  // -------- 1. DCR --------
  step('1. POST /oauth/register');
  const regResp = await fetch(`${ORIGIN}/oauth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      redirect_uris: ['http://localhost:9999/cb'],
      client_name: 'smoke-test',
      token_endpoint_auth_method: 'none',
    }),
  });
  if (regResp.status !== 201) fail(`register: ${regResp.status} ${await regResp.text()}`);
  const regBody = await regResp.json();
  const clientId = regBody.client_id;
  if (!clientId) fail('register: missing client_id');
  console.log(`client_id=${clientId.slice(0, 12)}…`);

  // -------- 2. Sign in (build cookie jar matching @supabase/ssr) --------
  step('2. Sign in via Supabase password to get session cookies');
  const jar = await loginAsTestUser(email, password);
  console.log(`session cookies set (${jar.store.size}): ${[...jar.store.keys()].join(', ')}`);

  // -------- 3. /oauth/authorize → 302 to /oauth/consent --------
  step('3. GET /oauth/authorize');
  const { verifier, challenge } = pkce();
  const state = b64url(randomBytes(16));
  const authUrl = new URL(`${ORIGIN}/oauth/authorize`);
  authUrl.search = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: 'http://localhost:9999/cb',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    scope: 'mcp',
    resource: RESOURCE,
  }).toString();
  const authResp = await fetch(authUrl, { redirect: 'manual', headers: { cookie: jar.header() } });
  jar.ingest(authResp);
  if (authResp.status !== 302) fail(`authorize: expected 302, got ${authResp.status} body=${await authResp.text()}`);
  const consentLocation = authResp.headers.get('location');
  if (!consentLocation || !consentLocation.includes('/oauth/consent')) {
    fail(`authorize: expected redirect to /oauth/consent, got ${consentLocation}`);
  }
  const ridMatch = consentLocation.match(/rid=([^&]+)/);
  if (!ridMatch) fail('authorize: missing rid in redirect');
  const rid = decodeURIComponent(ridMatch[1]);
  console.log(`rid=${rid}`);

  // -------- 4. /oauth/consent/decision approve=true → 302 to redirect_uri?code=... --------
  step('4. POST /oauth/consent/decision (approve)');
  const consentResp = await fetch(`${ORIGIN}/oauth/consent/decision`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      cookie: jar.header(),
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ rid, decision: 'approve' }).toString(),
  });
  jar.ingest(consentResp);
  if (consentResp.status !== 302) {
    fail(`consent/decision: expected 302, got ${consentResp.status} body=${await consentResp.text()}`);
  }
  const cbLocation = consentResp.headers.get('location') ?? '';
  if (!cbLocation.startsWith('http://localhost:9999/cb')) {
    fail(`consent/decision: expected redirect to client cb, got ${cbLocation}`);
  }
  const cbUrl = new URL(cbLocation);
  const code = cbUrl.searchParams.get('code');
  const returnedState = cbUrl.searchParams.get('state');
  if (!code) fail('consent/decision: missing code');
  if (returnedState !== state) fail(`consent/decision: state mismatch ${returnedState} vs ${state}`);
  console.log(`code=${code.slice(0, 12)}… state ✓`);

  // -------- 5. /oauth/token grant=authorization_code --------
  step('5. POST /oauth/token (authorization_code)');
  const tokenResp = await fetch(`${ORIGIN}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'http://localhost:9999/cb',
      client_id: clientId,
      code_verifier: verifier,
      resource: RESOURCE,
    }).toString(),
  });
  if (tokenResp.status !== 200) {
    fail(`token: ${tokenResp.status} ${await tokenResp.text()}`);
  }
  const tokenBody = await tokenResp.json();
  const { access_token, refresh_token, token_type, expires_in, scope } = tokenBody;
  if (token_type !== 'Bearer') fail(`token: unexpected token_type ${token_type}`);
  if (!access_token || !refresh_token) fail('token: missing tokens');
  console.log(`access_token (${access_token.length}b) refresh_token (${refresh_token.length}b) expires_in=${expires_in} scope=${scope}`);

  // -------- 6. Code replay must fail --------
  step('6. Replay authorization_code (should fail with invalid_grant)');
  const replay = await fetch(`${ORIGIN}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'http://localhost:9999/cb',
      client_id: clientId,
      code_verifier: verifier,
      resource: RESOURCE,
    }).toString(),
  });
  if (replay.status === 200) fail('replay: code was reusable — single-use enforcement broken');
  const replayBody = await replay.json();
  if (replayBody.error !== 'invalid_grant') fail(`replay: expected invalid_grant, got ${JSON.stringify(replayBody)}`);
  console.log(`✓ replay rejected (${replay.status} ${replayBody.error})`);

  // -------- 7. MCP tools/call ping with bearer --------
  step('7. POST /api/mcp tools/call ping (with bearer)');
  // First handshake: initialize
  const initResp = await fetch(`${ORIGIN}/api/mcp`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${access_token}`,
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'smoke-test', version: '0.0.0' },
      },
    }),
  });
  if (initResp.status !== 200) fail(`mcp initialize: ${initResp.status} ${await initResp.text()}`);
  const initText = await initResp.text();
  console.log(`mcp initialize OK (${initText.length}b)`);

  const toolResp = await fetch(`${ORIGIN}/api/mcp`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${access_token}`,
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'ping', arguments: { message: 'hello-smoke' } },
    }),
  });
  if (toolResp.status !== 200) fail(`mcp tools/call: ${toolResp.status} ${await toolResp.text()}`);
  const toolText = await toolResp.text();
  console.log(`mcp tools/call response: ${toolText.slice(0, 400)}${toolText.length > 400 ? '…' : ''}`);
  if (!toolText.includes(`"userId":"${userId}"`)) {
    fail(`mcp tools/call: expected userId=${userId} in response`);
  }
  if (!toolText.includes('"echo":"hello-smoke"')) fail('mcp tools/call: echo missing');
  console.log(`✓ userId threaded through to tool handler`);

  // -------- 8. Bearer with bogus token → 401 --------
  step('8. POST /api/mcp with bogus bearer');
  const bogusResp = await fetch(`${ORIGIN}/api/mcp`, {
    method: 'POST',
    headers: {
      authorization: 'Bearer not-a-real-token',
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/list', params: {} }),
  });
  if (bogusResp.status !== 401) fail(`bogus bearer: expected 401, got ${bogusResp.status}`);
  const wwwAuth = bogusResp.headers.get('www-authenticate');
  if (!wwwAuth?.includes('resource_metadata=')) fail(`bogus bearer: missing resource_metadata in WWW-Authenticate (${wwwAuth})`);
  console.log(`✓ 401 + WWW-Authenticate ok`);

  // -------- 9. refresh_token grant → new pair, old refresh dies --------
  step('9. POST /oauth/token (refresh_token)');
  const refreshResp = await fetch(`${ORIGIN}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token,
      client_id: clientId,
      resource: RESOURCE,
    }).toString(),
  });
  if (refreshResp.status !== 200) fail(`refresh: ${refreshResp.status} ${await refreshResp.text()}`);
  const refreshBody = await refreshResp.json();
  if (!refreshBody.access_token || !refreshBody.refresh_token) fail('refresh: missing tokens');
  if (refreshBody.refresh_token === refresh_token) fail('refresh: refresh_token was not rotated');
  console.log(`✓ rotated to new pair`);

  step('10. Replay old refresh_token (should fail invalid_grant)');
  const replayRefresh = await fetch(`${ORIGIN}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token,
      client_id: clientId,
      resource: RESOURCE,
    }).toString(),
  });
  if (replayRefresh.status === 200) fail('refresh replay: old refresh accepted — rotation broken');
  console.log(`✓ old refresh rejected (${replayRefresh.status})`);

  console.log('\nALL CHECKS PASSED ✓');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
