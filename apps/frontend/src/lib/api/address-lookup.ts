import { get } from 'svelte/store';
import type { CityInfo, CountryInfo, ErrorResponse, HouseNumberInfo, StreetInfo } from '$shared';
import { auth } from '../stores/auth.js';
import { ApiError } from './auth.js';

// In production with single-domain deployment, use empty string for same-origin requests.
// In development, VITE_API_URL can point to the backend server if needed.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

/**
 * Get the current access token from the auth store
 */
function getAccessToken(): string | null {
  const authState = get(auth);
  return authState.accessToken;
}

/**
 * Helper function to make authenticated API requests
 */
async function apiRequest<T>(endpoint: string): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const accessToken = getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData: ErrorResponse = await response.json().catch(() => ({
      error: 'An unknown error occurred',
    }));

    throw new ApiError(response.status, errorData.error, errorData.code, errorData.details);
  }

  return response.json();
}

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
