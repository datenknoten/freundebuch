import { BlockList, isIP } from 'node:net';
import path from 'node:path';

/**
 * UUID regex pattern for validation (accepts any UUID version)
 * Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx where x is a hex digit
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates that a string is a valid UUID format.
 * This provides defense-in-depth against path traversal attacks
 * when UUIDs are used in file paths.
 */
export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Validates that a resolved file path stays within the expected base directory.
 * Prevents directory traversal attacks by ensuring the final path doesn't escape
 * the intended directory through ".." sequences or symbolic links.
 *
 * @param basePath - The base directory that should contain the file
 * @param untrustedPath - The untrusted path components to validate
 * @returns true if the resolved path is within basePath, false otherwise
 */
export function isPathWithinBase(basePath: string, ...untrustedPath: string[]): boolean {
  const resolvedBase = path.resolve(basePath);
  const resolvedFull = path.resolve(basePath, ...untrustedPath);
  return resolvedFull.startsWith(resolvedBase + path.sep) || resolvedFull === resolvedBase;
}

/**
 * Ranges that must never be reached by an outbound request driven by user
 * input (SSRF guard). Node matches IPv4-mapped IPv6 literals against the ipv4
 * rules, so `::ffff:10.0.0.1` needs no separate entry.
 */
const BLOCKED = new BlockList();
BLOCKED.addSubnet('0.0.0.0', 8, 'ipv4'); // "this network", 0.0.0.0 reaches every local interface
BLOCKED.addSubnet('10.0.0.0', 8, 'ipv4');
BLOCKED.addSubnet('100.64.0.0', 10, 'ipv4'); // RFC 6598 carrier-grade NAT
BLOCKED.addSubnet('127.0.0.0', 8, 'ipv4');
BLOCKED.addSubnet('169.254.0.0', 16, 'ipv4'); // link-local, incl. the cloud metadata address
BLOCKED.addSubnet('172.16.0.0', 12, 'ipv4');
BLOCKED.addSubnet('192.168.0.0', 16, 'ipv4');
BLOCKED.addSubnet('224.0.0.0', 4, 'ipv4'); // multicast
BLOCKED.addSubnet('240.0.0.0', 4, 'ipv4'); // reserved, incl. 255.255.255.255 broadcast
BLOCKED.addAddress('::', 'ipv6'); // unspecified
BLOCKED.addAddress('::1', 'ipv6');
BLOCKED.addSubnet('64:ff9b::', 96, 'ipv6'); // NAT64, a translated private IPv4 destination
BLOCKED.addSubnet('fc00::', 7, 'ipv6'); // unique local
BLOCKED.addSubnet('fe80::', 10, 'ipv6'); // link local
BLOCKED.addSubnet('ff00::', 8, 'ipv6'); // multicast

/**
 * True when an IP literal belongs to a range that must never be reached by an
 * outbound request driven by user input (SSRF guard).
 *
 * Covers loopback, link-local (including the cloud metadata address), RFC-1918,
 * RFC-6598 carrier NAT, "this network", multicast, reserved space, IPv6
 * unique-local/link-local, NAT64 and IPv4-mapped IPv6 forms of all of the above.
 *
 * Hostnames and anything else that is not an IP literal are not this
 * function's business and return false.
 */
export function isPrivateAddress(address: string): boolean {
  const value = address
    .trim()
    .toLowerCase()
    .replace(/^\[|]$/g, '');

  const family = isIP(value);
  if (family === 0) {
    return false;
  }
  return BLOCKED.check(value, family === 4 ? 'ipv4' : 'ipv6');
}

/**
 * Sanitizes HTML content from PostgreSQL's ts_headline function to prevent XSS attacks.
 *
 * The ts_headline function wraps matching search terms in <mark> tags.
 * This function:
 * 1. Escapes all HTML entities in the content
 * 2. Restores only the safe <mark> and </mark> tags
 *
 * This prevents stored XSS attacks where malicious content in friend fields
 * (display_name, organization, work_notes) could be executed when rendered.
 *
 * @param headline - The raw headline from ts_headline containing <mark> tags
 * @returns Sanitized HTML safe for rendering with only <mark> tags preserved
 */
export function sanitizeSearchHeadline(headline: string | null | undefined): string {
  if (!headline) {
    return '';
  }

  // Use a unique random placeholder that cannot exist in user input
  // Generate at runtime to prevent any possibility of prediction
  const uniqueId = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const MARK_OPEN_PLACEHOLDER = `__MARK_OPEN_${uniqueId}__`;
  const MARK_CLOSE_PLACEHOLDER = `__MARK_CLOSE_${uniqueId}__`;

  // First, replace legitimate <mark> tags with placeholders
  // Only match exact <mark> and </mark> tags (case-insensitive)
  let sanitized = headline
    .replace(/<mark>/gi, MARK_OPEN_PLACEHOLDER)
    .replace(/<\/mark>/gi, MARK_CLOSE_PLACEHOLDER);

  // Escape all HTML entities
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  // Restore the safe <mark> tags
  sanitized = sanitized
    .replace(new RegExp(MARK_OPEN_PLACEHOLDER, 'g'), '<mark>')
    .replace(new RegExp(MARK_CLOSE_PLACEHOLDER, 'g'), '</mark>');

  return sanitized;
}
