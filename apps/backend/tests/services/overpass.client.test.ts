import type pg from 'pg';
import { pino } from 'pino';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExternalServiceError } from '../../src/errors/external-service.error.js';
import { OverpassApiError } from '../../src/errors/overpass-api.error.js';
import { OverpassClient } from '../../src/services/external/overpass.client.js';
import { createHouseNumbersCache, createStreetsCache } from '../../src/utils/cache.js';

const SILENT_LOGGER = pino({ level: 'silent' });
const PRIMARY_URL = 'https://overpass.primary.example/api/interpreter';
const FALLBACK_URL = 'https://overpass.fallback.example/api/interpreter';

function aClient() {
  // The caches only call `query`; a pool stub without rows makes every read miss.
  const db = { query: vi.fn().mockResolvedValue({ rows: [] }) } as unknown as pg.Pool;
  return new OverpassClient({
    primaryUrl: PRIMARY_URL,
    fallbackUrl: FALLBACK_URL,
    logger: SILENT_LOGGER,
    streetCache: createStreetsCache({ db, logger: SILENT_LOGGER }),
    houseNumberCache: createHouseNumbersCache({ db, logger: SILENT_LOGGER }),
  });
}

function stubFetchBodies(bodies: Record<string, unknown>) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (input) => Response.json(bodies[String(input)]));
}

describe('OverpassClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getStreets', () => {
    it('returns the unique street names of the response, sorted', async () => {
      stubFetchBodies({
        [PRIMARY_URL]: {
          version: 0.6,
          elements: [
            { type: 'node', id: 1, tags: { 'addr:street': 'Zeppelinstraße' } },
            { type: 'way', id: 2, tags: { 'addr:street': 'Ahornweg' } },
            { type: 'node', id: 3, tags: { 'addr:street': 'Ahornweg' } },
            { type: 'node', id: 4 },
          ],
        },
      });

      await expect(aClient().getStreets('DE', 'Berlin', '10115')).resolves.toEqual([
        { name: 'Ahornweg' },
        { name: 'Zeppelinstraße' },
      ]);
    });

    it('falls back to the second endpoint when the primary sends a malformed body', async () => {
      const fetchSpy = stubFetchBodies({
        [PRIMARY_URL]: { remark: 'runtime error' },
        [FALLBACK_URL]: { elements: [{ tags: { 'addr:street': 'Ahornweg' } }] },
      });

      await expect(aClient().getStreets('DE', 'Berlin', '10115')).resolves.toEqual([
        { name: 'Ahornweg' },
      ]);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('throws an ExternalServiceError when both endpoints send malformed bodies', async () => {
      stubFetchBodies({
        [PRIMARY_URL]: { elements: 'none' },
        [FALLBACK_URL]: { elements: [{ tags: { 'addr:street': 42 } }] },
      });

      const result = aClient().getStreets('DE', 'Berlin', '10115');

      await expect(result).rejects.toBeInstanceOf(OverpassApiError);
      await expect(result).rejects.toBeInstanceOf(ExternalServiceError);
    });
  });
});
