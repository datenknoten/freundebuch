import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Convert legacy varchar(n) columns to TEXT to match the project convention
 * (docs/database-conventions.md: use TEXT, never VARCHAR(n)). These columns
 * predate the convention; later migrations already use text. ALTER ... TYPE
 * text is a metadata-only change in PostgreSQL (no table rewrite).
 *
 * down() restores the original lengths captured from the live schema. Note
 * it is only safe as an immediate rollback: once TEXT values longer than the
 * old VARCHAR(n) limits have been written, the down() ALTER will fail (or
 * would truncate) — by design, since the point of this migration is to drop
 * those limits.
 */
const COLUMNS: Array<[schema: string, table: string, column: string, length: number]> = [
  ['auth', 'app_passwords', 'name', 100],
  ['auth', 'app_passwords', 'password_hash', 255],
  ['auth', 'app_passwords', 'password_prefix', 8],
  ['collectives', 'collective_addresses', 'address_type', 20],
  ['collectives', 'collective_addresses', 'city', 100],
  ['collectives', 'collective_addresses', 'country', 100],
  ['collectives', 'collective_addresses', 'label', 100],
  ['collectives', 'collective_addresses', 'postal_code', 20],
  ['collectives', 'collective_addresses', 'state_province', 100],
  ['collectives', 'collective_emails', 'email_address', 255],
  ['collectives', 'collective_emails', 'email_type', 20],
  ['collectives', 'collective_emails', 'label', 100],
  ['collectives', 'collective_phones', 'label', 100],
  ['collectives', 'collective_phones', 'phone_number', 50],
  ['collectives', 'collective_phones', 'phone_type', 20],
  ['collectives', 'collective_urls', 'label', 100],
  ['collectives', 'collective_urls', 'url_type', 20],
  ['friends', 'friend_addresses', 'address_type', 20],
  ['friends', 'friend_addresses', 'city', 100],
  ['friends', 'friend_addresses', 'country', 100],
  ['friends', 'friend_addresses', 'label', 100],
  ['friends', 'friend_addresses', 'postal_code', 20],
  ['friends', 'friend_addresses', 'state_province', 100],
  ['friends', 'friend_addresses', 'street_line1', 255],
  ['friends', 'friend_addresses', 'street_line2', 255],
  ['friends', 'friend_changes', 'change_type', 10],
  ['friends', 'friend_emails', 'email_address', 255],
  ['friends', 'friend_emails', 'email_type', 20],
  ['friends', 'friend_emails', 'label', 100],
  ['friends', 'friend_phones', 'label', 100],
  ['friends', 'friend_phones', 'phone_number', 50],
  ['friends', 'friend_phones', 'phone_type', 20],
  ['friends', 'friend_urls', 'label', 100],
  ['friends', 'friend_urls', 'url', 500],
  ['friends', 'friend_urls', 'url_type', 20],
  ['friends', 'friends', 'display_name', 255],
  ['friends', 'friends', 'name_first', 100],
  ['friends', 'friends', 'name_last', 100],
  ['friends', 'friends', 'name_middle', 100],
  ['friends', 'friends', 'name_prefix', 50],
  ['friends', 'friends', 'name_suffix', 50],
  ['friends', 'friends', 'nickname', 100],
  ['friends', 'friends', 'photo_thumbnail_url', 500],
  ['friends', 'friends', 'photo_url', 500],
];

export async function up(pgm: MigrationBuilder): Promise<void> {
  for (const [schema, table, column] of COLUMNS) {
    pgm.sql(`ALTER TABLE "${schema}"."${table}" ALTER COLUMN "${column}" TYPE text;`);
  }
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  for (const [schema, table, column, length] of COLUMNS) {
    pgm.sql(`ALTER TABLE "${schema}"."${table}" ALTER COLUMN "${column}" TYPE varchar(${length});`);
  }
}
