import { type } from 'arktype';
import { EmailTypeSchema } from './email-type.js';

/** Schema for creating/updating an email address */
export const EmailInputSchema = type({
  email_address: 'string.email',
  email_type: EmailTypeSchema,
  'label?': 'string',
  is_primary: 'boolean = false',
});

export type EmailInput = typeof EmailInputSchema.infer;
