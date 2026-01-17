import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn(
    { schema: 'friends', name: 'friends' },
    {
      maiden_name: {
        type: 'text',
        comment: 'Maiden name or birth name for the friend',
      },
    },
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn({ schema: 'friends', name: 'friends' }, 'maiden_name');
}
