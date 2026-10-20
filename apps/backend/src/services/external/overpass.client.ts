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

// Collator for natural sorting of house numbers
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

  /**
   * Get streets for a city and postal code
   */
  public async getStreets(
    countryCode: string,
    city: string,
    postalCode: string,
  ): Promise<Street[]> {
    const cacheKey = `streets:${countryCode}:${postalCode}:${city}`;
    const cached = await this.streetCache.get(cacheKey);
    if (cached) {
      this.logger.debug({ countryCode, city, postalCode }, 'Overpass streets cache hit');
      return cached;
    }

    const query = this.buildStreetQuery(countryCode, city, postalCode);
    const response = await this.executeQuery(query);

    // Extract unique street names from addr:street tags
    const streetNames = new Set<string>();
    const streetsWithType: Street[] = [];

    for (const element of response.elements) {
      const streetName = element.tags?.['addr:street'];
      if (streetName && !streetNames.has(streetName)) {
        streetNames.add(streetName);
        streetsWithType.push({
          name: streetName,
        });
      }
    }

    // Sort streets alphabetically
    streetsWithType.sort((a, b) => a.name.localeCompare(b.name));

    await this.streetCache.set(cacheKey, streetsWithType);
    return streetsWithType;
  }

  /**
   * Get house numbers for a street
   */
  public async getHouseNumbers(
    countryCode: string,
    city: string,
    postalCode: string,
    street: string,
  ): Promise<HouseNumber[]> {
    const cacheKey = `housenumbers:${countryCode}:${postalCode}:${city}:${street}`;
    const cached = await this.houseNumberCache.get(cacheKey);
    if (cached) {
      this.logger.debug(
        { countryCode, city, postalCode, street },
        'Overpass house numbers cache hit',
      );
      return cached;
    }

    const query = this.buildHouseNumberQuery(countryCode, city, postalCode, street);
    const response = await this.executeQuery(query);

    // Extract unique house numbers
    const numberSet = new Set<string>();
    const houseNumbers: HouseNumber[] = [];

    for (const element of response.elements) {
      const number = element.tags?.['addr:housenumber'];
      const addrStreet = element.tags?.['addr:street'];
      if (number && !numberSet.has(number)) {
        numberSet.add(number);
        houseNumbers.push({
          number,
          street: addrStreet,
        });
      }
    }

    // Sort house numbers naturally using Intl.Collator (handles 1, 2, 10, 10a, 10/1, etc.)
    houseNumbers.sort((a, b) => naturalCollator.compare(a.number, b.number));

    await this.houseNumberCache.set(cacheKey, houseNumbers);
    return houseNumbers;
  }

  /**
   * Build Overpass query for streets in a city/postal code area
   * Strategy: Find addresses with this postal code and extract unique street names
   */
  private buildStreetQuery(countryCode: string, city: string, postalCode: string): string {
    const escapedCountry = this.escapeOverpassString(countryCode);
    const escapedCity = this.escapeOverpassString(city);
    const escapedPostalCode = this.escapeOverpassString(postalCode);

    // Query addresses with the postal code to get street names
    // This is more reliable than trying to find city areas with postal_code tags
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

  /**
   * Build Overpass query for house numbers on a street
   * Strategy: Find addresses with this postal code and street name
   */
  private buildHouseNumberQuery(
    countryCode: string,
    _city: string,
    postalCode: string,
    street: string,
  ): string {
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

  /**
   * Execute an Overpass query with fallback
   */
  private async executeQuery(query: string) {
    this.logger.debug({ query }, 'Executing Overpass query');

    // Try primary endpoint first
    try {
      return await this.fetchOverpass(this.primaryUrl, query);
    } catch (primaryError) {
      this.logger.warn(
        { err: primaryError, url: this.primaryUrl },
        'Primary Overpass endpoint failed, trying fallback',
      );

      // Try fallback endpoint
      try {
        return await this.fetchOverpass(this.fallbackUrl, query);
      } catch (fallbackError) {
        this.logger.error({ primaryError, fallbackError }, 'Both Overpass endpoints failed');
        throw new OverpassApiError();
      }
    }
  }

  /**
   * Execute a fetch to an Overpass endpoint
   */
  private async fetchOverpass(url: string, query: string) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
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

  /**
   * Escape special characters for Overpass QL strings.
   * Handles backslashes, quotes, newlines, and other control characters.
   */
  private escapeOverpassString(str: string): string {
    // First, remove control characters (ASCII 0-31 except tab, newline, carriage return)
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
