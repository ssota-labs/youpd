import { describe, expect, it } from 'vitest';
import { createHash, randomBytes } from 'node:crypto';
import { generateToken, hashToken, secretsEqual, verifyPkceS256 } from './tokens';

describe('hashToken', () => {
  it('produces stable sha256 hex digest', () => {
    expect(hashToken('hello')).toBe(createHash('sha256').update('hello').digest('hex'));
  });
});

describe('generateToken', () => {
  it('produces a unique base64url token on each call', () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    // 32 bytes base64url-encoded = 43 chars, no padding
    expect(a.length).toBe(43);
  });
});

describe('verifyPkceS256', () => {
  it('matches challenge derived from BASE64URL(SHA256(verifier))', () => {
    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    expect(verifyPkceS256(verifier, challenge)).toBe(true);
  });

  it('rejects a wrong verifier', () => {
    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const wrong = randomBytes(32).toString('base64url');
    expect(verifyPkceS256(wrong, challenge)).toBe(false);
  });

  it('rejects when the challenge length differs', () => {
    const verifier = randomBytes(32).toString('base64url');
    expect(verifyPkceS256(verifier, 'too-short')).toBe(false);
  });

  it('matches a known RFC 7636 appendix B-style fixture', () => {
    // verifier from RFC 7636 §1.1 (well-known test vector); challenge derived.
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    expect(verifyPkceS256(verifier, challenge)).toBe(true);
  });
});

describe('secretsEqual', () => {
  it('returns true when sha256(plaintext) matches stored hash', () => {
    const secret = 'super-secret-value';
    const hash = hashToken(secret);
    expect(secretsEqual(secret, hash)).toBe(true);
  });

  it('returns false for a mismatched secret', () => {
    const hash = hashToken('correct-secret');
    expect(secretsEqual('wrong-secret', hash)).toBe(false);
  });

  it('returns false when the stored hash is malformed (different length)', () => {
    expect(secretsEqual('anything', 'not-a-valid-sha256-hex')).toBe(false);
  });
});
