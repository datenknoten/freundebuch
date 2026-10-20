import { type PhoneType, PhoneTypeSchema } from '@freundebuch/shared/index.js';
import { makeEnumParser } from './make-enum-parser.js';

export const parsePhoneType = makeEnumParser<PhoneType>(PhoneTypeSchema, 'PhoneType');
