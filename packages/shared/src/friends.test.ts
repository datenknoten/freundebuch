import { describe, expect, it } from 'vitest';
import {
  DateInputSchema,
  EmailInputSchema,
  PhoneInputSchema,
  ProfessionalHistoryInputSchema,
  SocialProfileInputSchema,
  UrlInputSchema,
} from './friends.js';

describe('PhoneInputSchema', () => {
  it('accepts a valid E.164 phone number', () => {
    const result = PhoneInputSchema({
      phone_number: '+4915112345678',
      phone_type: 'mobile',
    });
    expect(result).toEqual({ phone_number: '+4915112345678', phone_type: 'mobile' });
  });

  it('rejects an invalid phone number', () => {
    const result = PhoneInputSchema({
      phone_number: 'not-a-number',
      phone_type: 'mobile',
    });
    expect(result.summary).toMatchInlineSnapshot(
      `"must be a valid phone number (was {"phone_number":"not-a-number","phone_type":"mobile"})"`,
    );
  });

  it('rejects an empty phone number', () => {
    const result = PhoneInputSchema({
      phone_number: '',
      phone_type: 'home',
    });
    expect(result.summary).toMatchInlineSnapshot(`"phone_number must be non-empty"`);
  });
});

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

describe('UrlInputSchema', () => {
  it('accepts a valid URL', () => {
    const result = UrlInputSchema({
      url: 'https://example.com',
      url_type: 'personal',
    });
    expect(result).toEqual({ url: 'https://example.com', url_type: 'personal' });
  });

  it('rejects an invalid URL', () => {
    const result = UrlInputSchema({
      url: 'not-a-url',
      url_type: 'personal',
    });
    expect(result.summary).toMatchInlineSnapshot(`"url must be a URL string (was "not-a-url")"`);
  });

  it('rejects an invalid URL type', () => {
    const result = UrlInputSchema({
      url: 'https://example.com',
      url_type: 'school',
    });
    expect(result.summary).toMatchInlineSnapshot(
      `"url_type must be "blog", "other", "personal" or "work" (was "school")"`,
    );
  });
});

describe('DateInputSchema', () => {
  it('accepts a valid date', () => {
    const result = DateInputSchema({
      date_value: '1990-05-15',
      date_type: 'birthday',
    });
    expect(result).toEqual({ date_value: '1990-05-15', date_type: 'birthday' });
  });

  it('accepts a date with year_known flag', () => {
    const result = DateInputSchema({
      date_value: '2000-12-25',
      year_known: false,
      date_type: 'anniversary',
    });
    expect(result).toEqual({
      date_value: '2000-12-25',
      year_known: false,
      date_type: 'anniversary',
    });
  });
});

describe('SocialProfileInputSchema', () => {
  it('accepts a profile with url only', () => {
    const result = SocialProfileInputSchema({
      platform: 'github',
      profile_url: 'https://github.com/user',
    });
    expect(result).toEqual({
      platform: 'github',
      profile_url: 'https://github.com/user',
    });
  });

  it('accepts a profile with username only', () => {
    const result = SocialProfileInputSchema({
      platform: 'twitter',
      username: '@user',
    });
    expect(result).toEqual({
      platform: 'twitter',
      username: '@user',
    });
  });

  it('rejects a profile with neither url nor username', () => {
    const result = SocialProfileInputSchema({
      platform: 'github',
    });
    expect(result.summary).toMatchInlineSnapshot(
      `"must be a social profile with either profile_url or username (was {"platform":"github"})"`,
    );
  });

  it('rejects a profile with an invalid URL scheme', () => {
    const result = SocialProfileInputSchema({
      platform: 'github',
      profile_url: 'ftp://github.com/user',
    });
    expect(result.summary).toMatchInlineSnapshot(
      `"must be a social profile with a valid URL (must start with http:// or https://) (was {"platform":"github","profile_url":"ftp://github.com/user"})"`,
    );
  });
});

describe('ProfessionalHistoryInputSchema', () => {
  it('accepts an entry with job_title only', () => {
    const result = ProfessionalHistoryInputSchema({
      job_title: 'Engineer',
      from_month: 1,
      from_year: 2020,
    });
    expect(result).toEqual({
      job_title: 'Engineer',
      from_month: 1,
      from_year: 2020,
    });
  });

  it('accepts an entry with organization only', () => {
    const result = ProfessionalHistoryInputSchema({
      organization: 'Acme Corp',
      from_month: 6,
      from_year: 2019,
    });
    expect(result).toEqual({
      organization: 'Acme Corp',
      from_month: 6,
      from_year: 2019,
    });
  });

  it('rejects an entry with neither job_title nor organization', () => {
    const result = ProfessionalHistoryInputSchema({
      from_month: 1,
      from_year: 2020,
    });
    expect(result.summary).toMatchInlineSnapshot(
      `"must be a professional history entry with either job_title or organization (was {"from_month":1,"from_year":2020})"`,
    );
  });

  it('rejects an invalid month', () => {
    const result = ProfessionalHistoryInputSchema({
      job_title: 'Engineer',
      from_month: 13,
      from_year: 2020,
    });
    expect(result.summary).toMatchInlineSnapshot(`"from_month must be at most 12 (was 13)"`);
  });

  it('rejects to_month without to_year', () => {
    const result = ProfessionalHistoryInputSchema({
      job_title: 'Engineer',
      from_month: 1,
      from_year: 2020,
      to_month: 6,
    });
    expect(result.summary).toMatchInlineSnapshot(
      `"must be a professional history entry with both to_month and to_year set or both null (was {"job_title":"Engineer","from_month":1,"from_year":2020,"to_month":6})"`,
    );
  });

  it('rejects end date before start date', () => {
    const result = ProfessionalHistoryInputSchema({
      job_title: 'Engineer',
      from_month: 6,
      from_year: 2020,
      to_month: 1,
      to_year: 2020,
    });
    expect(result.summary).toMatchInlineSnapshot(
      `"must be a professional history entry with end date after or equal to start date (was {"job_title":"Engineer","from_month":6,"from_year":2020,"to_month":1,"to_year":2020})"`,
    );
  });

  it('accepts equal start and end dates', () => {
    const result = ProfessionalHistoryInputSchema({
      job_title: 'Engineer',
      from_month: 6,
      from_year: 2020,
      to_month: 6,
      to_year: 2020,
    });
    expect(result).toEqual({
      job_title: 'Engineer',
      from_month: 6,
      from_year: 2020,
      to_month: 6,
      to_year: 2020,
    });
  });
});
