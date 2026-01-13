import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Circles & Organization Feature
 *
 * This migration adds:
 * - friends.circles table for organizing friends into circles
 * - friends.friend_circles junction table for many-to-many relationship
 * - is_favorite, archived_at, archive_reason columns to friends.friends
 *
 * Epic: #6 - Categorization & Organization
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  // ============================================================================
  // Step 1: Create circles table
  // ============================================================================
  pgm.createTable(
    { schema: 'friends', name: 'circles' },
    {
      id: {
        type: 'serial',
        primaryKey: true,
        comment: 'Internal sequential ID (never expose in API)',
      },
      external_id: {
        type: 'uuid',
        notNull: true,
        unique: true,
        default: pgm.func('gen_random_uuid()'),
        comment: 'Public UUID for API exposure (always use this in APIs)',
      },
      user_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'auth', name: 'users' },
        onDelete: 'CASCADE',
        comment: 'Owner of this circle',
      },
      name: {
        type: 'text',
        notNull: true,
        comment: 'Circle name (e.g., "Work", "Family", "Book Club")',
      },
      color: {
        type: 'text',
        comment: 'Hex color code (e.g., "#3B82F6")',
      },
      parent_circle_id: {
        type: 'integer',
        references: { schema: 'friends', name: 'circles' },
        onDelete: 'SET NULL',
        comment: 'Parent circle for hierarchy (nullable for top-level circles)',
      },
      sort_order: {
        type: 'integer',
        notNull: true,
        default: 0,
        comment: 'Custom sort order within parent level',
      },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
      updated_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
    },
  );

  pgm.sql(`COMMENT ON TABLE friends.circles IS 'Circles for organizing friends'`);

  // Add constraint for non-empty name with reasonable length
  pgm.addConstraint({ schema: 'friends', name: 'circles' }, 'circles_name_not_empty', {
    check: 'LENGTH(TRIM(name)) > 0 AND LENGTH(name) <= 100',
  });

  // Add constraint for valid hex color (if provided)
  pgm.addConstraint({ schema: 'friends', name: 'circles' }, 'circles_valid_color', {
    check: "color IS NULL OR color ~* '^#[0-9A-Fa-f]{6}$'",
  });

  // Indexes for circles
  pgm.createIndex({ schema: 'friends', name: 'circles' }, 'external_id', {
    name: 'idx_circles_external_id',
  });
  pgm.createIndex({ schema: 'friends', name: 'circles' }, 'user_id', {
    name: 'idx_circles_user_id',
  });
  pgm.createIndex({ schema: 'friends', name: 'circles' }, 'parent_circle_id', {
    name: 'idx_circles_parent',
  });
  pgm.createIndex({ schema: 'friends', name: 'circles' }, ['user_id', 'sort_order'], {
    name: 'idx_circles_sort_order',
  });

  // Create trigger for circles updated_at
  pgm.sql(`
    CREATE TRIGGER update_circles_updated_at
    BEFORE UPDATE ON friends.circles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);

  // ============================================================================
  // Step 2: Create friend_circles junction table
  // ============================================================================
  pgm.createTable(
    { schema: 'friends', name: 'friend_circles' },
    {
      id: {
        type: 'serial',
        primaryKey: true,
        comment: 'Internal sequential ID',
      },
      friend_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'friends', name: 'friends' },
        onDelete: 'CASCADE',
        comment: 'Friend being assigned to circle',
      },
      circle_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'friends', name: 'circles' },
        onDelete: 'CASCADE',
        comment: 'Circle the friend belongs to',
      },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
    },
  );

  pgm.sql(
    `COMMENT ON TABLE friends.friend_circles IS 'Junction table linking friends to circles (many-to-many)'`,
  );

  // Unique constraint to prevent duplicate assignments
  pgm.addConstraint({ schema: 'friends', name: 'friend_circles' }, 'unique_friend_circle', {
    unique: ['friend_id', 'circle_id'],
  });

  // Indexes for friend_circles
  pgm.createIndex({ schema: 'friends', name: 'friend_circles' }, 'friend_id', {
    name: 'idx_friend_circles_friend_id',
  });
  pgm.createIndex({ schema: 'friends', name: 'friend_circles' }, 'circle_id', {
    name: 'idx_friend_circles_circle_id',
  });

  // ============================================================================
  // Step 3: Add columns to friends table
  // ============================================================================
  pgm.addColumns(
    { schema: 'friends', name: 'friends' },
    {
      is_favorite: {
        type: 'boolean',
        notNull: true,
        default: false,
        comment: 'Whether this friend is marked as a favorite',
      },
      archived_at: {
        type: 'timestamptz',
        comment: 'When this friend was archived (null if not archived)',
      },
      archive_reason: {
        type: 'text',
        comment: 'Optional reason for archiving this friend',
      },
    },
  );

  // Partial indexes for favorites and archived friends
  pgm.createIndex({ schema: 'friends', name: 'friends' }, ['user_id', 'is_favorite'], {
    name: 'idx_friends_favorites',
    where: 'is_favorite = true AND deleted_at IS NULL',
  });

  pgm.createIndex({ schema: 'friends', name: 'friends' }, ['user_id', 'archived_at'], {
    name: 'idx_friends_archived',
    where: 'archived_at IS NOT NULL AND deleted_at IS NULL',
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // ============================================================================
  // Step 1: Remove columns from friends table
  // ============================================================================
  pgm.dropIndex({ schema: 'friends', name: 'friends' }, ['user_id', 'archived_at'], {
    name: 'idx_friends_archived',
  });
  pgm.dropIndex({ schema: 'friends', name: 'friends' }, ['user_id', 'is_favorite'], {
    name: 'idx_friends_favorites',
  });

  pgm.dropColumns({ schema: 'friends', name: 'friends' }, [
    'is_favorite',
    'archived_at',
    'archive_reason',
  ]);

  // ============================================================================
  // Step 2: Drop friend_circles junction table
  // ============================================================================
  pgm.dropTable({ schema: 'friends', name: 'friend_circles' }, { cascade: true });

  // ============================================================================
  // Step 3: Drop circles table
  // ============================================================================
  pgm.sql('DROP TRIGGER IF EXISTS update_circles_updated_at ON friends.circles;');
  pgm.dropTable({ schema: 'friends', name: 'circles' }, { cascade: true });
}
