import type { Logger } from 'pino';
import { type HouseNumber, OverpassClient, type Street } from './external/overpass.client.js';
import { type Country, ZipcodeBaseClient } from './external/zipcodebase.client.js';

export interface CityInfo {
  city: string;
  state?: string;
  stateCode?: string;
}

export type { Country, Street, HouseNumber };

export class AddressLookupService {
  private zipcodeClient: ZipcodeBaseClient;
  private overpassClient: OverpassClient;

  constructor(
    zipcodeApiKey: string,
    overpassPrimaryUrl: string,
    overpassFallbackUrl: string,
    private logger: Logger,
  ) {
    this.zipcodeClient = new ZipcodeBaseClient(zipcodeApiKey, logger);
    this.overpassClient = new OverpassClient(overpassPrimaryUrl, overpassFallbackUrl, logger);
  }

  /**
   * Get list of supported countries
   */
  getCountries(): Country[] {
    return this.zipcodeClient.getCountries();
  }

  /**
   * Get cities for a postal code in a country
   */
  async getCitiesByPostalCode(countryCode: string, postalCode: string): Promise<CityInfo[]> {
    const results = await this.zipcodeClient.searchByPostalCode(postalCode, countryCode);

    // Deduplicate cities (same postal code might return multiple entries)
    const cityMap = new Map<string, CityInfo>();

    for (const result of results) {
      const key = `${result.city}:${result.state || ''}`;
      if (!cityMap.has(key)) {
        cityMap.set(key, {
          city: result.city,
          state: result.state || result.province,
          stateCode: result.state_code,
        });
      }
    }

    return Array.from(cityMap.values());
  }

  /**
   * Get streets for a city/postal code combination
   * Returns empty array on error (frontend will enable free text input)
   */
  async getStreets(countryCode: string, city: string, postalCode: string): Promise<Street[]> {
    try {
      return await this.overpassClient.getStreets(countryCode, city, postalCode);
    } catch (error) {
      this.logger.warn(
        { error, countryCode, city, postalCode },
        'Failed to fetch streets from Overpass',
      );
      return [];
    }
  }

  /**
   * Get house numbers for a street
   * Returns empty array on error (frontend will enable free text input)
   */
  async getHouseNumbers(
    countryCode: string,
    city: string,
    postalCode: string,
    street: string,
  ): Promise<HouseNumber[]> {
    try {
      return await this.overpassClient.getHouseNumbers(countryCode, city, postalCode, street);
    } catch (error) {
      this.logger.warn(
        { error, countryCode, city, postalCode, street },
        'Failed to fetch house numbers from Overpass',
      );
      return [];
    }
  }
}
