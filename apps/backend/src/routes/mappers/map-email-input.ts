import type { EmailInput } from '@freundebuch/shared/index.js';
import type { EmailData } from '../../services/friends/sub-resources/email.service.js';

export function mapEmailInput(input: EmailInput) {
  return {
    emailAddress: input.email_address,
    emailType: input.email_type,
    label: input.label,
    isPrimary: input.is_primary,
  } satisfies EmailData;
}
