import type { EmailInputSchema, EmailType } from '$shared';

/** camelCase companion of `EmailInputSchema`, shared by the friend and collective email endpoints. */
export interface EmailData {
  emailAddress: string;
  emailType: EmailType;
  label?: string;
  isPrimary?: boolean;
}

export function mapEmailInput(data: EmailData) {
  return {
    email_address: data.emailAddress,
    email_type: data.emailType,
    label: data.label,
    is_primary: data.isPrimary,
  } satisfies typeof EmailInputSchema.inferIn;
}
