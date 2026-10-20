import type { EmailType } from './email-type.js';

/** Email address in API responses */
export interface Email {
  id: string;
  emailAddress: string;
  emailType: EmailType;
  label?: string;
  isPrimary: boolean;
  createdAt: string;
}
