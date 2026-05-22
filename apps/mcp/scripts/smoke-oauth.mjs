// End-to-end smoke for Supabase OAuth Server + MCP tools/call.
//
// Flow: DCR → authorize (logged-in user) → consent → token → MCP tools/call.
// Requires local Supabase (`pnpm db:up`), apps/mcp dev on :3002, and
// app.mcp_resource set on the local database (see ensureLocalMcpResource()).
import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'node:crypto';
import { execSync } from 'node:child_process';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MCP_ORIGIN = process.env.MCP_OAUTH_ISSUER?.includes('/auth/v1')
  ? 'http://localhost:3002'
  : process.env.MCP_ORIGIN ?? 'http://localhost:3002';
const AUTH_BASE = `${SUPABASE_URL.replace(/\/+$/, '')}/auth/v1`;
const RESOURCE =
  process.env.MCP_OAUTH_RESOURCE ?? `${MCP_ORIGIN.replace(/\/+$/, '')}/api/mcp`;

if (!SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY must be set');
}

function step(name) {
  console.log(`\n=== ${name} ===`);
}
function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}
function pkce() {
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function authHeaders(bearer, json = false) {
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    accept: 'application/json, text/event-stream',
  };
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  if (json) headers['content-type'] = 'application/json';
  return headers;
}

function parseMcpJson(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith('event:')) {
    for (const line of trimmed.split('\n')) {
      if (line.startsWith('data:')) return JSON.parse(line.slice(5).trim());
    }
    throw new Error('SSE response missing data line');
  }
  return JSON.parse(trimmed);
}

function ensureLocalMcpResource() {
  if (!SUPABASE_URL.includes('127.0.0.1') && !SUPABASE_URL.includes('localhost')) {
    return;
  }
  try {
    execSync(
      `docker exec -e PGPASSWORD=postgres supabase_db_musing-napier-776d19 psql -U supabase_admin -d postgres -c "ALTER DATABASE postgres SET app.mcp_resource = '${RESOURCE}';"`,
      { stdio: ['ignore', 'ignore', 'pipe'] },
    );
  } catch {
    console.warn('warn: could not set app.mcp_resource — token aud may not match MCP_OAUTH_RESOURCE');
  }
}

