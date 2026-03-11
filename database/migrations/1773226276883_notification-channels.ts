import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create system schema if it doesn't exist
  pgm.createSchema('system', { ifNotExists: true });

  // Create notification_channels table for messaging bot configurations
  pgm.createTable(
    { schema: 'system', name: 'notification_channels' },
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
        comment: 'Public UUID for API exposure',
      },
      user_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'auth', name: 'users' },
        onDelete: 'CASCADE',
        comment: 'FK to auth.users',
      },
      platform: {
        type: 'text',
        notNull: true,
        check: "platform IN ('telegram', 'matrix', 'discord')",
        comment: 'Messaging platform type',
      },
      is_enabled: {
        type: 'boolean',
        notNull: true,
        default: true,
        comment: 'Whether this channel is active for notifications',
      },

      // Credentials are stored as plaintext TEXT columns. For a self-hosted app where
      // the DB admin and the app operator are typically the same person, this is an
      // acceptable trade-off. If stronger isolation is needed in the future, consider
      // application-level encryption (e.g. AES-256-GCM with a server-side key).

      // Telegram credentials
      telegram_bot_token: {
        type: 'text',
        comment: 'Telegram bot token from BotFather',
      },
      telegram_chat_id: {
        type: 'text',
        comment: 'Telegram chat ID for message delivery',
      },

      // Matrix credentials
      matrix_homeserver: {
        type: 'text',
        comment: 'Matrix homeserver URL',
      },
      matrix_access_token: {
        type: 'text',
        comment: 'Matrix access token',
      },
      matrix_room_id: {
        type: 'text',
        comment: 'Matrix room ID',
      },

      // Discord credentials
      discord_webhook_url: {
        type: 'text',
        comment: 'Discord webhook URL',
      },

      // Per-channel notification preferences
      lookahead_days: {
        type: 'integer',
        notNull: true,
        default: 7,
        check: 'lookahead_days BETWEEN 1 AND 30',
        comment: 'Number of days to look ahead for upcoming dates',
      },
      notify_time: {
        type: 'time',
        notNull: true,
        default: pgm.func("'08:00:00'::time"),
        comment: 'Time of day (UTC) to send notification',
      },
      last_notified_date: {
        type: 'date',
        comment: 'Last date a notification was sent (idempotency guard)',
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

  // Add table comment
  pgm.sql(
    `COMMENT ON TABLE system.notification_channels IS 'Messaging bot configurations for daily date digest notifications (Telegram, Matrix, Discord)'`,
  );

  // Unique constraint: one row per platform per user
  pgm.addConstraint(
    { schema: 'system', name: 'notification_channels' },
    'uq_notification_channels_user_platform',
    { unique: ['user_id', 'platform'] },
  );

  // Create indexes
  pgm.createIndex({ schema: 'system', name: 'notification_channels' }, 'external_id', {
    name: 'idx_notification_channels_external_id',
  });
  pgm.createIndex({ schema: 'system', name: 'notification_channels' }, 'user_id', {
    name: 'idx_notification_channels_user_id',
  });

  // Partial index for the scheduler: only scan rows that are actually enabled
  pgm.createIndex({ schema: 'system', name: 'notification_channels' }, 'notify_time', {
    name: 'idx_notification_channels_enabled',
    where: 'is_enabled = true',
  });

  // Create updated_at trigger
  pgm.sql(`
    CREATE TRIGGER update_notification_channels_updated_at
      BEFORE UPDATE ON system.notification_channels
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(
    'DROP TRIGGER IF EXISTS update_notification_channels_updated_at ON system.notification_channels',
  );
  pgm.dropTable({ schema: 'system', name: 'notification_channels' }, { cascade: true });
}
