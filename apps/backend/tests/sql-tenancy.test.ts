import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const QUERY_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../src/models/queries',
);

/**
 * Tables whose rows belong to exactly one user. A query that touches one of
 * these must prove ownership by joining `auth.users` on `external_id` (directly
 * or through a parent), because `external_id` values are handed to clients and
 * a client can send someone else's.
 */
const USER_OWNED = [
  'friends.friends',
  'friends.circles',
  'friends.search_history',
  'friends.friend_changes',
  'friends.friend_phones',
  'friends.friend_emails',
  'friends.friend_addresses',
  'friends.friend_urls',
  'friends.friend_dates',
  'friends.friend_social_profiles',
  'friends.friend_professional_history',
  'friends.friend_met_info',
  'friends.friend_relationships',
  'friends.friend_circles',
  'encounters.encounters',
  'encounters.encounter_friends',
  'collectives.collectives',
  'collectives.collective_types',
  'collectives.collective_members',
  'collectives.collective_phones',
  'collectives.collective_emails',
  'collectives.collective_addresses',
  'collectives.collective_urls',
  'collectives.collective_circles',
  'auth.app_passwords',
  'system.notification_channels',
];

/**
 * Queries that legitimately do not scope by user, each for a stated reason.
 * Adding a name here is a deliberate decision, not a way to silence the test.
 */
const ALLOWLIST: Record<string, string> = {
  // Maintenance and cron work, never reached from a request.
  deleteExpiredAddressCacheEntries: 'maintenance: no user context',
  TrimAddressCache: 'maintenance: size bound on the shared geocoder cache, no user context',
  PruneFriendChanges: 'maintenance: retention sweep across all users',
  ClaimChannelForNotification: 'cron: channel already resolved by GetEnabledChannelsDueAt',
  GetEnabledChannelsDueAt: 'cron: deliberately spans all users',
  UpdateAppPasswordLastUsed: 'app password already authenticated by its hash',
  // Identity-keyed: the parameter *is* the authenticated auth."user".id, and the
  // only user-owned table reached is that row's own self-profile.
  GetUserWithSelfProfile: 'keyed by the authenticated user id',
  GetUserSelfProfile: 'keyed by the authenticated user id',
  HasSelfProfile: 'keyed by the authenticated user id',
  GetSelfProfileExternalId: 'internal id read from the authenticated user row',
  // Internal-id helpers: the caller resolved ownership before calling them.
  GetAppPasswordsByUserIdAndPrefix: 'internal user id from an ownership-checked lookup',
  GetRulesForTypeInternal: 'internal type id resolved by an ownership-checked query',
  GetCollectiveTypeIdForCollective: 'internal collective id already ownership-checked',
  GetOtherActiveMembers: 'internal collective id already ownership-checked',
  CheckDuplicateActiveMembership: 'collective external id checked by the same caller',
  AddMembership: 'internal ids already ownership-checked in the same transaction',
  ReactivateMembership: 'internal ids already ownership-checked in the same transaction',
  CheckRelationshipExists: 'internal friend ids already ownership-checked',
  CreateRelationshipWithSource: 'internal friend ids already ownership-checked',
  DeleteRelationshipsByMembershipId: 'internal membership id already ownership-checked',
  GetPrimaryProfessionalHistory: 'internal friend id already ownership-checked',
};

interface Block {
  name: string;
  file: string;
  sql: string;
}

function readBlocks(): Block[] {
  const blocks: Block[] = [];
  for (const file of readdirSync(QUERY_DIR).filter((f) => f.endsWith('.sql'))) {
    const contents = readFileSync(path.join(QUERY_DIR, file), 'utf8');
    // PgTyped delimits queries with `/* @name Foo */`.
    const parts = contents.split(/\/\*\s*@name\s+(\w+)\s*\*\//);
    for (let i = 1; i < parts.length; i += 2) {
      const name = parts[i];
      const sql = parts[i + 1];
      if (name !== undefined && sql !== undefined) {
        blocks.push({ name, file, sql });
      }
    }
  }
  return blocks;
}

describe('SQL tenancy', () => {
  const blocks = readBlocks();

  it('finds every query block', () => {
    expect(blocks.length).toBeGreaterThan(150);
  });

  it('scopes every query on a user-owned table to auth.users', () => {
    const offenders = blocks
      .filter((block) => USER_OWNED.some((table) => block.sql.includes(table)))
      .filter((block) => !block.sql.includes('auth.users'))
      .filter((block) => ALLOWLIST[block.name] === undefined)
      .map((block) => `${block.file}: ${block.name}`);

    expect(offenders).toEqual([]);
  });

  it('keeps the allowlist free of stale entries', () => {
    const names = new Set(blocks.map((block) => block.name));
    const stale = Object.keys(ALLOWLIST).filter((name) => !names.has(name));

    expect(stale).toEqual([]);
  });
});
