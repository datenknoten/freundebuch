import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Add user preferences column to auth.users table
 *
 * Stores user preferences as JSONB including:
 * - contactsPageSize: number of contacts per page (10, 25, 50, 100)
 *
 * Default value ensures existing users get sensible defaults.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn(
    { schema: 'auth', name: 'users' },
    {
      preferences: {
        type: 'jsonb',
        notNull: true,
        default: pgm.func(`'{"contactsPageSize": 25}'::jsonb`),
        comment: 'User preferences (page size, etc.)',
      },
    },
  );

  // Add a comment explaining the structure
  pgm.sql(`
    COMMENT ON COLUMN auth.users.preferences IS 
    'User preferences stored as JSONB. Structure: { contactsPageSize?: 10 | 25 | 50 | 100 }';
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn({ schema: 'auth', name: 'users' }, 'preferences');
}
