-- MCP OAuth 2.1 Authorization Server tables.
-- All tables are deny-by-default (RLS on, no policies). The MCP app accesses
-- them via the service-role client; no end-user surface ever reaches these
-- tables directly.

create table if not exists public.oauth_clients (
  client_id text primary key,
  client_secret_hash text,
  redirect_uris jsonb not null,
  client_name text,
  token_endpoint_auth_method text not null default 'none',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.oauth_clients enable row level security;
drop policy if exists "deny_all" on public.oauth_clients;
create policy "deny_all"
  on public.oauth_clients
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.oauth_authorization_requests (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references public.oauth_clients(client_id) on delete cascade,
  redirect_uri text not null,
  scope text not null default 'mcp',
  state text not null,
  code_challenge text not null,
  code_challenge_method text not null,
  resource text not null,
  user_id uuid references auth.users(id) on delete cascade,
  approved_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.oauth_authorization_requests enable row level security;
drop policy if exists "deny_all" on public.oauth_authorization_requests;
create policy "deny_all"
  on public.oauth_authorization_requests
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.oauth_authorization_codes (
  code_hash text primary key,
  client_id text not null references public.oauth_clients(client_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  redirect_uri text not null,
  code_challenge text not null,
  code_challenge_method text not null,
  scope text not null,
  resource text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists oauth_authorization_codes_client_user_idx
  on public.oauth_authorization_codes (client_id, user_id);

alter table public.oauth_authorization_codes enable row level security;
drop policy if exists "deny_all" on public.oauth_authorization_codes;
create policy "deny_all"
  on public.oauth_authorization_codes
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.oauth_access_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  client_id text not null references public.oauth_clients(client_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null,
  resource text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists oauth_access_tokens_client_user_idx
  on public.oauth_access_tokens (client_id, user_id);
create index if not exists oauth_access_tokens_expires_idx
  on public.oauth_access_tokens (expires_at);

alter table public.oauth_access_tokens enable row level security;
drop policy if exists "deny_all" on public.oauth_access_tokens;
create policy "deny_all"
  on public.oauth_access_tokens
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.oauth_refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  client_id text not null references public.oauth_clients(client_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null,
  resource text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  replaced_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists oauth_refresh_tokens_client_user_idx
  on public.oauth_refresh_tokens (client_id, user_id);
create index if not exists oauth_refresh_tokens_expires_idx
  on public.oauth_refresh_tokens (expires_at);

alter table public.oauth_refresh_tokens enable row level security;
drop policy if exists "deny_all" on public.oauth_refresh_tokens;
create policy "deny_all"
  on public.oauth_refresh_tokens
  for all
  to anon, authenticated
  using (false)
  with check (false);
