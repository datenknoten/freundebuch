import { type UrlType, UrlTypeSchema } from '@freundebuch/shared/index.js';
import { makeEnumParser } from './make-enum-parser.js';

export const parseUrlType = makeEnumParser<UrlType>(UrlTypeSchema, 'UrlType');
