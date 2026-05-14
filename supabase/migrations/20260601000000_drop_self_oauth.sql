-- v0.2: retire the self-hosted OAuth 2.1 AS in favor of Supabase OAuth Server.
-- The 5 oauth_* tables backed apps/mcp/src/oauth/* + a custom verify-token.
-- After cutover, verify-token validates Supabase-issued JWTs via JWKS instead,
-- so these tables hold only stale rows from the v0.1 issuer.
--
-- Drop only after the production cutover has run (24h soak per design doc §8).
-- Ordering: refresh_tokens depends on access_tokens (replaced_by_token_id),
-- access_tokens + authorization_codes depend on clients/auth_requests; CASCADE
-- removes their FKs and policies in one shot.

drop table if exists public.oauth_refresh_tokens cascade;
drop table if exists public.oauth_access_tokens cascade;
drop table if exists public.oauth_authorization_codes cascade;
drop table if exists public.oauth_authorization_requests cascade;
drop table if exists public.oauth_clients cascade;
