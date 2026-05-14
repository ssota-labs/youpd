-- v0.2: Custom Access Token Hook — stamps MCP-specific aud + scope on tokens
-- issued via the OAuth Server flow so our remote MCP can enforce RFC 8707
-- audience binding and a `mcp` scope check (apps/mcp/src/oauth/verify-token).
--
-- Scope: OAuth-issued tokens only. Other flows (web SSR session via password
-- / magic link / etc.) carry no client_id claim, so we leave them with the
-- default `aud="authenticated"` and no scope claim. That keeps apps/web and
-- apps/admin RLS contexts untouched.
--
-- The resource URL must match the value of MCP_OAUTH_RESOURCE in Vercel env
-- for verify-token's audience check to pass.

-- Resource URL is read from the Postgres GUC `app.mcp_resource` so different
-- environments (local dev, preview, production) can override without forking
-- the migration. Set per environment with:
--   alter database postgres set app.mcp_resource = 'http://localhost:3002/api/mcp';
-- Unset → falls back to the production value baked into the function below.

create or replace function public.mcp_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims      jsonb := coalesce(event->'claims', '{}'::jsonb);
  client_id   text  := claims->>'client_id';
  -- current_setting(..., true) returns NULL instead of raising when unset.
  mcp_resource text := coalesce(
    nullif(current_setting('app.mcp_resource', true), ''),
    'https://youpd-mcp.vercel.app/api/mcp'
  );
  scope_str   text;
begin
  -- Non-OAuth flows: untouched. Custom token hook signature requires us to
  -- return the original event shape.
  if client_id is null then
    return event;
  end if;

  -- RFC 8707 audience binding: bind every OAuth-issued token to our MCP
  -- resource URI. verify-token rejects anything else.
  claims := jsonb_set(claims, '{aud}', to_jsonb(mcp_resource), true);

  -- Ensure the JWT `scope` claim carries `mcp`. Supabase OIDC scope handling
  -- targets ID tokens / UserInfo, not access-token claims, so we materialize
  -- it here. Preserve whatever the AS already put in `scope` (if any).
  scope_str := coalesce(claims->>'scope', '');
  if position('mcp' in scope_str) = 0 then
    scope_str := trim(both ' ' from scope_str || ' mcp');
    claims := jsonb_set(claims, '{scope}', to_jsonb(scope_str), true);
  end if;

  return jsonb_build_object('claims', claims);
end;
$$;

-- Supabase Auth invokes this as supabase_auth_admin. Lock everything else out.
grant execute on function public.mcp_access_token_hook(jsonb)
  to supabase_auth_admin;
revoke execute on function public.mcp_access_token_hook(jsonb)
  from authenticated, anon, public;
