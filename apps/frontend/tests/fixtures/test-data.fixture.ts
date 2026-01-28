/**
 * Test data factories for E2E tests
 */

/**
 * Generate a unique friend name with timestamp prefix for test isolation
 */
export function generateFriendName(baseName = 'Test Friend'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  return `Test_${timestamp}_${random}_${baseName}`;
}

/**
 * Generate a unique circle name with timestamp prefix for test isolation
 */
export function generateCircleName(baseName = 'Test Circle'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  return `Test_${timestamp}_${random}_${baseName}`;
}

// Phone number data for testing
export const TEST_PHONES = {
  mobile: '+49 151 12345678',
  home: '+49 30 98765432',
  work: '+49 89 11223344',
  invalid: '123', // Invalid format for error testing
};

// Email data for testing
export const TEST_EMAILS = {
  personal: 'test.personal@example.com',
  work: 'test.work@company.com',
  invalid: 'not-an-email', // Invalid format for error testing
};

// Address data for testing
export const TEST_ADDRESSES = {
  home: {
    streetLine1: 'Teststraße 123',
    streetLine2: 'Apartment 4B',
    city: 'Berlin',
    stateProvince: 'Berlin',
    postalCode: '10115',
    country: 'Germany',
  },
  work: {
    streetLine1: '456 Business Ave',
    city: 'Munich',
    postalCode: '80331',
    country: 'Germany',
  },
};

// URL data for testing
export const TEST_URLS = {
  personal: 'https://personal-website.example.com',
  work: 'https://company.example.com',
  blog: 'https://blog.example.com/my-blog',
  invalid: 'not-a-url', // Invalid format for error testing
};

// Date data for testing
export const TEST_DATES = {
  birthday: '1990-05-15',
  anniversary: '2015-06-20',
  custom: '2020-01-01',
};

// Social profile data for testing
export const TEST_SOCIAL_PROFILES = {
  linkedin: {
    platform: 'linkedin' as const,
    profileUrl: 'https://linkedin.com/in/testuser',
  },
  github: {
    platform: 'github' as const,
    username: 'testuser-github',
  },
  twitter: {
    platform: 'twitter' as const,
    username: '@testuser',
  },
};

// Professional history data for testing
export const TEST_PROFESSIONAL_HISTORY = {
  current: {
    jobTitle: 'Software Engineer',
    organization: 'Test Corp',
    department: 'Engineering',
    fromMonth: 1,
    fromYear: 2020,
    isPrimary: true,
  },
  previous: {
    jobTitle: 'Junior Developer',
    organization: 'Startup Inc',
    fromMonth: 6,
    fromYear: 2018,
    toMonth: 12,
    toYear: 2019,
    isPrimary: false,
  },
};

// Circle data for testing
export const TEST_CIRCLES = {
  family: { name: 'Family', color: '#EF4444' },
  work: { name: 'Work', color: '#3B82F6' },
  friends: { name: 'Friends', color: '#22C55E' },
};

// Seeded demo friend names (for reference in tests)
export const SEEDED_FRIENDS = [
  'Anna Schmidt',
  'Max Weber',
  'Sarah Johnson',
  'Thomas Müller',
  'Emma Fischer',
  'Oma Helga',
  'Onkel Hans',
  'Lisa Becker',
  'Michael Brown',
  'Julia Wagner',
  'Peter Hoffmann',
  'Chris',
  'Maria Garcia',
  'Yuki Tanaka',
  'Robert Klein',
];

// Seeded circle names (for reference in tests)
export const SEEDED_CIRCLES = ['Family', 'Work', 'Friends', 'Book Club', 'Sports'];

/**
 * Get a seeded friend by partial name match
 */
export function getSeededFriendName(partialName: string): string | undefined {
  return SEEDED_FRIENDS.find((name) => name.toLowerCase().includes(partialName.toLowerCase()));
}

/**
 * Create a full friend data object for API calls
 */
export function createFriendData(
  overrides: Partial<{
    displayName: string;
    nameFirst: string;
    nameLast: string;
    nickname: string;
    phones: Array<{ phone_number: string; phone_type: string; is_primary?: boolean }>;
    emails: Array<{ email_address: string; email_type: string; is_primary?: boolean }>;
  }> = {},
): {
  display_name: string;
  name_first?: string;
  name_last?: string;
  nickname?: string;
  phones?: Array<{ phone_number: string; phone_type: string; is_primary?: boolean }>;
  emails?: Array<{ email_address: string; email_type: string; is_primary?: boolean }>;
} {
  const name = overrides.displayName || generateFriendName();

  return {
    display_name: name,
    name_first: overrides.nameFirst,
    name_last: overrides.nameLast,
    nickname: overrides.nickname,
    phones: overrides.phones,
    emails: overrides.emails,
  };
}
