/**
 * Seed script for creating demo data in the Freundebuch database
 *
 * Creates:
 * - Demo user (demo@example.com / demopassword123) - with completed onboarding
 * - Test user (test@example.com / testpassword123) - for E2E tests
 * - ~15 demo friends with varied data
 * - 5 circles: Family, Work, Friends, Book Club, Sports
 * - Friend-circle assignments
 *
 * Run with: pnpm --filter backend run seed
 */

import bcrypt from 'bcrypt';
import pg from 'pg';

const SALT_ROUNDS = 10;

// Demo and test user credentials
const DEMO_USER = {
  email: 'demo@example.com',
  password: 'demopassword123',
};

const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123',
};

// Circle definitions
const CIRCLES = [
  { name: 'Family', color: '#EF4444' }, // red
  { name: 'Work', color: '#3B82F6' }, // blue
  { name: 'Friends', color: '#22C55E' }, // green
  { name: 'Book Club', color: '#8B5CF6' }, // violet
  { name: 'Sports', color: '#F97316' }, // orange
];

// Demo friends with varied data completeness
const DEMO_FRIENDS = [
  {
    displayName: 'Anna Schmidt',
    nameFirst: 'Anna',
    nameLast: 'Schmidt',
    maidenName: 'Müller',
    nickname: 'Annie',
    phones: [
      { number: '+49 151 12345678', type: 'mobile', isPrimary: true },
      { number: '+49 30 12345678', type: 'home', isPrimary: false },
    ],
    emails: [
      { address: 'anna.schmidt@example.com', type: 'personal', isPrimary: true },
      { address: 'a.schmidt@work.example.com', type: 'work', isPrimary: false },
    ],
    addresses: [
      {
        street1: 'Hauptstraße 42',
        city: 'Berlin',
        postalCode: '10115',
        country: 'Germany',
        type: 'home',
        isPrimary: true,
      },
    ],
    dates: [
      { value: '1985-03-15', type: 'birthday', yearKnown: true },
      { value: '2010-06-20', type: 'anniversary', yearKnown: true, label: 'Wedding' },
    ],
    professionalHistory: [
      {
        jobTitle: 'Software Engineer',
        organization: 'TechCorp GmbH',
        department: 'Engineering',
        fromMonth: 3,
        fromYear: 2018,
        isPrimary: true,
      },
    ],
    socialProfiles: [
      { platform: 'linkedin', profileUrl: 'https://linkedin.com/in/anna-schmidt' },
      { platform: 'github', username: 'anna-schmidt' },
    ],
    metInfo: {
      date: '2015-09-01',
      location: 'Berlin Tech Meetup',
      context: 'Met at a JavaScript conference',
    },
    interests: 'Hiking, Reading, Photography',
    circles: ['Work', 'Friends'],
    isFavorite: true,
  },
  {
    displayName: 'Max Weber',
    namePrefix: 'Dr.',
    nameFirst: 'Maximilian',
    nameMiddle: 'Friedrich',
    nameLast: 'Weber',
    nameSuffix: 'PhD',
    phones: [{ number: '+49 170 98765432', type: 'mobile', isPrimary: true }],
    emails: [{ address: 'max.weber@university.example.com', type: 'work', isPrimary: true }],
    addresses: [
      {
        street1: 'Universitätsstraße 1',
        city: 'Munich',
        postalCode: '80333',
        country: 'Germany',
        type: 'work',
        isPrimary: true,
      },
    ],
    dates: [{ value: '1978-11-22', type: 'birthday', yearKnown: true }],
    professionalHistory: [
      {
        jobTitle: 'Professor',
        organization: 'Ludwig-Maximilians-Universität',
        department: 'Computer Science',
        fromMonth: 9,
        fromYear: 2010,
        isPrimary: true,
      },
    ],
    socialProfiles: [{ platform: 'linkedin', profileUrl: 'https://linkedin.com/in/max-weber-phd' }],
    circles: ['Work', 'Book Club'],
  },
  {
    displayName: 'Sarah Johnson',
    nameFirst: 'Sarah',
    nameLast: 'Johnson',
    phones: [{ number: '+1 555 123 4567', type: 'mobile', isPrimary: true }],
    emails: [{ address: 'sarah.j@example.com', type: 'personal', isPrimary: true }],
    addresses: [
      {
        street1: '123 Main Street',
        street2: 'Apt 4B',
        city: 'New York',
        stateProvince: 'NY',
        postalCode: '10001',
        country: 'USA',
        type: 'home',
        isPrimary: true,
      },
    ],
    dates: [{ value: '1990-07-04', type: 'birthday', yearKnown: true }],
    professionalHistory: [
      {
        jobTitle: 'Product Manager',
        organization: 'StartupXYZ',
        fromMonth: 1,
        fromYear: 2020,
        isPrimary: true,
      },
    ],
    circles: ['Friends'],
    isFavorite: true,
  },
  {
    displayName: 'Thomas Müller',
    nameFirst: 'Thomas',
    nameLast: 'Müller',
    nickname: 'Tommy',
    phones: [{ number: '+49 176 55544433', type: 'mobile', isPrimary: true }],
    emails: [{ address: 'thomas.mueller@example.de', type: 'personal', isPrimary: true }],
    addresses: [
      {
        street1: 'Goethestraße 15',
        city: 'Hamburg',
        postalCode: '20095',
        country: 'Germany',
        type: 'home',
        isPrimary: true,
      },
    ],
    // Birthday coming up soon (for dashboard widget testing)
    dates: [{ value: getUpcomingBirthday(7), type: 'birthday', yearKnown: true }],
    circles: ['Sports', 'Friends'],
  },
  {
    displayName: 'Emma Fischer',
    nameFirst: 'Emma',
    nameLast: 'Fischer',
    phones: [{ number: '+49 151 99988877', type: 'mobile', isPrimary: true }],
    emails: [{ address: 'emma.fischer@example.de', type: 'personal', isPrimary: true }],
    // Birthday coming up soon
    dates: [{ value: getUpcomingBirthday(3), type: 'birthday', yearKnown: true }],
    professionalHistory: [
      {
        jobTitle: 'UX Designer',
        organization: 'DesignStudio Berlin',
        fromMonth: 6,
        fromYear: 2019,
        isPrimary: true,
      },
    ],
    circles: ['Work', 'Book Club'],
    isFavorite: true,
  },
  {
    displayName: 'Oma Helga',
    nameFirst: 'Helga',
    nameLast: 'Schmidt',
    phones: [{ number: '+49 30 44455566', type: 'home', isPrimary: true }],
    addresses: [
      {
        street1: 'Friedrichstraße 100',
        city: 'Berlin',
        postalCode: '10117',
        country: 'Germany',
        type: 'home',
        isPrimary: true,
      },
    ],
    dates: [{ value: '1945-05-08', type: 'birthday', yearKnown: true }],
    circles: ['Family'],
    isFavorite: true,
  },
  {
    displayName: 'Onkel Hans',
    nameFirst: 'Hans',
    nameLast: 'Schmidt',
    phones: [{ number: '+49 89 77788899', type: 'mobile', isPrimary: true }],
    addresses: [
      {
        street1: 'Marienplatz 5',
        city: 'Munich',
        postalCode: '80331',
        country: 'Germany',
        type: 'home',
        isPrimary: true,
      },
    ],
    dates: [{ value: '1965-12-24', type: 'birthday', yearKnown: true }],
    circles: ['Family'],
  },
  {
    displayName: 'Lisa Becker',
    nameFirst: 'Lisa',
    nameLast: 'Becker',
    emails: [{ address: 'lisa.becker@example.com', type: 'personal', isPrimary: true }],
    dates: [{ value: '03-21', type: 'birthday', yearKnown: false }], // Year unknown
    circles: ['Book Club'],
  },
  {
    displayName: 'Michael Brown',
    nameFirst: 'Michael',
    nameLast: 'Brown',
    phones: [
      { number: '+44 7700 900123', type: 'mobile', isPrimary: true },
      { number: '+44 20 7946 0958', type: 'work', isPrimary: false },
    ],
    emails: [
      { address: 'michael.brown@company.co.uk', type: 'work', isPrimary: true },
      { address: 'm.brown@personal.com', type: 'personal', isPrimary: false },
    ],
    addresses: [
      {
        street1: '10 Downing Lane',
        city: 'London',
        postalCode: 'SW1A 2AA',
        country: 'United Kingdom',
        type: 'home',
        isPrimary: true,
      },
    ],
    professionalHistory: [
      {
        jobTitle: 'Senior Consultant',
        organization: 'BigConsulting Ltd',
        department: 'Strategy',
        fromMonth: 1,
        fromYear: 2015,
        isPrimary: true,
      },
      {
        jobTitle: 'Junior Analyst',
        organization: 'SmallFirm Inc',
        fromMonth: 6,
        fromYear: 2010,
        toMonth: 12,
        toYear: 2014,
        isPrimary: false,
      },
    ],
    socialProfiles: [
      { platform: 'linkedin', profileUrl: 'https://linkedin.com/in/michaelbrown' },
      { platform: 'twitter', username: '@mbrown_uk' },
    ],
    circles: ['Work'],
  },
  {
    displayName: 'Julia Wagner',
    nameFirst: 'Julia',
    nameLast: 'Wagner',
    phones: [{ number: '+49 160 11122233', type: 'mobile', isPrimary: true }],
    emails: [{ address: 'julia.wagner@example.de', type: 'personal', isPrimary: true }],
    urls: [
      { url: 'https://juliawagner.blog', type: 'blog' },
      {
        url: 'https://photography.julia-wagner.de',
        type: 'personal',
        label: 'Photography Portfolio',
      },
    ],
    interests: 'Photography, Travel, Cooking',
    metInfo: {
      date: '2018-04-15',
      location: 'Photography Workshop',
      context: 'We were both taking a landscape photography course',
    },
    circles: ['Friends', 'Sports'],
  },
  {
    displayName: 'Peter Hoffmann',
    nameFirst: 'Peter',
    nameLast: 'Hoffmann',
    nickname: 'Pete',
    phones: [{ number: '+49 172 33344455', type: 'mobile', isPrimary: true }],
    emails: [{ address: 'peter.hoffmann@example.de', type: 'personal', isPrimary: true }],
    dates: [
      { value: '1982-08-10', type: 'birthday', yearKnown: true },
      { value: '2015-03-14', type: 'other', yearKnown: true, label: 'First met' },
    ],
    professionalHistory: [
      {
        jobTitle: 'Football Coach',
        organization: 'FC Berlin',
        fromMonth: 8,
        fromYear: 2012,
        isPrimary: true,
      },
    ],
    circles: ['Sports'],
    isFavorite: true,
  },
  {
    // Minimal friend - testing sparse data
    displayName: 'Chris',
    circles: [],
  },
  {
    displayName: 'Maria Garcia',
    nameFirst: 'Maria',
    nameLast: 'Garcia',
    phones: [{ number: '+34 612 345 678', type: 'mobile', isPrimary: true }],
    emails: [{ address: 'maria.garcia@example.es', type: 'personal', isPrimary: true }],
    addresses: [
      {
        street1: 'Calle Mayor 25',
        city: 'Madrid',
        postalCode: '28013',
        country: 'Spain',
        type: 'home',
        isPrimary: true,
      },
    ],
    dates: [{ value: '1988-04-23', type: 'birthday', yearKnown: true }],
    professionalHistory: [
      {
        jobTitle: 'Marketing Director',
        organization: 'MediaGroup España',
        department: 'Marketing',
        fromMonth: 2,
        fromYear: 2017,
        isPrimary: true,
      },
    ],
    socialProfiles: [
      { platform: 'instagram', username: 'maria_garcia_madrid' },
      { platform: 'linkedin', profileUrl: 'https://linkedin.com/in/maria-garcia-marketing' },
    ],
    circles: ['Work'],
  },
  {
    displayName: 'Yuki Tanaka',
    nameFirst: 'Yuki',
    nameLast: 'Tanaka',
    phones: [{ number: '+81 90 1234 5678', type: 'mobile', isPrimary: true }],
    emails: [{ address: 'yuki.tanaka@example.jp', type: 'personal', isPrimary: true }],
    addresses: [
      {
        street1: '1-2-3 Shibuya',
        city: 'Tokyo',
        postalCode: '150-0001',
        country: 'Japan',
        type: 'home',
        isPrimary: true,
      },
    ],
    professionalHistory: [
      {
        jobTitle: 'Data Scientist',
        organization: 'TechCorp Japan',
        department: 'AI Research',
        fromMonth: 4,
        fromYear: 2021,
        isPrimary: true,
      },
    ],
    socialProfiles: [{ platform: 'github', username: 'yuki-tanaka-ds' }],
    metInfo: {
      date: '2022-09-15',
      location: 'AI Conference Tokyo',
      context: 'Met during a panel discussion on machine learning',
    },
    circles: ['Work'],
  },
  {
    displayName: 'Robert Klein',
    nameFirst: 'Robert',
    nameLast: 'Klein',
    phones: [{ number: '+49 163 77788899', type: 'mobile', isPrimary: true }],
    emails: [{ address: 'robert.klein@example.de', type: 'personal', isPrimary: true }],
    // Birthday coming up soon
    dates: [{ value: getUpcomingBirthday(14), type: 'birthday', yearKnown: true }],
    interests: 'Running, Cycling, Triathlon',
    circles: ['Sports', 'Friends'],
  },
];

