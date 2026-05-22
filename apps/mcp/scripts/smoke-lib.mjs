// Shared helpers for MCP smoke scripts (Supabase OAuth Server + MCP JSON-RPC).
import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'node:crypto';
import { execSync } from 'node:child_process';

export const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const MCP_ORIGIN = 'http://localhost:3002';
export const AUTH_BASE = `${SUPABASE_URL.replace(/\/+$/, '')}/auth/v1`;
export const RESOURCE =
  process.env.MCP_OAUTH_RESOURCE ?? `${MCP_ORIGIN.replace(/\/+$/, '')}/api/mcp`;

export function requireEnv() {
  if (!SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY must be set');
  }
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function pkce() {
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

export function authHeaders(bearer, json = false) {
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    accept: 'application/json, text/event-stream',
  };
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  if (json) headers['content-type'] = 'application/json';
  return headers;
}

export function parseMcpJson(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith('event:')) {
    for (const line of trimmed.split('\n')) {
      if (line.startsWith('data:')) return JSON.parse(line.slice(5).trim());
    }
    throw new Error('SSE response missing data line');
  }
  return JSON.parse(trimmed);
}

export function extractStructured(payload) {
  const result = payload.result;
  if (result?.structuredContent) return result.structuredContent;
  const text = result?.content?.[0]?.text;
  if (text) return JSON.parse(text);
  throw new Error(`Unexpected MCP payload: ${JSON.stringify(payload).slice(0, 400)}`);
}

export function ensureLocalMcpResource() {
  if (!SUPABASE_URL.includes('127.0.0.1') && !SUPABASE_URL.includes('localhost')) return;
  try {
    execSync(
      `docker exec -e PGPASSWORD=postgres supabase_db_musing-napier-776d19 psql -U supabase_admin -d postgres -c "ALTER DATABASE postgres SET app.mcp_resource = '${RESOURCE}';"`,
      { stdio: ['ignore', 'ignore', 'pipe'] },
    );
  } catch {
    console.warn('warn: could not set app.mcp_resource');
  }
}

export async function obtainAccessToken() {
  requireEnv();
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `workflow-smoke-${Date.now()}@example.com`;
  const password = 'SmokeTestPass!123';
  const { error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr) throw new Error(`admin.createUser: ${createErr.message}`);

  const user = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signIn, error: signInErr } = await user.auth.signInWithPassword({
    email,
    password,
  });
  if (signInErr) throw new Error(`signInWithPassword: ${signInErr.message}`);
  const userBearer = signIn.session.access_token;

  const regResp = await fetch(`${AUTH_BASE}/oauth/clients/register`, {
    method: 'POST',
    headers: authHeaders(undefined, true),
    body: JSON.stringify({
      client_name: 'workflow-smoke',
      redirect_uris: ['http://localhost:9999/cb'],
      token_endpoint_auth_method: 'none',
    }),
  });
  if (!regResp.ok) throw new Error(`register: ${regResp.status} ${await regResp.text()}`);
  const { client_id: clientId } = await regResp.json();

  const { verifier, challenge } = pkce();
  const authParams = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: 'http://localhost:9999/cb',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state: b64url(randomBytes(16)),
    scope: 'openid',
    resource: RESOURCE,
  });
  const authResp = await fetch(`${AUTH_BASE}/oauth/authorize?${authParams}`, {
    redirect: 'manual',
    headers: authHeaders(userBearer),
  });
  const authLocation = authResp.headers.get('location') ?? '';
  if (authResp.status !== 302) {
    throw new Error(`authorize: ${authResp.status} ${authLocation}`);
  }

  let code;
  if (authLocation.includes('authorization_id=')) {
    const authId = new URL(authLocation).searchParams.get('authorization_id');
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
    if (!consentResp.ok) throw new Error(`consent: ${consentResp.status} ${await consentResp.text()}`);
    const consentBody = await consentResp.json();
    code = new URL(consentBody.redirect_url).searchParams.get('code');
  } else {
    code = new URL(authLocation).searchParams.get('code');
  }
  if (!code) throw new Error('missing authorization code');

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
  if (!tokenResp.ok) throw new Error(`token: ${tokenResp.status} ${await tokenResp.text()}`);
  const { access_token: accessToken } = await tokenResp.json();
  if (!accessToken) throw new Error('token: missing access_token');
  return accessToken;
}

export async function mcpCall(accessToken, id, method, params) {
  const resp = await fetch(`${MCP_ORIGIN}/api/mcp`, {
    method: 'POST',
    headers: authHeaders(accessToken, true),
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });
  const bodyText = await resp.text();
  if (resp.status !== 200) throw new Error(`mcp ${method}: ${resp.status} ${bodyText}`);
  const payload = parseMcpJson(bodyText);
  if (payload.error) throw new Error(`mcp ${method} error: ${JSON.stringify(payload.error)}`);
  return payload;
}
