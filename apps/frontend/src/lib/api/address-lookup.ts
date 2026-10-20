import {
  CityInfoResponseSchema,
  HouseNumberInfoResponseSchema,
  PostalCodeInfoResponseSchema,
  StreetInfoResponseSchema,
} from '$shared';
import type { ApiClient } from './api-client.js';

export interface AddressLookupApiOptions {
  client: ApiClient;
}

export interface StreetLookup {
  countryCode: string;
  city: string;
  postalCode: string;
}

export interface HouseNumberLookup extends StreetLookup {
  street: string;
}

const PostalCodeInfoResponseListSchema = PostalCodeInfoResponseSchema.array();
const CityInfoResponseListSchema = CityInfoResponseSchema.array();
const StreetInfoResponseListSchema = StreetInfoResponseSchema.array();
const HouseNumberInfoResponseListSchema = HouseNumberInfoResponseSchema.array();

/** Autocomplete for the address form, one level of the address hierarchy per method. */
export class AddressLookupApi {
  private readonly client: ApiClient;

  public constructor(options: AddressLookupApiOptions) {
    this.client = options.client;
  }

  /** Postal-code/city pairs whose postal code starts with the prefix. */
  public listPostalCodes(countryCode: string, prefix: string) {
    const params = new URLSearchParams({ country: countryCode, prefix });
    return this.client.request(
      PostalCodeInfoResponseListSchema,
      `/api/address-lookup/postal-codes?${params}`,
    );
  }

  public listCities(countryCode: string, postalCode: string) {
    const params = new URLSearchParams({ country: countryCode, postal_code: postalCode });
    return this.client.request(CityInfoResponseListSchema, `/api/address-lookup/cities?${params}`);
  }

  public listStreets(lookup: StreetLookup) {
    const params = new URLSearchParams({
      country: lookup.countryCode,
      city: lookup.city,
      postal_code: lookup.postalCode,
    });
    return this.client.request(
      StreetInfoResponseListSchema,
      `/api/address-lookup/streets?${params}`,
    );
  }

  public listHouseNumbers(lookup: HouseNumberLookup) {
    const params = new URLSearchParams({
      country: lookup.countryCode,
      city: lookup.city,
      postal_code: lookup.postalCode,
      street: lookup.street,
    });
    return this.client.request(
      HouseNumberInfoResponseListSchema,
      `/api/address-lookup/house-numbers?${params}`,
    );
  }
}
