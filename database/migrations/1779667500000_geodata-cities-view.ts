import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Materialized view of distinct postal-code -> city pairs, backing the city
 * lookup and the postal-code prefix autocomplete.
 *
 * The OSM import stores rows without an `addr:city` tag as the placeholder city
 * `'Unknown'` (see scripts/osm-import/import-region.sh); those are excluded here
 * so they never surface as suggestions.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE MATERIALIZED VIEW geodata.cities_by_postal AS
    SELECT DISTINCT country_code, postal_code, city
    FROM geodata.addresses
    WHERE city <> 'Unknown';

    COMMENT ON MATERIALIZED VIEW geodata.cities_by_postal IS 'Pre-computed distinct cities by postal code (excludes the Unknown placeholder)';
  `);

  // Unique index: required for REFRESH MATERIALIZED VIEW CONCURRENTLY and serves
  // exact (country_code, postal_code) lookups for the city query.
  pgm.sql(`
    CREATE UNIQUE INDEX idx_cities_by_postal
      ON geodata.cities_by_postal (country_code, postal_code, city);
  `);

  // text_pattern_ops index so the postal-code prefix `LIKE 'NN%'` is index-backed
  // regardless of the database's default collation.
  pgm.sql(`
    CREATE INDEX idx_cities_by_postal_prefix
      ON geodata.cities_by_postal (country_code, postal_code text_pattern_ops);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP MATERIALIZED VIEW IF EXISTS geodata.cities_by_postal CASCADE');
}
