import 'server-only';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

// Opaque random tokens — 32 bytes base64url-encoded. We store sha256(hex) in
// the DB and never persist the plaintext. Stronger than JWTs for this use case
// because revoke is one UPDATE and there is no signing-key rotation drama.

export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Constant-time comparison for confidential client secrets at the token endpoint.
export function secretsEqual(provided: string, expectedHash: string): boolean {
  const providedHash = hashToken(provided);
  const a = Buffer.from(providedHash, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// PKCE S256 verifier check (RFC 7636 §4.6): BASE64URL(SHA256(verifier)) == challenge.
export function verifyPkceS256(verifier: string, challenge: string): boolean {
  const computed = createHash('sha256').update(verifier).digest('base64url');
  if (computed.length !== challenge.length) return false;
  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(challenge));
  } catch {
    return false;
  }
}
