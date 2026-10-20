import { BlockList, isIP } from 'node:net';

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
export function isPrivateAddress(address: string) {
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
