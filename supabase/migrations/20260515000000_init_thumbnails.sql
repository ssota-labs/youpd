-- v0.4 thumbnail designer schema.
-- Three core tables (orgs, thumbnails, templates) + an optional history
-- table (thumbnail_versions). All tables are deny-by-default under RLS;
-- the MCP/web layer accesses them via the service-role client and enforces
-- org-membership in repository code.

create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid(),
  owner_email text not null,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

alter table public.orgs enable row level security;
drop policy if exists "deny_all" on public.orgs;
create policy "deny_all"
  on public.orgs
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.thumbnails (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  notion_candidate_url text,
  channel_id text,
  name text,
  aspect text not null default '16:9',
  background jsonb,
  layers jsonb not null,
  export_png_url text,
  export_short_png_url text,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  updated_by text,
  constraint thumbnails_aspect_check check (aspect in ('16:9','9:16'))
);

create index if not exists idx_thumbnails_org_candidate
  on public.thumbnails (org_id, notion_candidate_url);
create index if not exists idx_thumbnails_updated_at
  on public.thumbnails (updated_at desc);

alter table public.thumbnails enable row level security;
drop policy if exists "deny_all" on public.thumbnails;
create policy "deny_all"
  on public.thumbnails
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- Supabase Realtime needs explicit publication membership for change events
-- to reach the iframe. Read access still flows through server-side endpoints.
alter publication supabase_realtime add table public.thumbnails;

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  aspect text not null,
  document jsonb not null,
  preview_url text,
  tags text[] not null default '{}'::text[],
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_templates_code
  on public.templates (code);
create index if not exists idx_templates_tags
  on public.templates using gin (tags);

alter table public.templates enable row level security;
drop policy if exists "deny_all" on public.templates;
create policy "deny_all"
  on public.templates
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.thumbnail_versions (
  id uuid primary key default gen_random_uuid(),
  thumbnail_id uuid not null references public.thumbnails(id) on delete cascade,
  version integer not null,
  layers jsonb not null,
  created_at timestamptz not null default now(),
  created_by text
);

create index if not exists idx_thumbnail_versions_thumbnail_version
  on public.thumbnail_versions (thumbnail_id, version);

alter table public.thumbnail_versions enable row level security;
drop policy if exists "deny_all" on public.thumbnail_versions;
create policy "deny_all"
  on public.thumbnail_versions
  for all
  to anon, authenticated
  using (false)
  with check (false);
