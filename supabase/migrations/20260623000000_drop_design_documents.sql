-- Remove v0.4 thumbnail/designer persistence (design_documents, templates, orgs).
-- YouPD product focus is YouTube planning + MCP workflows; designer storage is retired.

do $$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'design_documents'
  ) then
    alter publication supabase_realtime drop table public.design_documents;
  elsif exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'thumbnails'
  ) then
    alter publication supabase_realtime drop table public.thumbnails;
  end if;
end $$;

drop table if exists public.design_document_versions cascade;
drop table if exists public.design_documents cascade;
drop table if exists public.thumbnail_versions cascade;
drop table if exists public.thumbnails cascade;
drop table if exists public.templates cascade;
drop table if exists public.orgs cascade;
