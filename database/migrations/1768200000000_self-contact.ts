import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Add self_contact_id to users table
  // This references the user's "self-contact" - the first entry in their friendbook
  pgm.addColumn(
    { schema: 'auth', name: 'users' },
    {
      self_contact_id: {
        type: 'integer',
        references: { schema: 'contacts', name: 'contacts' },
        onDelete: 'SET NULL',
        comment: "Reference to the user's self-contact (first friendbook entry)",
      },
    },
  );

  pgm.createIndex({ schema: 'auth', name: 'users' }, 'self_contact_id', {
    name: 'idx_users_self_contact_id',
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex({ schema: 'auth', name: 'users' }, 'self_contact_id', {
    name: 'idx_users_self_contact_id',
  });
  pgm.dropColumn({ schema: 'auth', name: 'users' }, 'self_contact_id');
}
