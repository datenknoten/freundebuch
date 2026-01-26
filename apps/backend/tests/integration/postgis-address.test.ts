import { beforeEach, describe, expect, it } from 'vitest';
import { clearTestData, insertTestAddresses, setupPostGISTestSuite } from './postgis.helpers.js';

describe('PostGIS Address Client - Integration Tests', { timeout: 60000 }, () => {
  const { getContext } = setupPostGISTestSuite();

  beforeEach(async () => {
    const { pool } = getContext();
    await clearTestData(pool);
  });

  describe('getStreets', () => {
    it('should return streets for a postal code', async () => {
      const { pool, client } = getContext();

      await insertTestAddresses(pool, [
        {
          countryCode: 'DE',
          postalCode: '10115',
          city: 'Berlin',
          street: 'Torstraße',
          houseNumber: '1',
        },
        {
          countryCode: 'DE',
          postalCode: '10115',
          city: 'Berlin',
          street: 'Invalidenstraße',
          houseNumber: '5',
        },
        {
          countryCode: 'DE',
          postalCode: '10115',
          city: 'Berlin',
          street: 'Chausseestraße',
          houseNumber: '10',
        },
      ]);

      const streets = await client.getStreets('DE', 'Berlin', '10115');

      expect(streets).toHaveLength(3);
      expect(streets.map((s) => s.name)).toContain('Torstraße');
      expect(streets.map((s) => s.name)).toContain('Invalidenstraße');
      expect(streets.map((s) => s.name)).toContain('Chausseestraße');
    });

    it('should return streets sorted alphabetically', async () => {
      const { pool, client } = getContext();

      await insertTestAddresses(pool, [
        { countryCode: 'DE', postalCode: '10115', city: 'Berlin', street: 'Zwingerstraße' },
        { countryCode: 'DE', postalCode: '10115', city: 'Berlin', street: 'Adlerstraße' },
        { countryCode: 'DE', postalCode: '10115', city: 'Berlin', street: 'Mittelweg' },
      ]);

      const streets = await client.getStreets('DE', 'Berlin', '10115');

      expect(streets[0].name).toBe('Adlerstraße');
      expect(streets[1].name).toBe('Mittelweg');
      expect(streets[2].name).toBe('Zwingerstraße');
    });

    it('should return empty array for non-existent postal code', async () => {
      const { client } = getContext();

      const streets = await client.getStreets('DE', 'Berlin', '99999');

      expect(streets).toHaveLength(0);
    });

    it('should return distinct streets even with multiple addresses on same street', async () => {
      const { pool, client } = getContext();

      await insertTestAddresses(pool, [
        {
          countryCode: 'DE',
          postalCode: '10115',
          city: 'Berlin',
          street: 'Torstraße',
          houseNumber: '1',
        },
        {
          countryCode: 'DE',
          postalCode: '10115',
          city: 'Berlin',
          street: 'Torstraße',
          houseNumber: '2',
        },
        {
          countryCode: 'DE',
          postalCode: '10115',
          city: 'Berlin',
          street: 'Torstraße',
          houseNumber: '3',
        },
      ]);

      const streets = await client.getStreets('DE', 'Berlin', '10115');

      expect(streets).toHaveLength(1);
      expect(streets[0].name).toBe('Torstraße');
    });

    it('should handle case-insensitive country codes', async () => {
      const { pool, client } = getContext();

      await insertTestAddresses(pool, [
        { countryCode: 'DE', postalCode: '10115', city: 'Berlin', street: 'Torstraße' },
      ]);

      const streetsLower = await client.getStreets('de', 'Berlin', '10115');
      const streetsUpper = await client.getStreets('DE', 'Berlin', '10115');

      expect(streetsLower).toHaveLength(1);
      expect(streetsUpper).toHaveLength(1);
    });

    it('should filter by country code correctly', async () => {
      const { pool, client } = getContext();

      await insertTestAddresses(pool, [
        { countryCode: 'DE', postalCode: '10115', city: 'Berlin', street: 'Torstraße' },
        { countryCode: 'AT', postalCode: '10115', city: 'Wien', street: 'Kärntner Straße' },
      ]);

      const germanStreets = await client.getStreets('DE', 'Berlin', '10115');
      const austrianStreets = await client.getStreets('AT', 'Wien', '10115');

      expect(germanStreets).toHaveLength(1);
      expect(germanStreets[0].name).toBe('Torstraße');

      expect(austrianStreets).toHaveLength(1);
      expect(austrianStreets[0].name).toBe('Kärntner Straße');
    });
  });

  describe('getHouseNumbers', () => {
    it('should return house numbers for a street', async () => {
      const { pool, client } = getContext();

      await insertTestAddresses(pool, [
        {
          countryCode: 'DE',
          postalCode: '10115',
          city: 'Berlin',
          street: 'Torstraße',
          houseNumber: '1',
        },
        {
          countryCode: 'DE',
          postalCode: '10115',
          city: 'Berlin',
          street: 'Torstraße',
          houseNumber: '5',
        },
        {
          countryCode: 'DE',
          postalCode: '10115',
          city: 'Berlin',
          street: 'Torstraße',
          houseNumber: '10',
        },
      ]);

      const houseNumbers = await client.getHouseNumbers('DE', 'Berlin', '10115', 'Torstraße');

      expect(houseNumbers).toHaveLength(3);
      expect(houseNumbers.map((h) => h.number)).toContain('1');
      expect(houseNumbers.map((h) => h.number)).toContain('5');
      expect(houseNumbers.map((h) => h.number)).toContain('10');
    });

    it('should sort house numbers naturally (1, 2, 10, not 1, 10, 2)', async () => {
      const { pool, client } = getContext();

      await insertTestAddresses(pool, [
        {
          countryCode: 'DE',
          postalCode: '10115',
          city: 'Berlin',
          street: 'Torstraße',
          houseNumber: '1',
        },
        {
          countryCode: 'DE',
          postalCode: '10115',
          city: 'Berlin',
          street: 'Torstraße',
          houseNumber: '2',
        },
        {
          countryCode: 'DE',
          postalCode: '10115',
          city: 'Berlin',
          street: 'Torstraße',
          houseNumber: '10',
        },
        {
          countryCode: 'DE',
          postalCode: '10115',
          city: 'Berlin',
          street: 'Torstraße',
          houseNumber: '20',
        },
      ]);

      const houseNumbers = await client.getHouseNumbers('DE', 'Berlin', '10115', 'Torstraße');

      expect(houseNumbers.map((h) => h.number)).toEqual(['1', '2', '10', '20']);
    });

    it('should sort house numbers with letters naturally (10, 10a, 10b, 11)', async () => {
      const { pool, client } = getContext();

      await insertTestAddresses(pool, [
        {
          countryCode: 'DE',
          postalCode: '10115',
          city: 'Berlin',
          street: 'Torstraße',
          houseNumber: '10',
        },
        {
          countryCode: 'DE',
          postalCode: '10115',
          city: 'Berlin',
          street: 'Torstraße',
          houseNumber: '10a',
        },
        {
          countryCode: 'DE',
          postalCode: '10115',
          city: 'Berlin',
          street: 'Torstraße',
          houseNumber: '10b',
        },
        {
          countryCode: 'DE',
          postalCode: '10115',
          city: 'Berlin',
          street: 'Torstraße',
          houseNumber: '11',
        },
      ]);

      const houseNumbers = await client.getHouseNumbers('DE', 'Berlin', '10115', 'Torstraße');

      expect(houseNumbers.map((h) => h.number)).toEqual(['10', '10a', '10b', '11']);
    });

    it('should return empty array for non-existent street', async () => {
      const { pool, client } = getContext();

      await insertTestAddresses(pool, [
        {
          countryCode: 'DE',
          postalCode: '10115',
          city: 'Berlin',
          street: 'Torstraße',
          houseNumber: '1',
        },
      ]);

      const houseNumbers = await client.getHouseNumbers(
        'DE',
        'Berlin',
        '10115',
        'NonExistentStreet',
      );

      expect(houseNumbers).toHaveLength(0);
    });

    it('should return distinct house numbers', async () => {
      const { pool, client } = getContext();

      // Insert duplicate house numbers (can happen with different OSM entries)
      await insertTestAddresses(pool, [
        {
          countryCode: 'DE',
          postalCode: '10115',
          city: 'Berlin',
          street: 'Torstraße',
          houseNumber: '1',
        },
      ]);

      // Insert another address with the same house number manually
      const batchResult = await pool.query<{ external_id: string }>(
        `SELECT external_id FROM geodata.import_batches LIMIT 1`,
      );
      const batchId = batchResult.rows[0].external_id;

      await pool.query(
        `INSERT INTO geodata.addresses (country_code, postal_code, city, street, house_number, import_batch_id)
         VALUES ('DE', '10115', 'Berlin', 'Torstraße', '1', $1)`,
        [batchId],
      );

      await pool.query('REFRESH MATERIALIZED VIEW geodata.housenumbers_by_street');

      const houseNumbers = await client.getHouseNumbers('DE', 'Berlin', '10115', 'Torstraße');

      // Should still return only 1 distinct house number
      expect(houseNumbers).toHaveLength(1);
      expect(houseNumbers[0].number).toBe('1');
    });
  });

  describe('isAvailable', () => {
    it('should return false when no DACH addresses exist', async () => {
      const { client } = getContext();

      const available = await client.isAvailable();

      expect(available).toBe(false);
    });

    it('should return true when German addresses exist', async () => {
      const { pool, client } = getContext();

      await insertTestAddresses(pool, [
        { countryCode: 'DE', postalCode: '10115', city: 'Berlin', street: 'Torstraße' },
      ]);

      const available = await client.isAvailable();

      expect(available).toBe(true);
    });

    it('should return true when Austrian addresses exist', async () => {
      const { pool, client } = getContext();

      await insertTestAddresses(pool, [
        { countryCode: 'AT', postalCode: '1010', city: 'Wien', street: 'Kärntner Straße' },
      ]);

      const available = await client.isAvailable();

      expect(available).toBe(true);
    });

    it('should return true when Swiss addresses exist', async () => {
      const { pool, client } = getContext();

      await insertTestAddresses(pool, [
        { countryCode: 'CH', postalCode: '8001', city: 'Zürich', street: 'Bahnhofstrasse' },
      ]);

      const available = await client.isAvailable();

      expect(available).toBe(true);
    });
  });

  describe('hasDataForCountry', () => {
    it('should return false when no data exists for country', async () => {
      const { client } = getContext();

      const hasData = await client.hasDataForCountry('DE');

      expect(hasData).toBe(false);
    });

    it('should return true when data exists for country', async () => {
      const { pool, client } = getContext();

      await insertTestAddresses(pool, [
        { countryCode: 'DE', postalCode: '10115', city: 'Berlin', street: 'Torstraße' },
      ]);

      const hasData = await client.hasDataForCountry('DE');

      expect(hasData).toBe(true);
    });

    it('should handle case-insensitive country codes', async () => {
      const { pool, client } = getContext();

      await insertTestAddresses(pool, [
        { countryCode: 'DE', postalCode: '10115', city: 'Berlin', street: 'Torstraße' },
      ]);

      const hasDataLower = await client.hasDataForCountry('de');
      const hasDataUpper = await client.hasDataForCountry('DE');

      expect(hasDataLower).toBe(true);
      expect(hasDataUpper).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return empty array when no data exists', async () => {
      const { client } = getContext();

      const stats = await client.getStats();

      expect(stats).toHaveLength(0);
    });

    it('should return statistics for imported data', async () => {
      const { pool, client } = getContext();

      await insertTestAddresses(pool, [
        {
          countryCode: 'DE',
          postalCode: '10115',
          city: 'Berlin',
          street: 'Torstraße',
          houseNumber: '1',
        },
        {
          countryCode: 'DE',
          postalCode: '10115',
          city: 'Berlin',
          street: 'Torstraße',
          houseNumber: '2',
        },
        {
          countryCode: 'DE',
          postalCode: '10117',
          city: 'Berlin',
          street: 'Friedrichstraße',
          houseNumber: '1',
        },
        {
          countryCode: 'AT',
          postalCode: '1010',
          city: 'Wien',
          street: 'Kärntner Straße',
          houseNumber: '1',
        },
      ]);

      const stats = await client.getStats();

      expect(stats).toHaveLength(2);

      const deStats = stats.find((s) => s.countryCode === 'DE');
      expect(deStats).toBeDefined();
      expect(deStats?.addressCount).toBe(3);
      expect(deStats?.postalCodeCount).toBe(2);
      expect(deStats?.streetCount).toBe(2);

      const atStats = stats.find((s) => s.countryCode === 'AT');
      expect(atStats).toBeDefined();
      expect(atStats?.addressCount).toBe(1);
      expect(atStats?.postalCodeCount).toBe(1);
      expect(atStats?.streetCount).toBe(1);
    });

    it('should return stats sorted by country code', async () => {
      const { pool, client } = getContext();

      await insertTestAddresses(pool, [
        { countryCode: 'DE', postalCode: '10115', city: 'Berlin', street: 'Torstraße' },
      ]);

      // Insert Austrian data with a separate batch
      await pool.query(
        `INSERT INTO geodata.import_batches (country_code, source_file, status)
         VALUES ('AT', 'test-at.pbf', 'completed')`,
      );

      const batchResult = await pool.query<{ external_id: string }>(
        `SELECT external_id FROM geodata.import_batches WHERE country_code = 'AT' LIMIT 1`,
      );
      const atBatchId = batchResult.rows[0].external_id;

      await pool.query(
        `INSERT INTO geodata.addresses (country_code, postal_code, city, street, import_batch_id)
         VALUES ('AT', '1010', 'Wien', 'Kärntner Straße', $1)`,
        [atBatchId],
      );

      const stats = await client.getStats();

      expect(stats[0].countryCode).toBe('AT');
      expect(stats[1].countryCode).toBe('DE');
    });
  });

  describe('PostGIS extension', () => {
    it('should have PostGIS extension enabled', async () => {
      const { pool } = getContext();

      const result = await pool.query<{ extname: string }>(
        `SELECT extname FROM pg_extension WHERE extname = 'postgis'`,
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].extname).toBe('postgis');
    });

    it('should have location column with geometry type', async () => {
      const { pool } = getContext();

      const result = await pool.query<{ column_name: string; udt_name: string }>(
        `SELECT column_name, udt_name
         FROM information_schema.columns
         WHERE table_schema = 'geodata'
           AND table_name = 'addresses'
           AND column_name = 'location'`,
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].udt_name).toBe('geometry');
    });

    it('should have spatial GIST index on location column', async () => {
      const { pool } = getContext();

      const result = await pool.query<{ indexname: string }>(
        `SELECT indexname
         FROM pg_indexes
         WHERE schemaname = 'geodata'
           AND tablename = 'addresses'
           AND indexname = 'idx_addresses_location'`,
      );

      expect(result.rows).toHaveLength(1);
    });
  });
});
