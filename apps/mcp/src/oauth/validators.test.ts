import { describe, expect, it } from 'vitest';
import { isAllowedRedirectUri } from './validators';

describe('isAllowedRedirectUri', () => {
  it('accepts https:// URIs', () => {
    expect(isAllowedRedirectUri('https://client.example.com/cb')).toBe(true);
    expect(isAllowedRedirectUri('https://example.com')).toBe(true);
  });

  it('accepts http://localhost and http://127.0.0.1 with any port', () => {
    expect(isAllowedRedirectUri('http://localhost/cb')).toBe(true);
    expect(isAllowedRedirectUri('http://localhost:9999/cb')).toBe(true);
    expect(isAllowedRedirectUri('http://127.0.0.1:3000/oauth/cb')).toBe(true);
  });

  it('rejects http:// to any non-loopback host', () => {
    expect(isAllowedRedirectUri('http://example.com/cb')).toBe(false);
    expect(isAllowedRedirectUri('http://192.168.1.5/cb')).toBe(false);
    expect(isAllowedRedirectUri('http://evil.com/cb')).toBe(false);
  });

  it('rejects non-http(s) schemes (javascript:, data:, file:, custom)', () => {
    expect(isAllowedRedirectUri('javascript:alert(1)')).toBe(false);
    expect(isAllowedRedirectUri('data:text/html,<x>')).toBe(false);
    expect(isAllowedRedirectUri('file:///etc/passwd')).toBe(false);
    expect(isAllowedRedirectUri('myapp://cb')).toBe(false);
  });

  it('rejects strings that are not valid URIs', () => {
    expect(isAllowedRedirectUri('not a url')).toBe(false);
    expect(isAllowedRedirectUri('')).toBe(false);
    expect(isAllowedRedirectUri('//example.com/cb')).toBe(false);
  });
});
