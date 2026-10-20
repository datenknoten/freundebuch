import { type EmailType, EmailTypeSchema } from '@freundebuch/shared/index.js';
import { makeEnumParser } from './make-enum-parser.js';

export const parseEmailType = makeEnumParser<EmailType>(EmailTypeSchema, 'EmailType');
