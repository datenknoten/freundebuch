import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Encounters Feature
 *
 * This migration adds:
 * - encounters schema for encounter-related tables
 * - encounters.encounters table for tracking meetings with friends
 * - encounters.encounter_friends junction table for many-to-many relationship
 *
 * Epic: #2 - Encounter Management
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  // ============================================================================
  // Step 1: Create encounters schema
  // ============================================================================
  pgm.createSchema('encounters', { ifNotExists: true });

  // ============================================================================
  // Step 2: Create encounters table
  // ============================================================================
  pgm.createTable(
    { schema: 'encounters', name: 'encounters' },
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
        comment: 'Owner of this encounter',
      },
      title: {
        type: 'text',
        notNull: true,
        comment: 'Title/name of the encounter (e.g., "Coffee at Starbucks", "Birthday Party")',
      },
      encounter_date: {
        type: 'date',
        notNull: true,
        comment: 'Date when the encounter occurred',
      },
      location_text: {
        type: 'text',
        comment: 'Free-text location description',
      },
      location_address_id: {
        type: 'integer',
        references: { schema: 'geodata', name: 'addresses' },
        onDelete: 'SET NULL',
        comment: 'Reference to structured address in geodata schema',
      },
      description: {
        type: 'text',
        comment: 'Additional notes or description of the encounter',
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

  pgm.sql(`COMMENT ON TABLE encounters.encounters IS 'Encounters/meetings with friends'`);

  // Add constraint for non-empty title with reasonable length
  pgm.addConstraint({ schema: 'encounters', name: 'encounters' }, 'encounters_title_not_empty', {
    check: 'LENGTH(TRIM(title)) > 0 AND LENGTH(title) <= 200',
  });

  // Indexes for encounters
  pgm.createIndex({ schema: 'encounters', name: 'encounters' }, 'external_id', {
    name: 'idx_encounters_external_id',
  });
  pgm.createIndex({ schema: 'encounters', name: 'encounters' }, 'user_id', {
    name: 'idx_encounters_user_id',
  });
  pgm.createIndex({ schema: 'encounters', name: 'encounters' }, 'encounter_date', {
    name: 'idx_encounters_date',
  });
  pgm.createIndex({ schema: 'encounters', name: 'encounters' }, 'location_address_id', {
    name: 'idx_encounters_location_address_id',
    where: 'location_address_id IS NOT NULL',
  });
  // Composite index for user_id + date for efficient filtering
  pgm.createIndex({ schema: 'encounters', name: 'encounters' }, ['user_id', 'encounter_date'], {
    name: 'idx_encounters_user_date',
  });

  // Create trigger for encounters updated_at
  pgm.sql(`
    CREATE TRIGGER update_encounters_updated_at
    BEFORE UPDATE ON encounters.encounters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);

  // ============================================================================
  // Step 3: Create encounter_friends junction table
  // ============================================================================
  pgm.createTable(
    { schema: 'encounters', name: 'encounter_friends' },
    {
      id: {
        type: 'serial',
        primaryKey: true,
        comment: 'Internal sequential ID',
      },
      external_id: {
        type: 'uuid',
        notNull: true,
        unique: true,
        default: pgm.func('gen_random_uuid()'),
        comment: 'Public UUID for API exposure',
      },
      encounter_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'encounters', name: 'encounters' },
        onDelete: 'CASCADE',
        comment: 'The encounter this friend was part of',
      },
      friend_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'friends', name: 'friends' },
        onDelete: 'CASCADE',
        comment: 'The friend who was part of this encounter',
      },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
    },
  );

  pgm.sql(
    `COMMENT ON TABLE encounters.encounter_friends IS 'Junction table linking encounters to friends (many-to-many)'`,
  );

  // Unique constraint to prevent duplicate assignments
  pgm.addConstraint(
    { schema: 'encounters', name: 'encounter_friends' },
    'unique_encounter_friend',
    {
      unique: ['encounter_id', 'friend_id'],
    },
  );

  // Indexes for encounter_friends
  pgm.createIndex({ schema: 'encounters', name: 'encounter_friends' }, 'external_id', {
    name: 'idx_encounter_friends_external_id',
  });
  pgm.createIndex({ schema: 'encounters', name: 'encounter_friends' }, 'encounter_id', {
    name: 'idx_encounter_friends_encounter_id',
  });
  pgm.createIndex({ schema: 'encounters', name: 'encounter_friends' }, 'friend_id', {
    name: 'idx_encounter_friends_friend_id',
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // ============================================================================
  // Step 1: Drop encounter_friends junction table
  // ============================================================================
  pgm.dropTable({ schema: 'encounters', name: 'encounter_friends' }, { cascade: true });

  // ============================================================================
  // Step 2: Drop encounters table
  // ============================================================================
  pgm.sql('DROP TRIGGER IF EXISTS update_encounters_updated_at ON encounters.encounters;');
  pgm.dropTable({ schema: 'encounters', name: 'encounters' }, { cascade: true });

  // ============================================================================
  // Step 3: Drop encounters schema
  // ============================================================================
  pgm.dropSchema('encounters', { ifExists: true, cascade: true });
}
