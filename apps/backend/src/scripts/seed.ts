/**
 * Seed script for demo data
 *
 * Creates a demo user with friends, circles, and encounters for testing purposes.
 *
 * Usage: pnpm seed
 */

import pg from 'pg';
import { hashPassword } from '../utils/auth.js';
import { getConfig } from '../utils/config.js';

const { Pool } = pg;

// Demo user credentials
const DEMO_USER = {
  email: 'demo@freundebuch.app',
  password: 'DemoPassword123!',
  displayName: 'Demo User',
};

// Demo friends to create
const DEMO_FRIENDS = [
  { displayName: 'Anna Müller', nickname: 'Annie' },
  { displayName: 'Max Schneider', nickname: null },
  { displayName: 'Sophie Weber', nickname: 'Soph' },
  { displayName: 'Felix Hoffmann', nickname: null },
  { displayName: 'Laura Fischer', nickname: 'Lau' },
  { displayName: 'Jonas Becker', nickname: null },
  { displayName: 'Mia Wagner', nickname: null },
  { displayName: 'Leon Schmidt', nickname: 'Leo' },
];

// Demo circles to create
const DEMO_CIRCLES = [
  { name: 'Close Friends', color: '#10B981' },
  { name: 'Work Colleagues', color: '#3B82F6' },
  { name: 'University', color: '#8B5CF6' },
];

// Demo encounters to create (with relative dates)
const DEMO_ENCOUNTERS = [
  {
    title: 'Coffee at Starbucks',
    daysAgo: 3,
    locationText: 'Starbucks, Main Street',
    description: 'Had a great catch-up over coffee.',
    friendIndices: [0, 2], // Anna and Sophie
  },
  {
    title: 'Birthday Party',
    daysAgo: 14,
    locationText: "Jonas' place",
    description: "Celebrated Jonas' birthday with a surprise party!",
    friendIndices: [0, 1, 2, 5], // Anna, Max, Sophie, Jonas
  },
  {
    title: 'Team Lunch',
    daysAgo: 7,
    locationText: 'Italian Restaurant downtown',
    description: 'Quarterly team lunch with the work group.',
    friendIndices: [3, 4], // Felix, Laura
  },
  {
    title: 'Hiking Trip',
    daysAgo: 21,
    locationText: 'Black Forest',
    description: 'Amazing hike through the Black Forest. Beautiful weather!',
    friendIndices: [1, 6, 7], // Max, Mia, Leon
  },
  {
    title: 'Movie Night',
    daysAgo: 5,
    locationText: 'Cinema City',
    description: 'Watched the new action movie. Pretty good!',
    friendIndices: [2, 6], // Sophie, Mia
  },
  {
    title: 'Brunch',
    daysAgo: 1,
    locationText: 'Café Sonnenschein',
    description: 'Sunday brunch with the usual crew.',
    friendIndices: [0, 2, 4], // Anna, Sophie, Laura
  },
];

