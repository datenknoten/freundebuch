import type { Logger } from 'pino';

export interface GeocodedLocation {
  latitude: number;
  longitude: number;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

/**
 * Nominatim geocoding client for non-DACH countries.
 * Uses the OpenStreetMap Nominatim API with structured queries.
 * Respects the usage policy: max 1 request per second, proper User-Agent.
 *
 * Concurrency-safe: requests are serialized via a promise queue so a burst
 * of concurrent callers does not all fire at once.
 */
export class NominatimClient {
  private readonly minRequestInterval = 1100; // 1.1s to stay safely within 1 req/sec
  private readonly userAgent: string;
  // Promise chain that serializes outgoing requests.
  private requestQueue: Promise<unknown> = Promise.resolve();
  private lastRequestTime = 0;

  constructor(
    private logger: Logger,
    contactEmail?: string,
  ) {
    this.userAgent = contactEmail
      ? `Freundebuch/2.0 (address geocoding; ${contactEmail})`
      : 'Freundebuch/2.0 (address geocoding)';

    if (!contactEmail) {
      logger.warn(
        'NOMINATIM_CONTACT_EMAIL not set — OSM Nominatim usage policy requires identifying contact info. Geocoding may be rate-limited or blocked.',
      );
    }
  }

  /**
   * Geocode an address to lat/lon coordinates.
   * Uses structured query parameters for better accuracy.
   */
  async geocode(
    countryCode: string,
    city: string,
    postalCode: string,
    street?: string,
    houseNumber?: string,
  ): Promise<GeocodedLocation | null> {
    return this.enqueue(() => this.doGeocode(countryCode, city, postalCode, street, houseNumber));
  }

  /**
   * Serialize work onto the request queue. Each task waits for the previous
   * one to finish AND for the rate-limit window to elapse.
   */
  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const next = this.requestQueue.then(async () => {
      await this.waitForRateLimit();
      try {
        return await task();
      } finally {
        this.lastRequestTime = Date.now();
      }
    });
    // Swallow rejections on the chain itself so one failure doesn't poison the queue.
    this.requestQueue = next.catch(() => undefined);
    return next;
  }

  private async waitForRateLimit(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < this.minRequestInterval) {
      await new Promise((resolve) => setTimeout(resolve, this.minRequestInterval - elapsed));
    }
  }

  private async doGeocode(
    countryCode: string,
    city: string,
    postalCode: string,
    street?: string,
    houseNumber?: string,
  ): Promise<GeocodedLocation | null> {
    const params = new URLSearchParams({
      format: 'json',
      countrycodes: countryCode.toLowerCase(),
      city,
      postalcode: postalCode,
      limit: '1',
    });

    if (street) {
      const streetValue = houseNumber ? `${houseNumber} ${street}` : street;
      params.set('street', streetValue);
    }

    try {
      const url = `https://nominatim.openstreetmap.org/search?${params}`;
      this.logger.debug(
        { url, countryCode, city, postalCode, street },
        'Nominatim geocode request',
      );

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        this.logger.warn(
          { status: response.status, countryCode, city },
          'Nominatim geocode request failed',
        );
        return null;
      }

      const results = (await response.json()) as NominatimResult[];

      if (results.length === 0) {
        this.logger.debug(
          { countryCode, city, postalCode, street },
          'Nominatim returned no results',
        );
        return null;
      }

      const result = results[0];
      const latitude = Number.parseFloat(result.lat);
      const longitude = Number.parseFloat(result.lon);

      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        this.logger.warn({ result }, 'Nominatim returned invalid coordinates');
        return null;
      }

      this.logger.debug(
        { countryCode, city, postalCode, street, latitude, longitude },
        'Nominatim geocode succeeded',
      );

      return { latitude, longitude };
    } catch (error) {
      this.logger.warn({ error, countryCode, city, postalCode }, 'Nominatim geocode error');
      return null;
    }
  }
}
