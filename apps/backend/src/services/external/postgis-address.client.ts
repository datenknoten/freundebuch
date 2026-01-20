import type { Pool } from 'pg';
import type { Logger } from 'pino';
import type { HouseNumber, Street } from './overpass.client.js';

// Collator for natural sorting of house numbers
const naturalCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

/**
 * PostGIS-based address lookup client for DACH countries.
 * Uses local OSM data stored in the geodata schema for fast address autocomplete.
 */
export class PostGISAddressClient {
  constructor(
    private pool: Pool,
    private logger: Logger,
  ) {}

  /**
   * Get streets for a postal code.
   * Uses the materialized view for fast distinct lookups.
   */
  async getStreets(countryCode: string, _city: string, postalCode: string): Promise<Street[]> {
    try {
      const result = await this.pool.query<{ street: string }>(
        `SELECT street
         FROM geodata.streets_by_postal
         WHERE country_code = $1 AND postal_code = $2
         ORDER BY street`,
        [countryCode.toUpperCase(), postalCode],
      );

      this.logger.debug(
        { countryCode, postalCode, count: result.rowCount },
        'PostGIS streets query completed',
      );

      return result.rows.map((row) => ({ name: row.street }));
    } catch (error) {
      this.logger.error({ error, countryCode, postalCode }, 'PostGIS streets query failed');
      throw error;
    }
  }

  /**
   * Get house numbers for a street.
   * Uses the materialized view for fast distinct lookups.
   */
  async getHouseNumbers(
    countryCode: string,
    _city: string,
    postalCode: string,
    street: string,
  ): Promise<HouseNumber[]> {
    try {
      const result = await this.pool.query<{ house_number: string }>(
        `SELECT house_number
         FROM geodata.housenumbers_by_street
         WHERE country_code = $1 AND postal_code = $2 AND street = $3`,
        [countryCode.toUpperCase(), postalCode, street],
      );

      this.logger.debug(
        { countryCode, postalCode, street, count: result.rowCount },
        'PostGIS house numbers query completed',
      );

      // Sort house numbers naturally (handles 1, 2, 10, 10a, 10/1, etc.)
      const houseNumbers = result.rows.map((row) => ({ number: row.house_number }));
      houseNumbers.sort((a, b) => naturalCollator.compare(a.number, b.number));

      return houseNumbers;
    } catch (error) {
      this.logger.error(
        { error, countryCode, postalCode, street },
        'PostGIS house numbers query failed',
      );
      throw error;
    }
  }

  /**
   * Check if PostGIS address data is available and has data for DACH countries.
   * This can be used to determine whether to use PostGIS or fall back to Overpass.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.pool.query<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM geodata.addresses
         WHERE country_code IN ('DE', 'AT', 'CH')
         LIMIT 1`,
      );
      return Number.parseInt(result.rows[0]?.count || '0', 10) > 0;
    } catch (error) {
      this.logger.debug({ error }, 'PostGIS availability check failed');
      return false;
    }
  }

  /**
   * Check if data is available for a specific country.
   */
  async hasDataForCountry(countryCode: string): Promise<boolean> {
    try {
      const result = await this.pool.query<{ exists: boolean }>(
        `SELECT EXISTS(
           SELECT 1 FROM geodata.addresses
           WHERE country_code = $1
           LIMIT 1
         ) as exists`,
        [countryCode.toUpperCase()],
      );
      return result.rows[0]?.exists || false;
    } catch (error) {
      this.logger.debug({ error, countryCode }, 'PostGIS country check failed');
      return false;
    }
  }

  /**
   * Get statistics about imported address data.
   * Useful for monitoring and debugging.
   */
  async getStats(): Promise<
    {
      countryCode: string;
      addressCount: number;
      postalCodeCount: number;
      streetCount: number;
    }[]
  > {
    try {
      const result = await this.pool.query<{
        country_code: string;
        address_count: string;
        postal_code_count: string;
        street_count: string;
      }>(
        `SELECT
           country_code,
           COUNT(*) as address_count,
           COUNT(DISTINCT postal_code) as postal_code_count,
           COUNT(DISTINCT street) as street_count
         FROM geodata.addresses
         GROUP BY country_code
         ORDER BY country_code`,
      );

      return result.rows.map((row) => ({
        countryCode: row.country_code,
        addressCount: Number.parseInt(row.address_count, 10),
        postalCodeCount: Number.parseInt(row.postal_code_count, 10),
        streetCount: Number.parseInt(row.street_count, 10),
      }));
    } catch (error) {
      this.logger.error({ error }, 'PostGIS stats query failed');
      return [];
    }
  }
}
