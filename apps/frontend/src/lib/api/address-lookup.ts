import type {
  CityInfoResponse,
  HouseNumberInfoResponse,
  PostalCodeInfoResponse,
  StreetInfoResponse,
} from '$shared';
import { apiRequest } from './client.js';

/**
 * Search postal codes by prefix (autocomplete), returning postal-code/city pairs
 */
export async function getPostalCodes(
  countryCode: string,
  prefix: string,
): Promise<PostalCodeInfoResponse[]> {
  const params = new URLSearchParams({
    country: countryCode,
    prefix,
  });
  return apiRequest(`/api/address-lookup/postal-codes?${params}`);
}

/**
 * Get cities for a postal code in a country
 */
export async function getCities(
  countryCode: string,
  postalCode: string,
): Promise<CityInfoResponse[]> {
  const params = new URLSearchParams({
    country: countryCode,
    postal_code: postalCode,
  });
  return apiRequest(`/api/address-lookup/cities?${params}`);
}

/**
 * Get streets for a city/postal code combination
 */
export async function getStreets(
  countryCode: string,
  city: string,
  postalCode: string,
): Promise<StreetInfoResponse[]> {
  const params = new URLSearchParams({
    country: countryCode,
    city,
    postal_code: postalCode,
  });
  return apiRequest(`/api/address-lookup/streets?${params}`);
}

/**
 * Get house numbers for a street
 */
export async function getHouseNumbers(
  countryCode: string,
  city: string,
  postalCode: string,
  street: string,
): Promise<HouseNumberInfoResponse[]> {
  const params = new URLSearchParams({
    country: countryCode,
    city,
    postal_code: postalCode,
    street,
  });
  return apiRequest(`/api/address-lookup/house-numbers?${params}`);
}
