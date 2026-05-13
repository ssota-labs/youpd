create extension if not exists "pgcrypto";

create table if not exists public.health_checks (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text,
  created_at timestamptz not null default now()
);

alter table public.health_checks enable row level security;

-- Deny-all by default per AGENTS.md. Server-side service-role client bypasses RLS.
drop policy if exists "deny_all" on public.health_checks;
create policy "deny_all"
  on public.health_checks
  for all
  to anon, authenticated
  using (false)
  with check (false);
