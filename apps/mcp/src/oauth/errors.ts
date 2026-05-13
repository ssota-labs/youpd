import 'server-only';

// OAuth 2.1 §5.3 / §4.1.2.1 error responses. JSON for token endpoint, redirect
// for the authorize endpoint after the redirect_uri has been validated.

export type OauthErrorCode =
  | 'invalid_request'
  | 'invalid_client'
  | 'invalid_grant'
  | 'unauthorized_client'
  | 'unsupported_grant_type'
  | 'invalid_scope'
  | 'invalid_target'
  | 'access_denied'
  | 'unsupported_response_type'
  | 'server_error';

export function oauthErrorResponse(
  code: OauthErrorCode,
  description: string,
  status = 400,
): Response {
  return Response.json(
    { error: code, error_description: description },
    {
      status,
      headers: { 'cache-control': 'no-store' },
    },
  );
}

export function authorizeRedirectError(
  redirectUri: string,
  state: string | undefined,
  code: OauthErrorCode,
  description: string,
): Response {
  const url = new URL(redirectUri);
  url.searchParams.set('error', code);
  url.searchParams.set('error_description', description);
  if (state) url.searchParams.set('state', state);
  return Response.redirect(url.toString(), 302);
}
