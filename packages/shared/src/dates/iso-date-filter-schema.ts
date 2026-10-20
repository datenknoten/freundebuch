import { IsoDateStringSchema } from './iso-date-string-schema.js';

/** A date filter in a query string: absent or empty both mean "no filter". */
export const IsoDateFilterSchema = IsoDateStringSchema.or('""');
