import type { CityInfoResponse, PostalCodeInfoResponse } from '@freundebuch/shared/index.js';
import type { Logger } from 'pino';
import type { NominatimClient } from './external/nominatim.client.js';
import type { HouseNumber, OverpassClient, Street } from './external/overpass.client.js';
import type { PostGISAddressClient } from './external/postgis-address.client.js';

/** DACH countries supported by PostGIS address data */
const DACH_COUNTRIES = ['DE', 'AT', 'CH'];

export interface AddressLookupServiceOptions {
  logger: Logger;
  overpassClient: OverpassClient;
  nominatimClient: NominatimClient;
  /** PostGIS lookups are enabled exactly when a client is given. */
  postgisClient?: PostGISAddressClient;
  isPostgisDachOnly: boolean;
}

export class AddressLookupService {
  private readonly logger: Logger;
  private readonly overpassClient: OverpassClient;
  private readonly nominatimClient: NominatimClient;
  private readonly postgisClient: PostGISAddressClient | undefined;
  private readonly isPostgisDachOnly: boolean;

  constructor(options: AddressLookupServiceOptions) {
    this.logger = options.logger;
    this.overpassClient = options.overpassClient;
    this.nominatimClient = options.nominatimClient;
    this.postgisClient = options.postgisClient;
    this.isPostgisDachOnly = options.isPostgisDachOnly;
  }

  /**
   * Check if PostGIS should be used for this country
   */
  private shouldUsePostGIS(countryCode: string): boolean {
    if (!this.postgisClient) {
      return false;
    }

    if (this.isPostgisDachOnly) {
      return DACH_COUNTRIES.includes(countryCode.toUpperCase());
    }

    return true;
  }

  /**
   * Get cities for a postal code in a country.
   *
   * Backed entirely by PostGIS (DACH OSM data). For non-DACH countries, or when
   * PostGIS is disabled or has no data for the postal code, an empty list is
   * returned and the frontend falls back to free-text entry. PostGIS-sourced
   * cities carry no state/province — the geodata schema has no such column.
   */
  public async getCitiesByPostalCode(
    countryCode: string,
    postalCode: string,
  ): Promise<CityInfoResponse[]> {
    if (!this.shouldUsePostGIS(countryCode) || !this.postgisClient) {
      return [];
    }

    try {
      const cities = await this.postgisClient.getCitiesByPostalCode(countryCode, postalCode);
      this.logger.debug(
        { countryCode, postalCode, count: cities.length },
        'PostGIS cities lookup completed',
      );
      return cities.map((c) => ({ city: c.city }));
    } catch (error) {
      this.logger.warn({ err: error, countryCode, postalCode }, 'PostGIS cities lookup failed');
      return [];
    }
  }

  /**
   * Search postal codes by prefix for autocomplete (e.g. "55" -> "55116" Mainz).
   *
   * Backed entirely by PostGIS (DACH OSM data). Returns an empty list for
   * non-DACH countries or when PostGIS is disabled / has no matching data.
   */
  public async searchPostalCodes(
    countryCode: string,
    prefix: string,
  ): Promise<PostalCodeInfoResponse[]> {
    if (!this.shouldUsePostGIS(countryCode) || !this.postgisClient) {
      return [];
    }

    try {
      const matches = await this.postgisClient.searchPostalCodes(countryCode, prefix);
      this.logger.debug(
        { countryCode, prefix, count: matches.length },
        'PostGIS postal code search completed',
      );
      return matches;
    } catch (error) {
      this.logger.warn({ err: error, countryCode, prefix }, 'PostGIS postal code search failed');
      return [];
    }
  }

  /**
   * Get streets for a city/postal code combination
   * Uses PostGIS for DACH countries (if enabled), falls back to Overpass
   * Returns empty array on error (frontend will enable free text input)
   */
  public async getStreets(
    countryCode: string,
    city: string,
    postalCode: string,
  ): Promise<Street[]> {
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
          { err: error, countryCode, city, postalCode },
          'PostGIS streets lookup failed, falling back to Overpass',
        );
      }
    }

    // Fallback to Overpass
    try {
      return await this.overpassClient.getStreets(countryCode, city, postalCode);
    } catch (error) {
      this.logger.warn(
        { err: error, countryCode, city, postalCode },
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
  public async getHouseNumbers(
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
          { err: error, countryCode, city, postalCode, street },
          'PostGIS house numbers lookup failed, falling back to Overpass',
        );
      }
    }

    // Fallback to Overpass
    try {
      return await this.overpassClient.getHouseNumbers(countryCode, city, postalCode, street);
    } catch (error) {
      this.logger.warn(
        { err: error, countryCode, city, postalCode, street },
        'Failed to fetch house numbers from Overpass',
      );
      return [];
    }
  }

  /**
   * Geocode an address to lat/lon coordinates.
   * Uses PostGIS for DACH countries (if enabled), falls back to Nominatim.
   * Returns undefined if geocoding fails — never throws.
   */
  public async geocodeAddress(
    countryCode: string,
    city: string,
    postalCode: string,
    street?: string,
    houseNumber?: string,
  ) {
    // Need at least country + city or postal code
    if (countryCode === '' || (city === '' && postalCode === '')) {
      return undefined;
    }

    if (
      this.shouldUsePostGIS(countryCode) &&
      this.postgisClient !== undefined &&
      street !== undefined &&
      street !== ''
    ) {
      try {
        const location = await this.postgisClient.geocodeAddress(
          countryCode,
          postalCode,
          city,
          street,
          houseNumber,
        );
        if (location !== undefined) {
          this.logger.debug({ countryCode, city, postalCode, street }, 'PostGIS geocode succeeded');
          return location;
        }
        this.logger.debug(
          { countryCode, city, postalCode, street },
          'PostGIS geocode returned no results, falling back to Nominatim',
        );
      } catch (error) {
        this.logger.warn(
          { err: error, countryCode, city, postalCode, street },
          'PostGIS geocode failed, falling back to Nominatim',
        );
      }
    }

    // Fallback to Nominatim
    try {
      return await this.nominatimClient.geocode(countryCode, city, postalCode, street, houseNumber);
    } catch (error) {
      this.logger.warn(
        { err: error, countryCode, city, postalCode, street },
        'Nominatim geocode failed',
      );
      return undefined;
    }
  }
}
