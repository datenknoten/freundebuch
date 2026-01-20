import type { Logger } from 'pino';
import { type HouseNumber, OverpassClient, type Street } from './external/overpass.client.js';
import type { PostGISAddressClient } from './external/postgis-address.client.js';
import { type Country, ZipcodeBaseClient } from './external/zipcodebase.client.js';

export interface CityInfo {
  city: string;
  state?: string;
  stateCode?: string;
}

export type { Country, Street, HouseNumber };

/** DACH countries supported by PostGIS address data */
const DACH_COUNTRIES = ['DE', 'AT', 'CH'];

export interface AddressLookupServiceOptions {
  zipcodeApiKey: string;
  overpassPrimaryUrl: string;
  overpassFallbackUrl: string;
  postgisClient?: PostGISAddressClient;
  postgisEnabled?: boolean;
  postgisDachOnly?: boolean;
}

export class AddressLookupService {
  private zipcodeClient: ZipcodeBaseClient;
  private overpassClient: OverpassClient;
  private postgisClient?: PostGISAddressClient;
  private postgisEnabled: boolean;
  private postgisDachOnly: boolean;

  constructor(
    options: AddressLookupServiceOptions,
    private logger: Logger,
  ) {
    this.zipcodeClient = new ZipcodeBaseClient(options.zipcodeApiKey, logger);
    this.overpassClient = new OverpassClient(
      options.overpassPrimaryUrl,
      options.overpassFallbackUrl,
      logger,
    );
    this.postgisClient = options.postgisClient;
    this.postgisEnabled = options.postgisEnabled ?? false;
    this.postgisDachOnly = options.postgisDachOnly ?? true;
  }

  /**
   * Check if PostGIS should be used for this country
   */
  private shouldUsePostGIS(countryCode: string): boolean {
    if (!this.postgisEnabled || !this.postgisClient) {
      return false;
    }

    if (this.postgisDachOnly) {
      return DACH_COUNTRIES.includes(countryCode.toUpperCase());
    }

    return true;
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
   * Uses PostGIS for DACH countries (if enabled), falls back to Overpass
   * Returns empty array on error (frontend will enable free text input)
   */
  async getStreets(countryCode: string, city: string, postalCode: string): Promise<Street[]> {
    // Try PostGIS first for DACH countries
    if (this.shouldUsePostGIS(countryCode) && this.postgisClient) {
      try {
        const streets = await this.postgisClient.getStreets(countryCode, city, postalCode);
        if (streets.length > 0) {
          this.logger.debug(
            { countryCode, city, postalCode, count: streets.length },
            'PostGIS streets lookup succeeded',
          );
          return streets;
        }
        // PostGIS returned empty, fall through to Overpass
        this.logger.debug(
          { countryCode, city, postalCode },
          'PostGIS returned no streets, falling back to Overpass',
        );
      } catch (error) {
        this.logger.warn(
          { error, countryCode, city, postalCode },
          'PostGIS streets lookup failed, falling back to Overpass',
        );
      }
    }

    // Fallback to Overpass
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
   * Uses PostGIS for DACH countries (if enabled), falls back to Overpass
   * Returns empty array on error (frontend will enable free text input)
   */
  async getHouseNumbers(
    countryCode: string,
    city: string,
    postalCode: string,
    street: string,
  ): Promise<HouseNumber[]> {
    // Try PostGIS first for DACH countries
    if (this.shouldUsePostGIS(countryCode) && this.postgisClient) {
      try {
        const houseNumbers = await this.postgisClient.getHouseNumbers(
          countryCode,
          city,
          postalCode,
          street,
        );
        if (houseNumbers.length > 0) {
          this.logger.debug(
            { countryCode, city, postalCode, street, count: houseNumbers.length },
            'PostGIS house numbers lookup succeeded',
          );
          return houseNumbers;
        }
        // PostGIS returned empty, fall through to Overpass
        this.logger.debug(
          { countryCode, city, postalCode, street },
          'PostGIS returned no house numbers, falling back to Overpass',
        );
      } catch (error) {
        this.logger.warn(
          { error, countryCode, city, postalCode, street },
          'PostGIS house numbers lookup failed, falling back to Overpass',
        );
      }
    }

    // Fallback to Overpass
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
