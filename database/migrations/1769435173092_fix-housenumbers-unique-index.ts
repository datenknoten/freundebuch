import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Drop the existing non-unique index
  pgm.sql(`DROP INDEX IF EXISTS geodata.idx_housenumbers_by_street`);

  // Create a unique index including house_number
  // This is required for REFRESH MATERIALIZED VIEW CONCURRENTLY
  pgm.sql(`
    CREATE UNIQUE INDEX idx_housenumbers_by_street
    ON geodata.housenumbers_by_street(country_code, postal_code, street, house_number)
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Revert to the original non-unique index
  pgm.sql(`DROP INDEX IF EXISTS geodata.idx_housenumbers_by_street`);

  pgm.sql(`
    CREATE INDEX idx_housenumbers_by_street
    ON geodata.housenumbers_by_street(country_code, postal_code, street)
  `);
}
