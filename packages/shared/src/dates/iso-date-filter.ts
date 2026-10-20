import { IsoDateString } from './iso-date-string.js';

/** A date filter in a query string: absent or empty both mean "no filter". */
export const IsoDateFilter = IsoDateString.or('""');