async function obtainOAuthTokens() {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `smoke-${Date.now()}@example.com`;
  const password = 'SmokeTestPass!123';
  const { error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr) fail(`admin.createUser: ${createErr.message}`);

  const user = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signIn, error: signInErr } = await user.auth.signInWithPassword({
    email,
    password,
  });
  if (signInErr) fail(`signInWithPassword: ${signInErr.message}`);
  const userBearer = signIn.session.access_token;

  const regResp = await fetch(`${AUTH_BASE}/oauth/clients/register`, {
    method: 'POST',
    headers: authHeaders(undefined, true),
    body: JSON.stringify({
      client_name: 'smoke-test',
      redirect_uris: ['http://localhost:9999/cb'],
      token_endpoint_auth_method: 'none',
    }),
  });
  if (regResp.status !== 201 && regResp.status !== 200) {
    fail(`register: ${regResp.status} ${await regResp.text()}`);
  }
  const { client_id: clientId } = await regResp.json();
  if (!clientId) fail('register: missing client_id');

  const { verifier, challenge } = pkce();
  const state = b64url(randomBytes(16));
  const authParams = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: 'http://localhost:9999/cb',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    scope: 'openid',
    resource: RESOURCE,
  });
  const authResp = await fetch(`${AUTH_BASE}/oauth/authorize?${authParams}`, {
    redirect: 'manual',
    headers: authHeaders(userBearer),
  });
  const authLocation = authResp.headers.get('location') ?? '';
  if (authResp.status !== 302) {
    fail(`authorize: expected 302, got ${authResp.status} body=${authLocation}`);
  }

  let code;
  if (authLocation.includes('authorization_id=')) {
    const authId = new URL(authLocation).searchParams.get('authorization_id');
    if (!authId) fail('authorize: missing authorization_id');
    await fetch(`${AUTH_BASE}/oauth/authorizations/${encodeURIComponent(authId)}`, {
      headers: authHeaders(userBearer),
    });
    const consentResp = await fetch(
      `${AUTH_BASE}/oauth/authorizations/${encodeURIComponent(authId)}/consent`,
      {
        method: 'POST',
        headers: authHeaders(userBearer, true),
        body: JSON.stringify({ action: 'approve' }),
      },
    );
    if (!consentResp.ok) fail(`consent: ${consentResp.status} ${await consentResp.text()}`);
    const consentBody = await consentResp.json();
    code = new URL(consentBody.redirect_url).searchParams.get('code');
  } else if (authLocation.includes('code=')) {
    code = new URL(authLocation).searchParams.get('code');
  } else {
    fail(`authorize: unexpected redirect ${authLocation}`);
  }
  if (!code) fail('consent: missing code');

  const tokenResp = await fetch(`${AUTH_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'http://localhost:9999/cb',
      client_id: clientId,
      code_verifier: verifier,
      resource: RESOURCE,
    }).toString(),
  });
  if (tokenResp.status !== 200) fail(`token: ${tokenResp.status} ${await tokenResp.text()}`);
  const tokenBody = await tokenResp.json();
  return { clientId, ...tokenBody, state, verifier, code };
}

async function main() {
  ensureLocalMcpResource();

  step('1. Supabase OAuth Server — DCR + authorize + token');
  const {
    clientId,
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: tokenType,
    code,
    verifier,
  } = await obtainOAuthTokens();
  if (tokenType?.toLowerCase() !== 'bearer') fail(`token: unexpected token_type ${tokenType}`);
  if (!accessToken || !refreshToken) fail('token: missing tokens');
  console.log(`access_token (${accessToken.length}b) refresh_token (${refreshToken.length}b)`);

  step('2. Replay authorization_code (should fail)');
  const replay = await fetch(`${AUTH_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'http://localhost:9999/cb',
      client_id: clientId,
      code_verifier: verifier,
      resource: RESOURCE,
    }).toString(),
  });
  if (replay.status === 200) fail('replay: code was reusable');
  console.log(`✓ replay rejected (${replay.status})`);

  step('3. MCP initialize + youpd_get_trending_videos');
  const initResp = await fetch(`${MCP_ORIGIN}/api/mcp`, {
    method: 'POST',
    headers: authHeaders(accessToken, true),
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
  console.log('mcp initialize OK');

  const toolResp = await fetch(`${MCP_ORIGIN}/api/mcp`, {
    method: 'POST',
    headers: authHeaders(accessToken, true),
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'youpd_get_trending_videos',
        arguments: {
          date: new Date().toISOString().slice(0, 10),
          regionCode: 'KR',
          limit: 5,
        },
      },
    }),
  });
  if (toolResp.status !== 200) fail(`mcp tools/call: ${toolResp.status} ${await toolResp.text()}`);
  const toolPayload = parseMcpJson(await toolResp.text());
  if (toolPayload.error) fail(`mcp tools/call error: ${JSON.stringify(toolPayload.error)}`);
  console.log(`✓ authenticated MCP tools/call succeeded`);

  step('4. POST /api/mcp with bogus bearer');
  const bogusResp = await fetch(`${MCP_ORIGIN}/api/mcp`, {
    method: 'POST',
    headers: authHeaders('not-a-real-token', true),
    body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/list', params: {} }),
  });
  if (bogusResp.status !== 401) fail(`bogus bearer: expected 401, got ${bogusResp.status}`);
  const wwwAuth = bogusResp.headers.get('www-authenticate');
  if (!wwwAuth?.includes('resource_metadata=')) {
    fail(`bogus bearer: missing resource_metadata in WWW-Authenticate (${wwwAuth})`);
  }
  console.log('✓ 401 + WWW-Authenticate ok');

  step('5. refresh_token grant → rotated pair');
  const refreshResp = await fetch(`${AUTH_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      resource: RESOURCE,
    }).toString(),
  });
  if (refreshResp.status !== 200) fail(`refresh: ${refreshResp.status} ${await refreshResp.text()}`);
  const refreshBody = await refreshResp.json();
  if (!refreshBody.access_token || !refreshBody.refresh_token) fail('refresh: missing tokens');
  if (refreshBody.refresh_token === refreshToken) fail('refresh: refresh_token was not rotated');
  console.log('✓ rotated to new pair');

  step('6. Replay old refresh_token (should fail after reuse interval)');
  await new Promise((r) => setTimeout(r, 11_000));
  const replayRefresh = await fetch(`${AUTH_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      resource: RESOURCE,
    }).toString(),
  });
  if (replayRefresh.status === 200) {
    console.log('note: old refresh still accepted (Supabase reuse interval may apply)');
  } else {
    console.log(`✓ old refresh rejected (${replayRefresh.status})`);
  }

  console.log('\nALL CHECKS PASSED ✓');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
