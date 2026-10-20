import pino from 'pino';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExternalServiceError } from '../../src/errors/external-service.error.js';
import { NominatimClient } from '../../src/services/external/nominatim.client.js';

function stubFetchBody(body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(body));
}

describe('NominatimClient', () => {
  const logger = pino({ level: 'silent' });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('geocode', () => {
    it('returns the coordinates of the first result as numbers', async () => {
      stubFetchBody([{ lat: '48.1371', lon: '11.5754', display_name: 'München' }]);
      const client = new NominatimClient({ logger, contactEmail: 'ops@example.com' });

      await expect(client.geocode('FR', 'Paris', '75001')).resolves.toEqual({
        latitude: 48.1371,
        longitude: 11.5754,
      });
    });

    it('returns undefined when Nominatim finds nothing', async () => {
      stubFetchBody([]);
      const client = new NominatimClient({ logger, contactEmail: 'ops@example.com' });

      await expect(client.geocode('FR', 'Paris', '75001')).resolves.toBeUndefined();
    });

    it('treats a malformed body as an ExternalServiceError and returns undefined', async () => {
      stubFetchBody({ error: 'Unable to geocode' });
      const client = new NominatimClient({ logger, contactEmail: 'ops@example.com' });
      const warnSpy = vi.spyOn(logger, 'warn');

      await expect(client.geocode('FR', 'Paris', '75001')).resolves.toBeUndefined();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(ExternalServiceError) }),
        'Nominatim geocode error',
      );
    });

    it('rejects a result whose coordinates are not strings', async () => {
      stubFetchBody([{ lat: 48.1371, lon: 11.5754 }]);
      const client = new NominatimClient({ logger, contactEmail: 'ops@example.com' });
      const warnSpy = vi.spyOn(logger, 'warn');

      await expect(client.geocode('FR', 'Paris', '75001')).resolves.toBeUndefined();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(ExternalServiceError) }),
        'Nominatim geocode error',
      );
    });
  });
});
