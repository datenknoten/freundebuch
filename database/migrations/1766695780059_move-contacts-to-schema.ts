import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create the contacts schema
  pgm.createSchema('contacts', { ifNotExists: true });

  // Move tables from public to contacts schema
  // Order matters: move parent table first, then children
  pgm.sql('ALTER TABLE public.contacts SET SCHEMA contacts;');
  pgm.sql('ALTER TABLE public.contact_phones SET SCHEMA contacts;');
  pgm.sql('ALTER TABLE public.contact_emails SET SCHEMA contacts;');
  pgm.sql('ALTER TABLE public.contact_addresses SET SCHEMA contacts;');
  pgm.sql('ALTER TABLE public.contact_urls SET SCHEMA contacts;');

  // Move the trigger function reference (the trigger itself moves with the table)
  // The update_updated_at_column function stays in public since it's shared
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Move tables back to public schema
  // Order: move children first, then parent
  pgm.sql('ALTER TABLE contacts.contact_urls SET SCHEMA public;');
  pgm.sql('ALTER TABLE contacts.contact_addresses SET SCHEMA public;');
  pgm.sql('ALTER TABLE contacts.contact_emails SET SCHEMA public;');
  pgm.sql('ALTER TABLE contacts.contact_phones SET SCHEMA public;');
  pgm.sql('ALTER TABLE contacts.contacts SET SCHEMA public;');

  // Drop the contacts schema
  pgm.dropSchema('contacts', { ifExists: true });
}
