import type { MetInfoInputSchema } from '$shared';

/** camelCase companion of `MetInfoInputSchema`; `null` clears a field. */
export interface MetInfoData {
  metDate?: string | null;
  metLocation?: string | null;
  metContext?: string | null;
}

export function mapMetInfoInput(data: MetInfoData) {
  return {
    met_date: data.metDate,
    met_location: data.metLocation,
    met_context: data.metContext,
  } satisfies typeof MetInfoInputSchema.inferIn;
}
