/**
 * Address fields that, when changed, invalidate previously computed geocoding
 * coordinates, as written by a request.
 */
export interface AddressGeoData {
  streetLine1?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

/** The same fields as stored on an address row. */
export interface AddressGeoRow {
  street_line1: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
}

function norm(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

/**
 * Returns true when any geo-relevant address field differs between the
 * incoming data and the persisted row. Whitespace and case are ignored to
 * avoid pointless re-geocoding on cosmetic changes.
 */
export function addressGeoFieldsChanged(data: AddressGeoData, row: AddressGeoRow) {
  return (
    norm(data.streetLine1) !== norm(row.street_line1) ||
    norm(data.city) !== norm(row.city) ||
    norm(data.postalCode) !== norm(row.postal_code) ||
    norm(data.country) !== norm(row.country)
  );
}
