import { type } from 'arktype';
import { EmailTypeSchema } from './email-type.js';

export const EmailResponseSchema = type({
  id: 'string',
  emailAddress: 'string',
  emailType: EmailTypeSchema,
  'label?': 'string',
  isPrimary: 'boolean',
  createdAt: 'string',
});

export type EmailResponse = typeof EmailResponseSchema.infer;
