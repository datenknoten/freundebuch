import { type } from 'arktype';

const MatchSourceSchema = type("'friend' | 'email' | 'phone' | 'notes'");

export function parseMatchSource(
  value: string | null,
): 'friend' | 'email' | 'phone' | 'notes' | null {
  if (value === null) return null;
  try {
    return MatchSourceSchema.assert(value);
  } catch {
    return null;
  }
}
