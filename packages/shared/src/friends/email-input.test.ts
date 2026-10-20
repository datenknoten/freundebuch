import { describe, expect, it } from 'vitest';
import { EmailInputSchema } from './email-input.js';

describe('EmailInputSchema', () => {
  it('accepts a valid email', () => {
    const result = EmailInputSchema({
      email_address: 'test@example.com',
      email_type: 'personal',
    });
    expect(result).toEqual({ email_address: 'test@example.com', email_type: 'personal' });
  });

  it('rejects an invalid email', () => {
    const result = EmailInputSchema({
      email_address: 'not-an-email',
      email_type: 'personal',
    });
    expect(result.summary).toMatchInlineSnapshot(
      `"email_address must be an email address (was "not-an-email")"`,
    );
  });

  it('rejects an invalid email type', () => {
    const result = EmailInputSchema({
      email_address: 'test@example.com',
      email_type: 'school',
    });
    expect(result.summary).toMatchInlineSnapshot(
      `"email_type must be "other", "personal" or "work" (was "school")"`,
    );
  });
});