/**
 * Get a birthday date that's N days in the future (for testing upcoming dates widget)
 */
function getUpcomingBirthday(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  // Use a fixed birth year for realism
  const year = 1990;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface SeedContext {
  pool: pg.Pool;
  userExternalId: string;
  circleIds: Map<string, string>; // name -> external_id
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });

  try {
    console.log('Starting seed script...\n');

    // Seed demo user
    const demoUserExternalId = await seedUser(pool, DEMO_USER.email, DEMO_USER.password);
    console.log(`✓ Demo user: ${DEMO_USER.email}`);

    // Seed test user
    await seedUser(pool, TEST_USER.email, TEST_USER.password);
    console.log(`✓ Test user: ${TEST_USER.email}`);

    // Seed circles for demo user
    const circleIds = await seedCircles(pool, demoUserExternalId);
    console.log(`✓ Created ${circleIds.size} circles`);

    // Seed friends for demo user
    const context: SeedContext = {
      pool,
      userExternalId: demoUserExternalId,
      circleIds,
    };

    let friendCount = 0;
    for (const friend of DEMO_FRIENDS) {
      await seedFriend(context, friend);
      friendCount++;
    }
    console.log(`✓ Created ${friendCount} demo friends`);

    console.log('\n✅ Seed completed successfully!');
    console.log(`\nSeeded accounts:`);
    console.log(`  Demo: ${DEMO_USER.email}`);
    console.log(`  Test: ${TEST_USER.email}`);
    console.log(`  (See seed.ts for credentials)`);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

/**
 * Seed a user (idempotent - skips if exists)
 */
async function seedUser(pool: pg.Pool, email: string, password: string): Promise<string> {
  // Check if user exists
  const existingUser = await pool.query('SELECT external_id FROM auth.users WHERE email = $1', [
    email,
  ]);

  if (existingUser.rows.length > 0) {
    const userExternalId = existingUser.rows[0].external_id;

    // Ensure user has a self-profile (completed onboarding)
    const selfProfile = await pool.query(
      'SELECT self_profile_id FROM auth.users WHERE external_id = $1',
      [userExternalId],
    );

    if (!selfProfile.rows[0].self_profile_id) {
      await createSelfProfile(pool, userExternalId, email.split('@')[0]);
    }

    return userExternalId;
  }

  // Create user
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await pool.query(
    'INSERT INTO auth.users (email, password_hash) VALUES ($1, $2) RETURNING external_id',
    [email, passwordHash],
  );

  const userExternalId = result.rows[0].external_id;

  // Create self-profile (completes onboarding)
  await createSelfProfile(pool, userExternalId, email.split('@')[0]);

  return userExternalId;
}

/**
 * Create a self-profile for a user (completes onboarding)
 */
async function createSelfProfile(
  pool: pg.Pool,
  userExternalId: string,
  displayName: string,
): Promise<void> {
  // Create friend entry for self-profile
  const friendResult = await pool.query(
    `INSERT INTO friends.friends (user_id, display_name)
     SELECT u.id, $2
     FROM auth.users u
     WHERE u.external_id = $1
     RETURNING id, external_id`,
    [userExternalId, `${displayName} (Self)`],
  );

  const friendId = friendResult.rows[0].id;

  // Link as self-profile
  await pool.query(`UPDATE auth.users SET self_profile_id = $2 WHERE external_id = $1`, [
    userExternalId,
    friendId,
  ]);
}

/**
 * Seed circles for a user (idempotent)
 */
async function seedCircles(pool: pg.Pool, userExternalId: string): Promise<Map<string, string>> {
  const circleIds = new Map<string, string>();

  for (let i = 0; i < CIRCLES.length; i++) {
    const circle = CIRCLES[i];

    // Check if circle exists
    const existing = await pool.query(
      `SELECT c.external_id FROM friends.circles c
       JOIN auth.users u ON c.user_id = u.id
       WHERE u.external_id = $1 AND LOWER(c.name) = LOWER($2)`,
      [userExternalId, circle.name],
    );

    if (existing.rows.length > 0) {
      circleIds.set(circle.name, existing.rows[0].external_id);
      continue;
    }

    // Create circle
    const result = await pool.query(
      `INSERT INTO friends.circles (user_id, name, color, sort_order)
       SELECT u.id, $2, $3, $4
       FROM auth.users u
       WHERE u.external_id = $1
       RETURNING external_id`,
      [userExternalId, circle.name, circle.color, i],
    );

    circleIds.set(circle.name, result.rows[0].external_id);
  }

  return circleIds;
}

interface DemoFriend {
  displayName: string;
  namePrefix?: string;
  nameFirst?: string;
  nameMiddle?: string;
  nameLast?: string;
  nameSuffix?: string;
  maidenName?: string;
  nickname?: string;
  phones?: Array<{ number: string; type: string; isPrimary: boolean }>;
  emails?: Array<{ address: string; type: string; isPrimary: boolean }>;
  addresses?: Array<{
    street1?: string;
    street2?: string;
    city?: string;
    stateProvince?: string;
    postalCode?: string;
    country?: string;
    type: string;
    isPrimary: boolean;
  }>;
  urls?: Array<{ url: string; type: string; label?: string }>;
  dates?: Array<{ value: string; type: string; yearKnown?: boolean; label?: string }>;
  professionalHistory?: Array<{
    jobTitle?: string;
    organization?: string;
    department?: string;
    fromMonth: number;
    fromYear: number;
    toMonth?: number;
    toYear?: number;
    isPrimary?: boolean;
  }>;
  socialProfiles?: Array<{ platform: string; profileUrl?: string; username?: string }>;
  metInfo?: { date?: string; location?: string; context?: string };
  interests?: string;
  circles: string[];
  isFavorite?: boolean;
}

/**
 * Seed a friend with all sub-resources (idempotent based on display_name)
 */
async function seedFriend(context: SeedContext, friend: DemoFriend): Promise<void> {
  const { pool, userExternalId, circleIds } = context;

  // Check if friend exists (by display_name for idempotency)
  const existing = await pool.query(
    `SELECT f.id, f.external_id FROM friends.friends f
     JOIN auth.users u ON f.user_id = u.id
     WHERE u.external_id = $1 AND f.display_name = $2 AND f.deleted_at IS NULL`,
    [userExternalId, friend.displayName],
  );

  let friendId: number;

  if (existing.rows.length > 0) {
    friendId = existing.rows[0].id;
  } else {
    // Create friend
    const result = await pool.query(
      `INSERT INTO friends.friends (
        user_id, display_name, nickname, name_prefix, name_first, name_middle,
        name_last, name_suffix, maiden_name, interests, is_favorite
      )
      SELECT u.id, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      FROM auth.users u
      WHERE u.external_id = $1
      RETURNING id, external_id`,
      [
        userExternalId,
        friend.displayName,
        friend.nickname || null,
        friend.namePrefix || null,
        friend.nameFirst || null,
        friend.nameMiddle || null,
        friend.nameLast || null,
        friend.nameSuffix || null,
        friend.maidenName || null,
        friend.interests || null,
        friend.isFavorite || false,
      ],
    );

    friendId = result.rows[0].id;
  }

  // Seed phones
  if (friend.phones) {
    for (const phone of friend.phones) {
      await pool.query(
        `INSERT INTO friends.friend_phones (friend_id, phone_number, phone_type, is_primary)
         SELECT $1, $2::varchar, $3::varchar, $4
         WHERE NOT EXISTS (
           SELECT 1 FROM friends.friend_phones WHERE friend_id = $1 AND phone_number = $2::varchar
         )`,
        [friendId, phone.number, phone.type, phone.isPrimary],
      );
    }
  }

  // Seed emails
  if (friend.emails) {
    for (const email of friend.emails) {
      await pool.query(
        `INSERT INTO friends.friend_emails (friend_id, email_address, email_type, is_primary)
         SELECT $1, $2::varchar, $3::varchar, $4
         WHERE NOT EXISTS (
           SELECT 1 FROM friends.friend_emails WHERE friend_id = $1 AND email_address = $2::varchar
         )`,
        [friendId, email.address, email.type, email.isPrimary],
      );
    }
  }

  // Seed addresses
  if (friend.addresses) {
    for (const addr of friend.addresses) {
      await pool.query(
        `INSERT INTO friends.friend_addresses (
          friend_id, street_line1, street_line2, city, state_province,
          postal_code, country, address_type, is_primary
        )
        SELECT $1, $2::varchar, $3::varchar, $4::varchar, $5::varchar, $6::varchar, $7::varchar, $8::varchar, $9
        WHERE NOT EXISTS (
          SELECT 1 FROM friends.friend_addresses
          WHERE friend_id = $1 AND COALESCE(street_line1, '') = COALESCE($2::varchar, '')
            AND COALESCE(city, '') = COALESCE($4::varchar, '')
        )`,
        [
          friendId,
          addr.street1 || null,
          addr.street2 || null,
          addr.city || null,
          addr.stateProvince || null,
          addr.postalCode || null,
          addr.country || null,
          addr.type,
          addr.isPrimary,
        ],
      );
    }
  }

  // Seed URLs
  if (friend.urls) {
    for (const url of friend.urls) {
      await pool.query(
        `INSERT INTO friends.friend_urls (friend_id, url, url_type, label)
         SELECT $1, $2::varchar, $3::varchar, $4::varchar
         WHERE NOT EXISTS (
           SELECT 1 FROM friends.friend_urls WHERE friend_id = $1 AND url = $2::varchar
         )`,
        [friendId, url.url, url.type, url.label || null],
      );
    }
  }

  // Seed dates (birthdays, anniversaries, etc.)
  if (friend.dates) {
    for (const date of friend.dates) {
      // Handle dates without year (MM-DD format)
      const dateValue = date.value.length === 5 ? `1900-${date.value}` : date.value;
      const yearKnown = date.yearKnown !== false && date.value.length !== 5;

      await pool.query(
        `INSERT INTO friends.friend_dates (friend_id, date_value, year_known, date_type, label)
         SELECT $1, $2::date, $3, $4::varchar, $5::varchar
         WHERE NOT EXISTS (
           SELECT 1 FROM friends.friend_dates
           WHERE friend_id = $1 AND date_type = $4::varchar
             AND (date_type != 'other' OR COALESCE(label, '') = COALESCE($5::varchar, ''))
         )`,
        [friendId, dateValue, yearKnown, date.type, date.label || null],
      );
    }
  }

  // Seed professional history
  if (friend.professionalHistory) {
    for (const job of friend.professionalHistory) {
      await pool.query(
        `INSERT INTO friends.friend_professional_history (
          friend_id, job_title, organization, department, from_month, from_year,
          to_month, to_year, is_primary
        )
        SELECT $1, $2::varchar, $3::varchar, $4::varchar, $5, $6, $7, $8, $9
        WHERE NOT EXISTS (
          SELECT 1 FROM friends.friend_professional_history
          WHERE friend_id = $1 AND COALESCE(organization, '') = COALESCE($3::varchar, '')
            AND from_year = $6 AND from_month = $5
        )`,
        [
          friendId,
          job.jobTitle || null,
          job.organization || null,
          job.department || null,
          job.fromMonth,
          job.fromYear,
          job.toMonth || null,
          job.toYear || null,
          job.isPrimary || false,
        ],
      );
    }
  }

  // Seed social profiles
  if (friend.socialProfiles) {
    for (const profile of friend.socialProfiles) {
      await pool.query(
        `INSERT INTO friends.friend_social_profiles (friend_id, platform, profile_url, username)
         SELECT $1, $2::varchar, $3::varchar, $4::varchar
         WHERE NOT EXISTS (
           SELECT 1 FROM friends.friend_social_profiles
           WHERE friend_id = $1 AND platform = $2::varchar
         )`,
        [friendId, profile.platform, profile.profileUrl || null, profile.username || null],
      );
    }
  }

  // Seed met info
  if (friend.metInfo) {
    await pool.query(
      `INSERT INTO friends.friend_met_info (friend_id, met_date, met_location, met_context)
       SELECT $1, $2::date, $3::varchar, $4::text
       WHERE NOT EXISTS (
         SELECT 1 FROM friends.friend_met_info WHERE friend_id = $1
       )`,
      [
        friendId,
        friend.metInfo.date || null,
        friend.metInfo.location || null,
        friend.metInfo.context || null,
      ],
    );
  }

  // Assign to circles
  for (const circleName of friend.circles) {
    const circleExternalId = circleIds.get(circleName);
    if (!circleExternalId) continue;

    await pool.query(
      `INSERT INTO friends.friend_circles (friend_id, circle_id)
       SELECT $1, c.id
       FROM friends.circles c
       WHERE c.external_id = $2
       AND NOT EXISTS (
         SELECT 1 FROM friends.friend_circles fc
         JOIN friends.circles c2 ON fc.circle_id = c2.id
         WHERE fc.friend_id = $1 AND c2.external_id = $2
       )`,
      [friendId, circleExternalId],
    );
  }
}

main();
