import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn(
    { schema: 'contacts', name: 'contacts' },
    {
      vcard_raw_json: {
        type: 'jsonb',
        comment:
          'Raw vCard data as JSON blob for debugging and feature discovery. ' +
          'Stores complete vCard string (~1-5KB typical) plus parsed properties. ' +
          'Only populated for contacts synced via CardDAV.',
      },
    },
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn({ schema: 'contacts', name: 'contacts' }, 'vcard_raw_json');
}