async function seed() {
  const config = getConfig();
  const pool = new Pool({
    connectionString: config.DATABASE_URL,
  });

  console.log('Starting database seeding...\n');

  try {
    // Check if demo user already exists
    const existingUser = await pool.query('SELECT external_id FROM auth.users WHERE email = $1', [
      DEMO_USER.email,
    ]);

    if (existingUser.rows.length > 0) {
      console.log(`Demo user (${DEMO_USER.email}) already exists. Skipping seed.`);
      console.log('\nTo reseed, delete the demo user first:');
      console.log(`  DELETE FROM auth.users WHERE email = '${DEMO_USER.email}';`);
      return;
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Create demo user
      console.log('Creating demo user...');
      const passwordHash = await hashPassword(DEMO_USER.password);
      const userResult = await client.query(
        `INSERT INTO auth.users (email, password_hash)
         VALUES ($1, $2)
         RETURNING id, external_id`,
        [DEMO_USER.email, passwordHash],
      );
      const userId = userResult.rows[0].id;
      const userExternalId = userResult.rows[0].external_id;
      console.log(`  Created user: ${DEMO_USER.email} (${userExternalId})`);

      // 2. Create self-profile for onboarding
      console.log('\nCreating self-profile...');
      const selfProfileResult = await client.query(
        `INSERT INTO friends.friends (user_id, display_name)
         VALUES ($1, $2)
         RETURNING id, external_id`,
        [userId, DEMO_USER.displayName],
      );
      const selfProfileId = selfProfileResult.rows[0].id;

      await client.query('UPDATE auth.users SET self_profile_id = $1 WHERE id = $2', [
        selfProfileId,
        userId,
      ]);
      console.log(`  Created self-profile: ${DEMO_USER.displayName}`);

      // 3. Create demo friends
      console.log('\nCreating demo friends...');
      const friendIds: string[] = [];
      for (const friend of DEMO_FRIENDS) {
        const friendResult = await client.query(
          `INSERT INTO friends.friends (user_id, display_name, nickname)
           VALUES ($1, $2, $3)
           RETURNING external_id`,
          [userId, friend.displayName, friend.nickname],
        );
        friendIds.push(friendResult.rows[0].external_id);
        console.log(`  Created friend: ${friend.displayName}`);
      }

      // 4. Create demo circles
      console.log('\nCreating demo circles...');
      const circleIds: string[] = [];
      for (const circle of DEMO_CIRCLES) {
        const circleResult = await client.query(
          `INSERT INTO friends.circles (user_id, name, color)
           VALUES ($1, $2, $3)
           RETURNING external_id`,
          [userId, circle.name, circle.color],
        );
        circleIds.push(circleResult.rows[0].external_id);
        console.log(`  Created circle: ${circle.name}`);
      }

      // 5. Assign some friends to circles
      console.log('\nAssigning friends to circles...');
      // Close Friends: Anna, Sophie
      await assignFriendToCircle(client, friendIds[0], circleIds[0]);
      await assignFriendToCircle(client, friendIds[2], circleIds[0]);
      console.log('  Added Anna and Sophie to Close Friends');

      // Work Colleagues: Felix, Laura
      await assignFriendToCircle(client, friendIds[3], circleIds[1]);
      await assignFriendToCircle(client, friendIds[4], circleIds[1]);
      console.log('  Added Felix and Laura to Work Colleagues');

      // University: Max, Jonas, Mia, Leon
      await assignFriendToCircle(client, friendIds[1], circleIds[2]);
      await assignFriendToCircle(client, friendIds[5], circleIds[2]);
      await assignFriendToCircle(client, friendIds[6], circleIds[2]);
      await assignFriendToCircle(client, friendIds[7], circleIds[2]);
      console.log('  Added Max, Jonas, Mia, and Leon to University');

      // 6. Create demo encounters
      console.log('\nCreating demo encounters...');
      for (const encounter of DEMO_ENCOUNTERS) {
        const encounterDate = new Date();
        encounterDate.setDate(encounterDate.getDate() - encounter.daysAgo);
        const dateStr = encounterDate.toISOString().split('T')[0];

        const encounterResult = await client.query(
          `INSERT INTO encounters.encounters (user_id, title, encounter_date, location_text, description)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, external_id`,
          [userId, encounter.title, dateStr, encounter.locationText, encounter.description],
        );
        const encounterId = encounterResult.rows[0].id;

        // Add friends to the encounter
        for (const friendIndex of encounter.friendIndices) {
          const friendExternalId = friendIds[friendIndex];
          await client.query(
            `INSERT INTO encounters.encounter_friends (encounter_id, friend_id)
             SELECT $1, f.id
             FROM friends.friends f
             WHERE f.external_id = $2`,
            [encounterId, friendExternalId],
          );
        }

        const friendNames = encounter.friendIndices
          .map((i) => DEMO_FRIENDS[i].displayName)
          .join(', ');
        console.log(`  Created encounter: "${encounter.title}" (${dateStr}) with ${friendNames}`);
      }

      await client.query('COMMIT');

      console.log('\n----------------------------------------');
      console.log('Seeding completed successfully!');
      console.log('----------------------------------------');
      console.log('\nDemo user credentials:');
      console.log(`  Email: ${DEMO_USER.email}`);
      console.log(`  Password: ${DEMO_USER.password}`);
      console.log('\nCreated:');
      console.log(`  - 1 user with self-profile`);
      console.log(`  - ${DEMO_FRIENDS.length} friends`);
      console.log(`  - ${DEMO_CIRCLES.length} circles`);
      console.log(`  - ${DEMO_ENCOUNTERS.length} encounters`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function assignFriendToCircle(
  client: pg.PoolClient,
  friendExternalId: string,
  circleExternalId: string,
) {
  await client.query(
    `INSERT INTO friends.friend_circles (friend_id, circle_id)
     SELECT f.id, c.id
     FROM friends.friends f, friends.circles c
     WHERE f.external_id = $1 AND c.external_id = $2`,
    [friendExternalId, circleExternalId],
  );
}

// Run the seed
seed();
