import { type DateType, DateTypeSchema } from '@freundebuch/shared/index.js';
import { makeEnumParser } from './make-enum-parser.js';

export const parseDateType = makeEnumParser<DateType>(DateTypeSchema, 'DateType');
