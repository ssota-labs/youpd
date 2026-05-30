-- S4: stage-based reference evidence pool (folder groups, folders, saved videos).

create table if not exists public.reference_folder_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workspace_id uuid,
  title text not null,
  audience text not null,
  seed_theme text not null,
  intent_summary text not null,
  origin_user_probe_id uuid references public.user_keyword_probes (id) on delete set null,
  profile_snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reference_folder_groups_user_updated_idx
  on public.reference_folder_groups (user_id, updated_at desc);

alter table public.reference_folder_groups enable row level security;
drop policy if exists "deny_all" on public.reference_folder_groups;
create policy "deny_all"
  on public.reference_folder_groups
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.reference_folders (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.reference_folder_groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  consumer_stage text,
  sort_order int not null default 0,
  is_stage_template boolean not null default false,
  is_unspecified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, name)
);

alter table public.reference_folders enable row level security;
drop policy if exists "deny_all" on public.reference_folders;
create policy "deny_all"
  on public.reference_folders
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.reference_folder_videos (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.reference_folders (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  video_id text not null references public.youtube_videos (video_id) on delete cascade,
  lineage jsonb not null,
  save_reason text,
  created_at timestamptz not null default now(),
  unique (folder_id, video_id)
);

alter table public.reference_folder_videos enable row level security;
drop policy if exists "deny_all" on public.reference_folder_videos;
create policy "deny_all"
  on public.reference_folder_videos
  for all
  to anon, authenticated
  using (false)
  with check (false);
