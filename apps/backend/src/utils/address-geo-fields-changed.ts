/**
 * Subset of address fields that, when changed, invalidate previously
 * computed geocoding coordinates.
 */
export interface AddressGeoFields {
  street_line1?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

const norm = (v?: string | null): string => (v ?? '').trim().toLowerCase();

/**
 * Returns true when any geo-relevant address field differs between the
 * incoming input and the persisted row. Whitespace and case are ignored to
 * avoid pointless re-geocoding on cosmetic changes.
 */
export function addressGeoFieldsChanged(a: AddressGeoFields, b: AddressGeoFields): boolean {
  return (
    norm(a.street_line1) !== norm(b.street_line1) ||
    norm(a.city) !== norm(b.city) ||
    norm(a.postal_code) !== norm(b.postal_code) ||
    norm(a.country) !== norm(b.country)
  );
}
