import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder) {
  pgm.addColumn(
    { schema: 'contacts', name: 'contacts' },
    {
      nickname: {
        type: 'varchar(100)',
        comment: 'Informal name or nickname for the contact',
      },
    },
  );
}

export async function down(pgm: MigrationBuilder) {
  pgm.dropColumn({ schema: 'contacts', name: 'contacts' }, 'nickname');
}
