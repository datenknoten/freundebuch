import { type AddressType, AddressTypeSchema } from '@freundebuch/shared/index.js';
import { makeEnumParser } from './make-enum-parser.js';

export const parseAddressType = makeEnumParser<AddressType>(AddressTypeSchema, 'AddressType');
