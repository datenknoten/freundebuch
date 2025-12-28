import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Epic 1D: Contact Relationships
 *
 * Adds:
 * - relationship_types reference table with predefined types
 * - contact_relationships junction table for bidirectional relationships
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  // ============================================================================
  // Create relationship_types reference table
  // ============================================================================
  pgm.createTable(
    { schema: 'contacts', name: 'relationship_types' },
    {
      id: {
        type: 'text',
        primaryKey: true,
        comment: 'Relationship type identifier (e.g., spouse, parent, child)',
      },
      category: {
        type: 'text',
        notNull: true,
        comment: 'Category: family, professional, or social',
      },
      label: {
        type: 'text',
        notNull: true,
        comment: 'Human-readable label for display',
      },
      inverse_type_id: {
        type: 'text',
        comment: 'The inverse relationship type (e.g., parent <-> child)',
      },
    },
  );

  pgm.sql(
    `COMMENT ON TABLE contacts.relationship_types IS 'Reference table for relationship type definitions'`,
  );

  pgm.addConstraint({ schema: 'contacts', name: 'relationship_types' }, 'valid_category', {
    check: "category IN ('family', 'professional', 'social')",
  });

  // Add foreign key for inverse_type_id (self-referencing)
  pgm.addConstraint({ schema: 'contacts', name: 'relationship_types' }, 'fk_inverse_type', {
    foreignKeys: {
      columns: 'inverse_type_id',
      references: { schema: 'contacts', name: 'relationship_types' },
      onDelete: 'SET NULL',
    },
  });

  // ============================================================================
  // Seed relationship types
  // ============================================================================
  pgm.sql(`
    INSERT INTO contacts.relationship_types (id, category, label, inverse_type_id) VALUES
      -- Family relationships
      ('spouse', 'family', 'Spouse/Partner', 'spouse'),
      ('parent', 'family', 'Parent', 'child'),
      ('child', 'family', 'Child', 'parent'),
      ('sibling', 'family', 'Sibling', 'sibling'),
      ('grandparent', 'family', 'Grandparent', 'grandchild'),
      ('grandchild', 'family', 'Grandchild', 'grandparent'),
      ('cousin', 'family', 'Cousin', 'cousin'),
      ('in_law', 'family', 'In-law', 'in_law'),
      ('other_family', 'family', 'Other Family', 'other_family'),
      -- Professional relationships
      ('colleague', 'professional', 'Colleague', 'colleague'),
      ('manager', 'professional', 'Manager', 'report'),
      ('report', 'professional', 'Direct Report', 'manager'),
      ('mentor', 'professional', 'Mentor', 'mentee'),
      ('mentee', 'professional', 'Mentee', 'mentor'),
      ('client', 'professional', 'Client', 'client'),
      ('other_professional', 'professional', 'Other Professional', 'other_professional'),
      -- Social relationships
      ('friend', 'social', 'Friend', 'friend'),
      ('neighbor', 'social', 'Neighbor', 'neighbor'),
      ('acquaintance', 'social', 'Acquaintance', 'acquaintance'),
      ('other_social', 'social', 'Other', 'other_social');
  `);

  // ============================================================================
  // Create contact_relationships junction table
  // ============================================================================
  pgm.createTable(
    { schema: 'contacts', name: 'contact_relationships' },
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
      contact_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'contacts', name: 'contacts' },
        onDelete: 'CASCADE',
        comment: 'The source contact',
      },
      related_contact_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'contacts', name: 'contacts' },
        onDelete: 'CASCADE',
        comment: 'The related contact',
      },
      relationship_type_id: {
        type: 'text',
        notNull: true,
        references: { schema: 'contacts', name: 'relationship_types' },
        onDelete: 'RESTRICT',
        comment: 'Type of relationship',
      },
      notes: {
        type: 'text',
        comment: 'Optional notes about the relationship',
      },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
    },
  );

  pgm.sql(
    `COMMENT ON TABLE contacts.contact_relationships IS 'Relationships between contacts (bidirectional)'`,
  );

  // Prevent duplicate relationships (same contact pair with same type)
  pgm.addConstraint({ schema: 'contacts', name: 'contact_relationships' }, 'unique_relationship', {
    unique: ['contact_id', 'related_contact_id', 'relationship_type_id'],
  });

  // Prevent self-relationships
  pgm.addConstraint({ schema: 'contacts', name: 'contact_relationships' }, 'no_self_relationship', {
    check: 'contact_id != related_contact_id',
  });

  // Create indexes
  pgm.createIndex({ schema: 'contacts', name: 'contact_relationships' }, 'external_id', {
    name: 'idx_contact_relationships_external_id',
    unique: true,
  });
  pgm.createIndex({ schema: 'contacts', name: 'contact_relationships' }, 'contact_id', {
    name: 'idx_contact_relationships_contact_id',
  });
  pgm.createIndex({ schema: 'contacts', name: 'contact_relationships' }, 'related_contact_id', {
    name: 'idx_contact_relationships_related_id',
  });
  pgm.createIndex(
    { schema: 'contacts', name: 'contact_relationships' },
    ['contact_id', 'relationship_type_id'],
    {
      name: 'idx_contact_relationships_contact_type',
    },
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop tables in reverse order (relationships first due to foreign key)
  pgm.dropTable({ schema: 'contacts', name: 'contact_relationships' }, { cascade: true });
  pgm.dropTable({ schema: 'contacts', name: 'relationship_types' }, { cascade: true });
}
