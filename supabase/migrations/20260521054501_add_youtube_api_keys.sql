-- Preserved migration version for existing Supabase preview branches.
--
-- This migration originally created an older youtube_api_keys shape on this
-- feature branch. Main now owns the canonical key-pool schema in
-- 20260518000000_youtube_api_keys.sql, and
-- 20260602020000_reconcile_youtube_api_keys.sql upgrades preview databases
-- that already applied this version.
do $$
begin
  null;
end $$;
