import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Encounter interaction type
 *
 * Expands encounters to cover non-in-person contact (calls, messages, etc.):
 * - adds encounters.encounters.encounter_type with a CHECK constraint
 *   (existing rows default to 'in_person', so nothing breaks)
 * - relaxes the title to be optional (calls/messages don't need one;
 *   the UI derives a label like "Phone call with Sarah" when title is null)
 *
 * Epic: #2 - Encounter Management
 */

const VALID_TYPES = "encounter_type IN ('in_person', 'phone_call', 'video_call', 'message')";

export async function up(pgm: MigrationBuilder): Promise<void> {
  // ============================================================================
  // Step 1: Add encounter_type discriminator
  // ============================================================================
  pgm.addColumn(
    { schema: 'encounters', name: 'encounters' },
    {
      encounter_type: {
        type: 'text',
        notNull: true,
        default: 'in_person',
        comment: "Kind of contact: 'in_person', 'phone_call', 'video_call' or 'message'",
      },
    },
  );

  pgm.addConstraint(
    { schema: 'encounters', name: 'encounters' },
    'encounters_encounter_type_valid',
    { check: VALID_TYPES },
  );

  // Composite index for filtering a user's encounters by type
  pgm.createIndex({ schema: 'encounters', name: 'encounters' }, ['user_id', 'encounter_type'], {
    name: 'idx_encounters_user_type',
  });

  // ============================================================================
  // Step 2: Make title optional (calls/messages may have no title)
  // ============================================================================
  pgm.alterColumn({ schema: 'encounters', name: 'encounters' }, 'title', { notNull: false });

  // Replace the not-empty check so it allows NULL but still rejects blank/oversized titles
  pgm.dropConstraint({ schema: 'encounters', name: 'encounters' }, 'encounters_title_not_empty');
  pgm.addConstraint({ schema: 'encounters', name: 'encounters' }, 'encounters_title_not_empty', {
    check: 'title IS NULL OR (LENGTH(TRIM(title)) > 0 AND LENGTH(title) <= 200)',
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // ============================================================================
  // Step 1: Restore title NOT NULL (backfill any null titles first)
  // ============================================================================
  pgm.sql(`UPDATE encounters.encounters SET title = 'Untitled' WHERE title IS NULL`);

  pgm.dropConstraint({ schema: 'encounters', name: 'encounters' }, 'encounters_title_not_empty');
  pgm.alterColumn({ schema: 'encounters', name: 'encounters' }, 'title', { notNull: true });
  pgm.addConstraint({ schema: 'encounters', name: 'encounters' }, 'encounters_title_not_empty', {
    check: 'LENGTH(TRIM(title)) > 0 AND LENGTH(title) <= 200',
  });

  // ============================================================================
  // Step 2: Drop encounter_type
  // ============================================================================
  pgm.dropIndex({ schema: 'encounters', name: 'encounters' }, ['user_id', 'encounter_type'], {
    name: 'idx_encounters_user_type',
  });
  pgm.dropConstraint(
    { schema: 'encounters', name: 'encounters' },
    'encounters_encounter_type_valid',
  );
  pgm.dropColumn({ schema: 'encounters', name: 'encounters' }, 'encounter_type');
}
