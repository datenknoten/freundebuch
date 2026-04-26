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

/**
 * Parse street_line1 into street name and house number.
 *
 * Handles two common formats:
 *   - DACH/EU: "Hauptstraße 10", "Rue de Rivoli 42b"  -> street trails, number leads
 *   - US/UK:   "10 Main Street", "221B Baker St"      -> number trails, street leads
 *
 * Returns the original string as `street` (no number) if neither pattern matches.
 */
export function parseStreetLine(streetLine1?: string): { street?: string; houseNumber?: string } {
  if (!streetLine1) return {};
  const trimmed = streetLine1.trim();
  if (!trimmed) return {};

  // Trailing-number form: "Hauptstraße 10", "Hauptstraße 10a", "Hauptstraße 10/3"
  const trailing = trimmed.match(/^(.+?)\s+(\d+\S*)$/);
  if (trailing) {
    return { street: trailing[1].trim(), houseNumber: trailing[2].trim() };
  }

  // Leading-number form: "10 Main St", "221B Baker St"
  const leading = trimmed.match(/^(\d+\S*)\s+(.+)$/);
  if (leading) {
    return { street: leading[2].trim(), houseNumber: leading[1].trim() };
  }

  return { street: trimmed };
}
