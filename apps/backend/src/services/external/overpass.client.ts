import type { Logger } from 'pino';
import { SimpleCache } from '../../utils/cache.js';

export interface Street {
  name: string;
  type?: string; // highway type: residential, primary, etc.
}

export interface HouseNumber {
  number: string;
  street?: string;
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  tags?: Record<string, string>;
}

interface OverpassResponse {
  version: number;
  generator: string;
  elements: OverpassElement[];
}

export class OverpassClient {
  private streetCache: SimpleCache<Street[]>;
  private houseNumberCache: SimpleCache<HouseNumber[]>;

  constructor(
    private primaryUrl: string,
    private fallbackUrl: string,
    cacheTtlHours: number,
    private logger: Logger,
  ) {
    this.streetCache = new SimpleCache(cacheTtlHours);
    this.houseNumberCache = new SimpleCache(cacheTtlHours);
  }

  /**
   * Get streets for a city and postal code
   */
  async getStreets(countryCode: string, city: string, postalCode: string): Promise<Street[]> {
    const cacheKey = `streets:${countryCode}:${postalCode}:${city}`;
    const cached = this.streetCache.get(cacheKey);
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

    this.streetCache.set(cacheKey, streetsWithType);
    return streetsWithType;
  }

  /**
   * Get house numbers for a street
   */
  async getHouseNumbers(
    countryCode: string,
    city: string,
    postalCode: string,
    street: string,
  ): Promise<HouseNumber[]> {
    const cacheKey = `housenumbers:${countryCode}:${postalCode}:${city}:${street}`;
    const cached = this.houseNumberCache.get(cacheKey);
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

    // Sort house numbers naturally (1, 2, 10, 10a, 11, etc.)
    houseNumbers.sort((a, b) => this.naturalSort(a.number, b.number));

    this.houseNumberCache.set(cacheKey, houseNumbers);
    return houseNumbers;
  }

  /**
   * Build Overpass query for streets in a city/postal code area
   * Strategy: Find addresses with this postal code and extract unique street names
   */
  private buildStreetQuery(countryCode: string, city: string, postalCode: string): string {
    const escapedCity = this.escapeOverpassString(city);
    const escapedPostalCode = this.escapeOverpassString(postalCode);

    // Query addresses with the postal code to get street names
    // This is more reliable than trying to find city areas with postal_code tags
    return `
[out:json][timeout:25];
area["ISO3166-1"="${countryCode}"]->.country;
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
    const escapedPostalCode = this.escapeOverpassString(postalCode);
    const escapedStreet = this.escapeOverpassString(street);

    return `
[out:json][timeout:25];
area["ISO3166-1"="${countryCode}"]->.country;
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
  private async executeQuery(query: string): Promise<OverpassResponse> {
    this.logger.debug({ query }, 'Executing Overpass query');

    // Try primary endpoint first
    try {
      return await this.fetchOverpass(this.primaryUrl, query);
    } catch (primaryError) {
      this.logger.warn(
        { error: primaryError, url: this.primaryUrl },
        'Primary Overpass endpoint failed, trying fallback',
      );

      // Try fallback endpoint
      try {
        return await this.fetchOverpass(this.fallbackUrl, query);
      } catch (fallbackError) {
        this.logger.error({ primaryError, fallbackError }, 'Both Overpass endpoints failed');
        throw new Error('Overpass API unavailable');
      }
    }
  }

  /**
   * Execute a fetch to an Overpass endpoint
   */
  private async fetchOverpass(url: string, query: string): Promise<OverpassResponse> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Overpass API error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as OverpassResponse;
    this.logger.debug(
      { url, elementCount: data.elements.length, elements: data.elements },
      'Overpass API response',
    );
    return data;
  }

  /**
   * Escape special characters for Overpass QL strings
   */
  private escapeOverpassString(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }

  /**
   * Natural sort comparison for house numbers (1, 2, 10, 10a, 11)
   */
  private naturalSort(a: string, b: string): number {
    const aParts = a.match(/(\d+)|(\D+)/g) || [];
    const bParts = b.match(/(\d+)|(\D+)/g) || [];

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || '';
      const bPart = bParts[i] || '';

      const aNum = Number.parseInt(aPart, 10);
      const bNum = Number.parseInt(bPart, 10);

      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        if (aNum !== bNum) return aNum - bNum;
      } else {
        const cmp = aPart.localeCompare(bPart);
        if (cmp !== 0) return cmp;
      }
    }

    return 0;
  }
}
