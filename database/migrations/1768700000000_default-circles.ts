import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Default Circles Migration
 *
 * This migration adds default circles for all existing users.
 * Default circles: Family, Friends, Work, Acquaintances
 *
 * These circles provide a sensible starting point for organizing contacts.
 */

// Default circles to create for each user
const DEFAULT_CIRCLES = [
  { name: 'Family', color: '#EF4444', sort_order: 0 }, // red
  { name: 'Friends', color: '#22C55E', sort_order: 1 }, // green
  { name: 'Work', color: '#3B82F6', sort_order: 2 }, // blue
  { name: 'Acquaintances', color: '#6B7280', sort_order: 3 }, // gray
];

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Insert default circles for all existing users using parameterized queries
  // Using pgm.db.query() for proper parameterized query support
  for (const circle of DEFAULT_CIRCLES) {
    await pgm.db.query(
      `INSERT INTO friends.circles (user_id, name, color, sort_order)
       SELECT u.id, $1, $2, $3
       FROM auth.users u
       WHERE NOT EXISTS (
         SELECT 1 FROM friends.circles c
         WHERE c.user_id = u.id AND LOWER(c.name) = LOWER($1)
       )`,
      [circle.name, circle.color, circle.sort_order],
    );
  }
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Remove default circles that were created by this migration
  // Only remove circles that:
  // 1. Have no friends assigned to them (friend_count = 0)
  // 2. Match the default circle names
  const defaultNames = DEFAULT_CIRCLES.map((c) => c.name.toLowerCase());

  await pgm.db.query(
    `DELETE FROM friends.circles
     WHERE LOWER(name) = ANY($1)
     AND NOT EXISTS (
       SELECT 1 FROM friends.friend_circles fc
       WHERE fc.circle_id = friends.circles.id
     )`,
    [defaultNames],
  );
}
