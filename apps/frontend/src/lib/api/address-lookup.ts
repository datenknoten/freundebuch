import type { CityInfo, CountryInfo, HouseNumberInfo, StreetInfo } from '$shared';
import { apiRequest } from './client.js';

/**
 * Get list of supported countries
 */
export async function getCountries(): Promise<CountryInfo[]> {
  return apiRequest('/api/address-lookup/countries');
}

/**
 * Get cities for a postal code in a country
 */
export async function getCities(countryCode: string, postalCode: string): Promise<CityInfo[]> {
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
): Promise<StreetInfo[]> {
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
): Promise<HouseNumberInfo[]> {
  const params = new URLSearchParams({
    country: countryCode,
    city,
    postal_code: postalCode,
    street,
  });
  return apiRequest(`/api/address-lookup/house-numbers?${params}`);
}
