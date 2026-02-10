import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Epic 12: Collectives Feature
 *
 * This migration adds:
 * - collectives schema for collective-related tables
 * - collectives.collective_types reference table (family, company, club, friend_group)
 * - collectives.collective_roles table with roles per type
 * - collectives.collective_relationship_rules table for auto-relationship rules
 * - collectives.collectives table for collective instances
 * - collectives.collective_memberships junction table
 * - source_membership_id column to friends.friend_relationships
 *
 * Collectives group contacts together (families, companies, clubs) with
 * automatic relationship creation based on roles.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  // ============================================================================
  // Step 1: Create collectives schema
  // ============================================================================
  pgm.createSchema('collectives', { ifNotExists: true });

  // ============================================================================
  // Step 2: Create collective_types reference table
  // ============================================================================
  pgm.createTable(
    { schema: 'collectives', name: 'collective_types' },
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
        references: { schema: 'auth', name: 'users' },
        onDelete: 'CASCADE',
        comment: 'NULL for system defaults, user_id for custom types',
      },
      name: {
        type: 'text',
        notNull: true,
        comment: 'Type name (e.g., Family, Company, Club)',
      },
      description: {
        type: 'text',
        comment: 'Description of the collective type',
      },
      is_system_default: {
        type: 'boolean',
        notNull: true,
        default: false,
        comment: 'True for system-provided types, false for user-created',
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
    `COMMENT ON TABLE collectives.collective_types IS 'Reference table for collective type definitions (family, company, club, friend_group)'`,
  );

  // Unique constraint on (user_id, name) - allows same name across different users
  pgm.addConstraint(
    { schema: 'collectives', name: 'collective_types' },
    'unique_collective_type_name_per_user',
    {
      unique: [['user_id', 'name']],
    },
  );

  pgm.createIndex({ schema: 'collectives', name: 'collective_types' }, 'external_id', {
    name: 'idx_collective_types_external_id',
    unique: true,
  });

  pgm.createIndex({ schema: 'collectives', name: 'collective_types' }, 'user_id', {
    name: 'idx_collective_types_user_id',
    where: 'user_id IS NOT NULL',
  });

  // Trigger for updated_at
  pgm.sql(`
    CREATE TRIGGER update_collective_types_updated_at
    BEFORE UPDATE ON collectives.collective_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);

  // ============================================================================
  // Step 3: Create collective_roles table
  // ============================================================================
  pgm.createTable(
    { schema: 'collectives', name: 'collective_roles' },
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
      collective_type_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'collectives', name: 'collective_types' },
        onDelete: 'CASCADE',
        comment: 'The collective type this role belongs to',
      },
      role_key: {
        type: 'text',
        notNull: true,
        comment: 'Role identifier (e.g., parent, child, employee)',
      },
      label: {
        type: 'text',
        notNull: true,
        comment: 'Human-readable label for display',
      },
      sort_order: {
        type: 'integer',
        notNull: true,
        default: 0,
        comment: 'Display order within the type',
      },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
    },
  );

  pgm.sql(
    `COMMENT ON TABLE collectives.collective_roles IS 'Roles available for each collective type'`,
  );

  // Unique constraint on role_key per type
  pgm.addConstraint({ schema: 'collectives', name: 'collective_roles' }, 'unique_role_per_type', {
    unique: [['collective_type_id', 'role_key']],
  });

  pgm.createIndex({ schema: 'collectives', name: 'collective_roles' }, 'external_id', {
    name: 'idx_collective_roles_external_id',
    unique: true,
  });

  pgm.createIndex({ schema: 'collectives', name: 'collective_roles' }, 'collective_type_id', {
    name: 'idx_collective_roles_type_id',
  });

  // ============================================================================
  // Step 4: Create collective_relationship_rules table
  // ============================================================================
  pgm.createTable(
    { schema: 'collectives', name: 'collective_relationship_rules' },
    {
      id: {
        type: 'serial',
        primaryKey: true,
        comment: 'Internal sequential ID',
      },
      collective_type_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'collectives', name: 'collective_types' },
        onDelete: 'CASCADE',
        comment: 'The collective type this rule applies to',
      },
      new_member_role_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'collectives', name: 'collective_roles' },
        onDelete: 'CASCADE',
        comment: 'When a member with this role is added...',
      },
      existing_member_role_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'collectives', name: 'collective_roles' },
        onDelete: 'CASCADE',
        comment: '...and there is an existing member with this role...',
      },
      relationship_type_id: {
        type: 'text',
        notNull: true,
        references: { schema: 'friends', name: 'relationship_types' },
        onDelete: 'RESTRICT',
        comment: '...create this relationship type',
      },
      relationship_direction: {
        type: 'text',
        notNull: true,
        default: 'new_member',
        comment:
          'Direction: new_member (new is from), existing_member (existing is from), both (bidirectional)',
      },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
    },
  );

  pgm.sql(
    `COMMENT ON TABLE collectives.collective_relationship_rules IS 'Rules for automatic relationship creation when adding members to collectives'`,
  );

  // Check constraint for relationship_direction
  pgm.addConstraint(
    { schema: 'collectives', name: 'collective_relationship_rules' },
    'valid_relationship_direction',
    {
      check: "relationship_direction IN ('new_member', 'existing_member', 'both')",
    },
  );

  // Unique constraint on rule combination
  pgm.addConstraint(
    { schema: 'collectives', name: 'collective_relationship_rules' },
    'unique_rule',
    {
      unique: [['collective_type_id', 'new_member_role_id', 'existing_member_role_id']],
    },
  );

  pgm.createIndex(
    { schema: 'collectives', name: 'collective_relationship_rules' },
    'collective_type_id',
    {
      name: 'idx_collective_relationship_rules_type_id',
    },
  );

  // ============================================================================
  // Step 5: Create collectives table
  // ============================================================================
  pgm.createTable(
    { schema: 'collectives', name: 'collectives' },
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
        comment: 'Owner of this collective',
      },
      collective_type_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'collectives', name: 'collective_types' },
        onDelete: 'RESTRICT',
        comment: 'Type of collective (family, company, etc.)',
      },
      name: {
        type: 'text',
        notNull: true,
        comment: 'Name of the collective (e.g., "The Smith Family", "Acme Corp")',
      },
      photo_url: {
        type: 'text',
        comment: 'URL to collective photo',
      },
      photo_thumbnail_url: {
        type: 'text',
        comment: 'URL to collective photo thumbnail',
      },
      notes: {
        type: 'text',
        comment: 'Additional notes about the collective',
      },
      address_street_line1: {
        type: 'text',
        comment: 'Address line 1 (optional)',
      },
      address_street_line2: {
        type: 'text',
        comment: 'Address line 2 (optional)',
      },
      address_city: {
        type: 'text',
        comment: 'City (optional)',
      },
      address_state_province: {
        type: 'text',
        comment: 'State or province (optional)',
      },
      address_postal_code: {
        type: 'text',
        comment: 'Postal code (optional)',
      },
      address_country: {
        type: 'text',
        comment: 'Country (optional)',
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
      deleted_at: {
        type: 'timestamptz',
        comment: 'Soft delete timestamp - when set, collective is considered deleted',
      },
    },
  );

  pgm.sql(
    `COMMENT ON TABLE collectives.collectives IS 'Collective instances (families, companies, clubs, etc.)'`,
  );

  // Constraint for non-empty name
  pgm.addConstraint({ schema: 'collectives', name: 'collectives' }, 'collectives_name_not_empty', {
    check: 'LENGTH(TRIM(name)) > 0',
  });

  // Indexes
  pgm.createIndex({ schema: 'collectives', name: 'collectives' }, 'external_id', {
    name: 'idx_collectives_external_id',
    unique: true,
  });

  pgm.createIndex({ schema: 'collectives', name: 'collectives' }, 'user_id', {
    name: 'idx_collectives_user_id',
  });

  pgm.createIndex({ schema: 'collectives', name: 'collectives' }, 'collective_type_id', {
    name: 'idx_collectives_type_id',
  });

  // Partial index for active (non-deleted) collectives
  pgm.createIndex({ schema: 'collectives', name: 'collectives' }, 'user_id', {
    name: 'idx_collectives_active',
    where: 'deleted_at IS NULL',
  });

  // Trigger for updated_at
  pgm.sql(`
    CREATE TRIGGER update_collectives_updated_at
    BEFORE UPDATE ON collectives.collectives
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);

  // ============================================================================
  // Step 6: Create collective_memberships junction table
  // ============================================================================
  pgm.createTable(
    { schema: 'collectives', name: 'collective_memberships' },
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
      collective_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'collectives', name: 'collectives' },
        onDelete: 'CASCADE',
        comment: 'The collective this membership belongs to',
      },
      contact_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'friends', name: 'friends' },
        onDelete: 'CASCADE',
        comment: 'The contact who is a member',
      },
      role_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'collectives', name: 'collective_roles' },
        onDelete: 'RESTRICT',
        comment: 'The role of the member in this collective',
      },
      is_active: {
        type: 'boolean',
        notNull: true,
        default: true,
        comment: 'Whether this membership is currently active',
      },
      inactive_reason: {
        type: 'text',
        comment: 'Reason for deactivation (if inactive)',
      },
      inactive_date: {
        type: 'date',
        comment: 'Date when membership became inactive',
      },
      joined_date: {
        type: 'date',
        comment: 'Date when member joined the collective',
      },
      notes: {
        type: 'text',
        comment: 'Notes about this membership',
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
    `COMMENT ON TABLE collectives.collective_memberships IS 'Junction table linking contacts to collectives with roles'`,
  );

  // Unique constraint: one active membership per contact per collective
  pgm.sql(`
    CREATE UNIQUE INDEX idx_unique_active_membership
    ON collectives.collective_memberships (collective_id, contact_id)
    WHERE is_active = TRUE;
  `);

  pgm.createIndex({ schema: 'collectives', name: 'collective_memberships' }, 'external_id', {
    name: 'idx_collective_memberships_external_id',
    unique: true,
  });

  pgm.createIndex({ schema: 'collectives', name: 'collective_memberships' }, 'collective_id', {
    name: 'idx_collective_memberships_collective_id',
  });

  pgm.createIndex({ schema: 'collectives', name: 'collective_memberships' }, 'contact_id', {
    name: 'idx_collective_memberships_contact_id',
  });

  // Partial index for active memberships
  pgm.createIndex(
    { schema: 'collectives', name: 'collective_memberships' },
    ['collective_id', 'is_active'],
    {
      name: 'idx_collective_memberships_active',
      where: 'is_active = TRUE',
    },
  );

  // Trigger for updated_at
  pgm.sql(`
    CREATE TRIGGER update_collective_memberships_updated_at
    BEFORE UPDATE ON collectives.collective_memberships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);

  // ============================================================================
  // Step 7: Add source_membership_id to contact_relationships
  // ============================================================================
  pgm.addColumn(
    { schema: 'friends', name: 'friend_relationships' },
    {
      source_membership_id: {
        type: 'integer',
        references: { schema: 'collectives', name: 'collective_memberships' },
        onDelete: 'SET NULL',
        comment: 'If set, this relationship was auto-created from a collective membership',
      },
    },
  );

  pgm.createIndex({ schema: 'friends', name: 'friend_relationships' }, 'source_membership_id', {
    name: 'idx_contact_relationships_source_membership',
    where: 'source_membership_id IS NOT NULL',
  });

  // ============================================================================
  // Step 8: Seed default collective types with roles and rules
  // ============================================================================

  // Insert default collective types
  pgm.sql(`
    INSERT INTO collectives.collective_types (name, description, is_system_default) VALUES
      ('Family', 'A family unit with parents, children, and extended family', TRUE),
      ('Company', 'A business organization with employees and management', TRUE),
      ('Club', 'A club, organization, or group like a sports club or hackerspace', TRUE),
      ('Friend Group', 'A social circle of friends', TRUE);
  `);

  // Insert roles for Family
  pgm.sql(`
    INSERT INTO collectives.collective_roles (collective_type_id, role_key, label, sort_order)
    SELECT ct.id, r.role_key, r.label, r.sort_order
    FROM collectives.collective_types ct
    CROSS JOIN (VALUES
      ('parent', 'Parent', 1),
      ('child', 'Child', 2),
      ('spouse', 'Spouse/Partner', 3),
      ('grandparent', 'Grandparent', 4),
      ('grandchild', 'Grandchild', 5)
    ) AS r(role_key, label, sort_order)
    WHERE ct.name = 'Family';
  `);

  // Insert roles for Company
  pgm.sql(`
    INSERT INTO collectives.collective_roles (collective_type_id, role_key, label, sort_order)
    SELECT ct.id, r.role_key, r.label, r.sort_order
    FROM collectives.collective_types ct
    CROSS JOIN (VALUES
      ('owner', 'Owner/Founder', 1),
      ('manager', 'Manager', 2),
      ('employee', 'Employee', 3)
    ) AS r(role_key, label, sort_order)
    WHERE ct.name = 'Company';
  `);

  // Insert roles for Club
  pgm.sql(`
    INSERT INTO collectives.collective_roles (collective_type_id, role_key, label, sort_order)
    SELECT ct.id, r.role_key, r.label, r.sort_order
    FROM collectives.collective_types ct
    CROSS JOIN (VALUES
      ('member', 'Member', 1)
    ) AS r(role_key, label, sort_order)
    WHERE ct.name = 'Club';
  `);

  // Insert roles for Friend Group
  pgm.sql(`
    INSERT INTO collectives.collective_roles (collective_type_id, role_key, label, sort_order)
    SELECT ct.id, r.role_key, r.label, r.sort_order
    FROM collectives.collective_types ct
    CROSS JOIN (VALUES
      ('member', 'Member', 1)
    ) AS r(role_key, label, sort_order)
    WHERE ct.name = 'Friend Group';
  `);

  // Insert relationship rules for Family
  // DEPENDENCY: friends.relationship_types must already contain these IDs:
  //   parent, child, sibling, grandparent, grandchild, spouse (seeded in 1767005280000_contact-relationships)
  //   colleague, manager, friend (seeded in 1767005280000_contact-relationships)
  pgm.sql(`
    INSERT INTO collectives.collective_relationship_rules (collective_type_id, new_member_role_id, existing_member_role_id, relationship_type_id, relationship_direction)
    SELECT
      ct.id,
      nr.id,
      er.id,
      rules.relationship_type_id,
      rules.direction
    FROM collectives.collective_types ct
    CROSS JOIN (VALUES
      -- child + parent = parent -> child (existing parent is "from", new child is "to")
      ('child', 'parent', 'parent', 'existing_member'),
      -- child + child = sibling <-> sibling (bidirectional)
      ('child', 'child', 'sibling', 'both'),
      -- child + grandparent = grandparent -> grandchild
      ('child', 'grandparent', 'grandparent', 'existing_member'),
      -- parent + child = parent -> child (new parent is "from", existing child is "to")
      ('parent', 'child', 'parent', 'new_member'),
      -- parent + grandparent = grandparent -> parent (existing grandparent is "from")
      ('parent', 'grandparent', 'parent', 'existing_member'),
      -- spouse + spouse = spouse <-> spouse (bidirectional)
      ('spouse', 'spouse', 'spouse', 'both'),
      -- grandparent + child = grandparent -> grandchild
      ('grandparent', 'child', 'grandparent', 'new_member'),
      -- grandparent + grandchild = grandparent -> grandchild
      ('grandparent', 'grandchild', 'grandparent', 'new_member'),
      -- grandchild + grandparent = grandparent -> grandchild
      ('grandchild', 'grandparent', 'grandparent', 'existing_member')
    ) AS rules(new_role, existing_role, relationship_type_id, direction)
    JOIN collectives.collective_roles nr ON nr.collective_type_id = ct.id AND nr.role_key = rules.new_role
    JOIN collectives.collective_roles er ON er.collective_type_id = ct.id AND er.role_key = rules.existing_role
    WHERE ct.name = 'Family';
  `);

  // Insert relationship rules for Company
  pgm.sql(`
    INSERT INTO collectives.collective_relationship_rules (collective_type_id, new_member_role_id, existing_member_role_id, relationship_type_id, relationship_direction)
    SELECT
      ct.id,
      nr.id,
      er.id,
      rules.relationship_type_id,
      rules.direction
    FROM collectives.collective_types ct
    CROSS JOIN (VALUES
      -- employee + employee = colleague <-> colleague (bidirectional)
      ('employee', 'employee', 'colleague', 'both'),
      -- employee + manager = manager -> report (existing manager is "from")
      ('employee', 'manager', 'manager', 'existing_member'),
      -- manager + employee = manager -> report (new manager is "from")
      ('manager', 'employee', 'manager', 'new_member'),
      -- manager + manager = colleague <-> colleague (bidirectional)
      ('manager', 'manager', 'colleague', 'both')
    ) AS rules(new_role, existing_role, relationship_type_id, direction)
    JOIN collectives.collective_roles nr ON nr.collective_type_id = ct.id AND nr.role_key = rules.new_role
    JOIN collectives.collective_roles er ON er.collective_type_id = ct.id AND er.role_key = rules.existing_role
    WHERE ct.name = 'Company';
  `);

  // Insert relationship rules for Club
  pgm.sql(`
    INSERT INTO collectives.collective_relationship_rules (collective_type_id, new_member_role_id, existing_member_role_id, relationship_type_id, relationship_direction)
    SELECT
      ct.id,
      nr.id,
      er.id,
      'friend',
      'both'
    FROM collectives.collective_types ct
    JOIN collectives.collective_roles nr ON nr.collective_type_id = ct.id AND nr.role_key = 'member'
    JOIN collectives.collective_roles er ON er.collective_type_id = ct.id AND er.role_key = 'member'
    WHERE ct.name = 'Club';
  `);

  // Insert relationship rules for Friend Group
  pgm.sql(`
    INSERT INTO collectives.collective_relationship_rules (collective_type_id, new_member_role_id, existing_member_role_id, relationship_type_id, relationship_direction)
    SELECT
      ct.id,
      nr.id,
      er.id,
      'friend',
      'both'
    FROM collectives.collective_types ct
    JOIN collectives.collective_roles nr ON nr.collective_type_id = ct.id AND nr.role_key = 'member'
    JOIN collectives.collective_roles er ON er.collective_type_id = ct.id AND er.role_key = 'member'
    WHERE ct.name = 'Friend Group';
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // ============================================================================
  // Step 1: Remove source_membership_id from contact_relationships
  // ============================================================================
  pgm.dropIndex({ schema: 'friends', name: 'friend_relationships' }, 'source_membership_id', {
    name: 'idx_contact_relationships_source_membership',
  });
  pgm.dropColumn({ schema: 'friends', name: 'friend_relationships' }, 'source_membership_id');

  // ============================================================================
  // Step 2: Drop collective_memberships
  // ============================================================================
  pgm.sql(
    'DROP TRIGGER IF EXISTS update_collective_memberships_updated_at ON collectives.collective_memberships;',
  );
  pgm.dropTable({ schema: 'collectives', name: 'collective_memberships' }, { cascade: true });

  // ============================================================================
  // Step 3: Drop collectives
  // ============================================================================
  pgm.sql('DROP TRIGGER IF EXISTS update_collectives_updated_at ON collectives.collectives;');
  pgm.dropTable({ schema: 'collectives', name: 'collectives' }, { cascade: true });

  // ============================================================================
  // Step 4: Drop collective_relationship_rules
  // ============================================================================
  pgm.dropTable(
    { schema: 'collectives', name: 'collective_relationship_rules' },
    { cascade: true },
  );

  // ============================================================================
  // Step 5: Drop collective_roles
  // ============================================================================
  pgm.dropTable({ schema: 'collectives', name: 'collective_roles' }, { cascade: true });

  // ============================================================================
  // Step 6: Drop collective_types
  // ============================================================================
  pgm.sql(
    'DROP TRIGGER IF EXISTS update_collective_types_updated_at ON collectives.collective_types;',
  );
  pgm.dropTable({ schema: 'collectives', name: 'collective_types' }, { cascade: true });

  // ============================================================================
  // Step 7: Drop collectives schema
  // ============================================================================
  pgm.dropSchema('collectives', { ifExists: true, cascade: true });
}
