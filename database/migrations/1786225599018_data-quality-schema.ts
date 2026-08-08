import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Data-quality suggestions: field provenance, snoozes and index history.
 *
 * Everything lives in its own `data_quality` schema so the whole feature can be
 * removed with a single `DROP SCHEMA data_quality CASCADE`.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createSchema('data_quality', { ifNotExists: true });

  // --------------------------------------------------------------------------
  // field_meta: per (friend, field) provenance
  // --------------------------------------------------------------------------

  pgm.createTable(
    { schema: 'data_quality', name: 'field_meta' },
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
      friend_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'friends', name: 'friends' },
        onDelete: 'CASCADE',
        comment: 'FK to friends.friends',
      },
      field_key: {
        type: 'text',
        notNull: true,
        check: 'length(field_key) > 0',
        comment:
          'Catalog field key. Deliberately unconstrained against a value list: the catalog is versioned in TypeScript (packages/shared/src/data-quality.ts) so adding a field must not require a migration',
      },
      value_fingerprint: {
        type: 'text',
        comment:
          'Normalised fingerprint of the current value. NULL means the field currently holds no value',
      },
      verified_at: {
        type: 'timestamptz',
        comment: 'When the value last actually changed, i.e. was confirmed to be current',
      },
      source: {
        type: 'text',
        check: "source IN ('manual', 'carddav', 'import')",
        comment: 'Which write path last changed the value',
      },
      is_not_applicable: {
        type: 'boolean',
        notNull: true,
        default: false,
        comment: 'User marked this field as never relevant for this friend',
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

  pgm.sql(
    `COMMENT ON TABLE data_quality.field_meta IS 'Provenance for each (friend, catalog field) pair: whether a value exists, when it last changed and who wrote it'`,
  );

  pgm.addConstraint({ schema: 'data_quality', name: 'field_meta' }, 'uq_field_meta_friend_field', {
    unique: ['friend_id', 'field_key'],
  });

  pgm.createIndex({ schema: 'data_quality', name: 'field_meta' }, 'friend_id', {
    name: 'idx_field_meta_friend_id',
  });

  pgm.sql(`
    CREATE TRIGGER update_field_meta_updated_at
      BEFORE UPDATE ON data_quality.field_meta
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
  `);

  // --------------------------------------------------------------------------
  // snoozes: "Später" / "Trifft nicht zu" deferrals
  // --------------------------------------------------------------------------

  pgm.createTable(
    { schema: 'data_quality', name: 'snoozes' },
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
      friend_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'friends', name: 'friends' },
        onDelete: 'CASCADE',
        comment: 'FK to friends.friends',
      },
      field_key: {
        type: 'text',
        comment: 'Catalog field key. NULL snoozes the whole friend',
      },
      snoozed_until: {
        type: 'date',
        notNull: true,
        comment: 'Suggestions stay hidden up to and including this day',
      },
      reason: {
        type: 'text',
        check: "reason IN ('later', 'wont_ask', 'no_source')",
        comment: 'Why the suggestion was deferred',
      },
      later_count: {
        type: 'integer',
        notNull: true,
        default: 0,
        comment: 'Consecutive "Später" presses; the second one escalates the snooze to 90 days',
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

  pgm.sql(
    `COMMENT ON TABLE data_quality.snoozes IS 'Per (friend, field) suggestion deferrals; a NULL field_key hides the whole friend'`,
  );

  // Raw SQL so the index expression matches the later
  // `ON CONFLICT (friend_id, COALESCE(field_key, ''))`.
  pgm.sql(`CREATE UNIQUE INDEX uq_snoozes_friend_field
             ON data_quality.snoozes (friend_id, COALESCE(field_key, ''))`);

  pgm.createIndex({ schema: 'data_quality', name: 'snoozes' }, 'friend_id', {
    name: 'idx_snoozes_friend_id',
  });

  pgm.sql(`
    CREATE TRIGGER update_snoozes_updated_at
      BEFORE UPDATE ON data_quality.snoozes
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
  `);

  // --------------------------------------------------------------------------
  // index_history: nightly DQ index snapshots
  // --------------------------------------------------------------------------

  pgm.createTable(
    { schema: 'data_quality', name: 'index_history' },
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
      snapshot_date: {
        type: 'date',
        notNull: true,
        comment: 'Calendar day the snapshot belongs to',
      },
      index_value: {
        type: 'numeric(5,4)',
        notNull: true,
        check: 'index_value BETWEEN 0 AND 1',
        comment: '1 - weighted gap share across all applicable (friend, field) pairs',
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

  pgm.sql(
    `COMMENT ON TABLE data_quality.index_history IS 'One data-quality index value per user and day, written by the nightly scheduler'`,
  );

  pgm.addConstraint(
    { schema: 'data_quality', name: 'index_history' },
    'uq_index_history_user_date',
    { unique: ['user_id', 'snapshot_date'] },
  );

  pgm.createIndex({ schema: 'data_quality', name: 'index_history' }, ['user_id', 'snapshot_date'], {
    name: 'idx_index_history_user_date',
  });

  pgm.sql(`
    CREATE TRIGGER update_index_history_updated_at
      BEFORE UPDATE ON data_quality.index_history
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
  `);

  // --------------------------------------------------------------------------
  // current_field_state: the single definition of "this field has a value"
  // --------------------------------------------------------------------------

  pgm.sql(`
    CREATE FUNCTION data_quality.current_field_state(p_friend_id integer)
    RETURNS TABLE (field_key text, fingerprint text, source_touched_at timestamptz)
    LANGUAGE sql
    STABLE
    AS $$
      SELECT 'birthday'::text,
             string_agg(
               to_char(d.date_value, 'YYYY-MM-DD') || '|' || d.year_known::text,
               ',' ORDER BY to_char(d.date_value, 'YYYY-MM-DD') || '|' || d.year_known::text
             ),
             max(d.created_at)
        FROM friends.friend_dates d
       WHERE d.friend_id = p_friend_id
         AND d.date_type = 'birthday'

      UNION ALL
      SELECT 'phone_mobile'::text,
             string_agg(lower(trim(p.phone_number)), ',' ORDER BY lower(trim(p.phone_number))),
             max(p.created_at)
        FROM friends.friend_phones p
       WHERE p.friend_id = p_friend_id
         AND p.phone_type = 'mobile'
         AND length(trim(p.phone_number)) > 0

      UNION ALL
      SELECT 'address_postal'::text,
             string_agg(
               lower(trim(a.street_line1)) || '|' || lower(trim(a.postal_code)) || '|' || lower(trim(a.city)),
               ',' ORDER BY lower(trim(a.street_line1)) || '|' || lower(trim(a.postal_code)) || '|' || lower(trim(a.city))
             ),
             max(a.created_at)
        FROM friends.friend_addresses a
       WHERE a.friend_id = p_friend_id
         AND length(trim(coalesce(a.street_line1, ''))) > 0
         AND length(trim(coalesce(a.postal_code, ''))) > 0
         AND length(trim(coalesce(a.city, ''))) > 0

      UNION ALL
      SELECT 'relationship_context'::text,
             max(lower(trim(m.met_context))),
             max(m.updated_at)
        FROM friends.friend_met_info m
       WHERE m.friend_id = p_friend_id
         AND length(trim(coalesce(m.met_context, ''))) > 0

      UNION ALL
      SELECT 'email'::text,
             string_agg(lower(trim(e.email_address)), ',' ORDER BY lower(trim(e.email_address))),
             max(e.created_at)
        FROM friends.friend_emails e
       WHERE e.friend_id = p_friend_id
         AND length(trim(e.email_address)) > 0

      UNION ALL
      SELECT 'family'::text,
             string_agg(
               r.related_friend_id::text || '|' || r.relationship_type_id,
               ',' ORDER BY r.related_friend_id::text || '|' || r.relationship_type_id
             ),
             max(r.created_at)
        FROM friends.friend_relationships r
        JOIN friends.relationship_types rt ON r.relationship_type_id = rt.id
       WHERE r.friend_id = p_friend_id
         AND rt.category = 'family'

      UNION ALL
      SELECT 'social_profile'::text,
             string_agg(
               sp.platform || '|' || lower(trim(coalesce(sp.profile_url, ''))) || '|' || lower(trim(coalesce(sp.username, ''))),
               ',' ORDER BY sp.platform || '|' || lower(trim(coalesce(sp.profile_url, ''))) || '|' || lower(trim(coalesce(sp.username, '')))
             ),
             max(sp.created_at)
        FROM friends.friend_social_profiles sp
       WHERE sp.friend_id = p_friend_id

      UNION ALL
      SELECT 'employer_role'::text,
             string_agg(
               lower(trim(coalesce(ph.job_title, ''))) || '|' || lower(trim(coalesce(ph.organization, ''))),
               ',' ORDER BY lower(trim(coalesce(ph.job_title, ''))) || '|' || lower(trim(coalesce(ph.organization, '')))
             ),
             max(ph.created_at)
        FROM friends.friend_professional_history ph
       WHERE ph.friend_id = p_friend_id
         AND (
           length(trim(coalesce(ph.job_title, ''))) > 0
           OR length(trim(coalesce(ph.organization, ''))) > 0
         )

      UNION ALL
      SELECT 'photo'::text,
             max(lower(trim(f.photo_url))),
             max(f.updated_at)
        FROM friends.friends f
       WHERE f.id = p_friend_id
         AND length(trim(coalesce(f.photo_url, ''))) > 0
    $$
  `);

  pgm.sql(
    `COMMENT ON FUNCTION data_quality.current_field_state(integer) IS 'Normalised value fingerprint per catalog field. A NULL fingerprint means the field currently holds no value. Row order and row churn cannot change a fingerprint'`,
  );

  // --------------------------------------------------------------------------
  // refresh_field_meta: the only writer of verified_at
  // --------------------------------------------------------------------------

  pgm.sql(`
    CREATE FUNCTION data_quality.refresh_field_meta(
      p_friend_id integer,
      p_source text,
      p_use_source_timestamp boolean DEFAULT false
    )
    RETURNS void
    LANGUAGE plpgsql
    AS $$
    BEGIN
      INSERT INTO data_quality.field_meta (friend_id, field_key, value_fingerprint, verified_at, source)
      SELECT p_friend_id, s.field_key, s.fingerprint,
             CASE WHEN p_use_source_timestamp THEN s.source_touched_at ELSE CURRENT_TIMESTAMP END,
             p_source
        FROM data_quality.current_field_state(p_friend_id) s
       WHERE s.fingerprint IS NOT NULL
      ON CONFLICT (friend_id, field_key) DO UPDATE SET
        verified_at = CASE WHEN field_meta.value_fingerprint IS DISTINCT FROM EXCLUDED.value_fingerprint
                           THEN EXCLUDED.verified_at ELSE field_meta.verified_at END,
        source      = CASE WHEN field_meta.value_fingerprint IS DISTINCT FROM EXCLUDED.value_fingerprint
                           THEN EXCLUDED.source      ELSE field_meta.source      END,
        value_fingerprint = EXCLUDED.value_fingerprint,
        updated_at = CURRENT_TIMESTAMP;

      -- A value that disappeared: keep the row (is_not_applicable must survive)
      -- but clear provenance.
      UPDATE data_quality.field_meta m
         SET value_fingerprint = NULL, verified_at = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE m.friend_id = p_friend_id
         AND m.value_fingerprint IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM data_quality.current_field_state(p_friend_id) s
            WHERE s.field_key = m.field_key AND s.fingerprint IS NOT NULL
         );
    END;
    $$
  `);

  pgm.sql(
    `COMMENT ON FUNCTION data_quality.refresh_field_meta(integer, text, boolean) IS 'Recompute provenance for one friend. verified_at only moves when the value fingerprint actually changed, so CardDAV delete-and-reinsert churn is invisible'`,
  );

  // --------------------------------------------------------------------------
  // Backfill. Idempotent by construction: a re-run computes the same
  // fingerprint and therefore leaves verified_at untouched.
  // --------------------------------------------------------------------------

  pgm.sql(`SELECT data_quality.refresh_field_meta(id, 'import', true)
             FROM friends.friends WHERE deleted_at IS NULL`);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP SCHEMA IF EXISTS data_quality CASCADE');
}
