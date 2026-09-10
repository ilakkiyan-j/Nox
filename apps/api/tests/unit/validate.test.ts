import { validateSafeUrl, parseSafeUrl, isSafeString, limitString } from '../../src/lib/validate';

describe('URL validation', () => {
  test('accepts http/https/mailto/tel urls', () => {
    expect(validateSafeUrl('https://example.com')).toBeNull();
    expect(validateSafeUrl('http://example.com/path?q=1')).toBeNull();
    expect(validateSafeUrl('mailto:jane@example.com')).toBeNull();
    expect(validateSafeUrl('tel:+1234567890')).toBeNull();
  });

  test('rejects dangerous URL schemes', () => {
    expect(validateSafeUrl('javascript:alert(1)')).toContain('not allowed');
    expect(validateSafeUrl('data:text/html,<script>alert(1)</script>')).toContain('not allowed');
    expect(validateSafeUrl('vbscript:msgbox(1)')).toContain('not allowed');
    expect(validateSafeUrl('file:///etc/passwd')).toContain('not allowed');
  });

  test('rejects embedded credentials in URLs', () => {
    expect(validateSafeUrl('https://user:pass@example.com')).toContain('credentials');
  });

  test('rejects invalid URL formats and oversized values', () => {
    expect(validateSafeUrl('not a url')).toContain('Invalid URL format');
    expect(validateSafeUrl('https://' + 'a'.repeat(3000))).toContain('URL must be a non-empty string');
  });

  test('accepts empty / null values', () => {
    expect(validateSafeUrl('')).toBeNull();
    expect(validateSafeUrl(null)).toBeNull();
    expect(validateSafeUrl(undefined)).toBeNull();
  });

  test('parseSafeUrl prefixes missing schemes with https', () => {
    expect(parseSafeUrl('example.com')).toEqual({ ok: true, value: 'https://example.com' });
    expect(parseSafeUrl('https://example.com')).toEqual({ ok: true, value: 'https://example.com' });
    expect(parseSafeUrl('javascript:evil()').ok).toBe(false);
  });
});

describe('String limits', () => {
  test('isSafeString validates length boundaries', () => {
    expect(isSafeString('hello')).toBe(true);
    expect(isSafeString('   ')).toBe(false);
    expect(isSafeString('')).toBe(false);
    expect(isSafeString(42)).toBe(false);
    expect(isSafeString('x'.repeat(5001))).toBe(false);
    expect(isSafeString('x'.repeat(5000))).toBe(true);
  });

  test('limitString truncates long values', () => {
    expect(limitString('abcde', 3)).toBe('abc');
    expect(limitString(123, 3, 'fallback')).toBe('fallback');
  });
});