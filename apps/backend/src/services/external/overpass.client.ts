import { type } from 'arktype';
import type { Logger } from 'pino';
import { OverpassApiError } from '../../errors/overpass-api.error.js';
import type { AddressCache, HouseNumberCached, StreetCached } from '../../utils/cache.js';
import { parseForeignResponse } from '../../utils/parse-foreign-response.js';

export type Street = StreetCached;

export type HouseNumber = HouseNumberCached;

const OverpassResponseSchema = type({
  elements: type({ 'tags?': 'Record<string, string>' }).array(),
});

// Numeric collation sorts house numbers 1, 2, 10, 10a, 10/1.
const naturalCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

export interface OverpassClientOptions {
  primaryUrl: string;
  fallbackUrl: string;
  logger: Logger;
  streetCache: AddressCache<StreetCached[]>;
  houseNumberCache: AddressCache<HouseNumberCached[]>;
}

export class OverpassClient {
  private readonly primaryUrl: string;
  private readonly fallbackUrl: string;
  private readonly logger: Logger;
  private readonly streetCache: AddressCache<StreetCached[]>;
  private readonly houseNumberCache: AddressCache<HouseNumberCached[]>;

  constructor(options: OverpassClientOptions) {
    this.primaryUrl = options.primaryUrl;
    this.fallbackUrl = options.fallbackUrl;
    this.logger = options.logger;
    this.streetCache = options.streetCache;
    this.houseNumberCache = options.houseNumberCache;
  }

  public async getStreets(countryCode: string, city: string, postalCode: string) {
    const cacheKey = `streets:${countryCode}:${postalCode}:${city}`;
    const cached = await this.streetCache.get(cacheKey);
    if (cached !== undefined) {
      this.logger.debug({ countryCode, city, postalCode }, 'Overpass streets cache hit');
      return cached;
    }

    const query = this.buildStreetQuery(countryCode, city, postalCode);
    const response = await this.executeQuery(query);

    const streetNames = new Set<string>();
    const streetsWithType: Street[] = [];

    for (const element of response.elements) {
      const streetName = element.tags?.['addr:street'];
      if (streetName !== undefined && streetName !== '' && streetNames.has(streetName) === false) {
        streetNames.add(streetName);
        streetsWithType.push({
          name: streetName,
        });
      }
    }

    streetsWithType.sort((a, b) => a.name.localeCompare(b.name));

    await this.streetCache.set(cacheKey, streetsWithType);
    return streetsWithType;
  }

  public async getHouseNumbers(
    countryCode: string,
    city: string,
    postalCode: string,
    street: string,
  ) {
    const cacheKey = `housenumbers:${countryCode}:${postalCode}:${city}:${street}`;
    const cached = await this.houseNumberCache.get(cacheKey);
    if (cached !== undefined) {
      this.logger.debug(
        { countryCode, city, postalCode, street },
        'Overpass house numbers cache hit',
      );
      return cached;
    }

    const query = this.buildHouseNumberQuery(countryCode, city, postalCode, street);
    const response = await this.executeQuery(query);

    const numberSet = new Set<string>();
    const houseNumbers: HouseNumber[] = [];

    for (const element of response.elements) {
      const number = element.tags?.['addr:housenumber'];
      const addrStreet = element.tags?.['addr:street'];
      if (number !== undefined && number !== '' && numberSet.has(number) === false) {
        numberSet.add(number);
        houseNumbers.push({
          number,
          street: addrStreet,
        });
      }
    }

    houseNumbers.sort((a, b) => naturalCollator.compare(a.number, b.number));

    await this.houseNumberCache.set(cacheKey, houseNumbers);
    return houseNumbers;
  }

  /** Selects addresses by postal code and reads street names from their tags. */
  private buildStreetQuery(countryCode: string, city: string, postalCode: string) {
    const escapedCountry = this.escapeOverpassString(countryCode);
    const escapedCity = this.escapeOverpassString(city);
    const escapedPostalCode = this.escapeOverpassString(postalCode);

    return `
[out:json][timeout:25];
area["ISO3166-1"="${escapedCountry}"]->.country;
(
  node["addr:postcode"="${escapedPostalCode}"]["addr:street"](area.country);
  way["addr:postcode"="${escapedPostalCode}"]["addr:street"](area.country);
  node["addr:postcode"="${escapedPostalCode}"]["addr:place"="${escapedCity}"](area.country);
  way["addr:postcode"="${escapedPostalCode}"]["addr:place"="${escapedCity}"](area.country);
);
out tags;
    `.trim();
  }

  /** Selects addresses by postal code and street name. */
  private buildHouseNumberQuery(
    countryCode: string,
    _city: string,
    postalCode: string,
    street: string,
  ) {
    const escapedCountry = this.escapeOverpassString(countryCode);
    const escapedPostalCode = this.escapeOverpassString(postalCode);
    const escapedStreet = this.escapeOverpassString(street);

    return `
[out:json][timeout:25];
area["ISO3166-1"="${escapedCountry}"]->.country;
(
  node["addr:postcode"="${escapedPostalCode}"]["addr:street"="${escapedStreet}"]["addr:housenumber"](area.country);
  way["addr:postcode"="${escapedPostalCode}"]["addr:street"="${escapedStreet}"]["addr:housenumber"](area.country);
);
out tags;
    `.trim();
  }

  private async executeQuery(query: string) {
    this.logger.debug({ query }, 'Executing Overpass query');

    try {
      return await this.fetchOverpass(this.primaryUrl, query);
    } catch (primaryError) {
      this.logger.warn(
        { err: primaryError, url: this.primaryUrl },
        'Primary Overpass endpoint failed, trying fallback',
      );

      try {
        return await this.fetchOverpass(this.fallbackUrl, query);
      } catch (fallbackError) {
        this.logger.error({ primaryError, fallbackError }, 'Both Overpass endpoints failed');
        throw new OverpassApiError();
      }
    }
  }

  private async fetchOverpass(url: string, query: string) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (response.ok === false) {
      const errorText = await response.text();
      throw new OverpassApiError(
        `Overpass API error ${response.status}: ${errorText}`,
        response.status,
      );
    }

    const data = parseForeignResponse('Overpass', OverpassResponseSchema, await response.json());
    this.logger.debug(
      { url, elementCount: data.elements.length, elements: data.elements },
      'Overpass API response',
    );
    return data;
  }

  /** Strips control characters, then escapes what Overpass QL treats specially in strings. */
  private escapeOverpassString(str: string) {
    // biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally matching control chars
    const withoutControlChars = str.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
    return withoutControlChars
      .replace(/\\/g, '\\\\') // Backslashes first
      .replace(/"/g, '\\"') // Double quotes
      .replace(/\n/g, '\\n') // Newlines
      .replace(/\r/g, '\\r') // Carriage returns
      .replace(/\t/g, '\\t'); // Tabs
  }
}
