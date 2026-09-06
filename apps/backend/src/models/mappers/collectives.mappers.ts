import type { CollectiveMember, CollectiveRole } from '@freundebuch/shared/index.js';
import { formatDateOnly } from '../../utils/date.js';

/**
 * Structural row shapes rather than a single PgTyped result type: several
 * queries select these columns (membership by id, members by collective) and
 * they are not the same generated interface, but the projection is identical.
 * Keeping one mapper per DTO is what stops the copies from drifting.
 */
export interface MemberRow {
  membership_external_id: string;
  contact_external_id: string;
  display_name: string | null;
  photo_url: string | null;
  role_external_id: string;
  role_key: string;
  role_label: string;
  role_sort_order: number;
  is_active: boolean;
  inactive_reason: string | null;
  inactive_date: Date | null;
  joined_date: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface RoleRow {
  external_id: string;
  role_key: string;
  label: string;
  sort_order: number;
}

export function mapMember(row: MemberRow): CollectiveMember {
  return {
    id: row.membership_external_id,
    contact: {
      id: row.contact_external_id,
      displayName: row.display_name ?? 'Unknown',
      photoUrl: row.photo_url,
    },
    role: {
      id: row.role_external_id,
      roleKey: row.role_key,
      label: row.role_label,
      sortOrder: row.role_sort_order,
    },
    isActive: row.is_active,
    inactiveReason: row.inactive_reason,
    inactiveDate: row.inactive_date ? formatDateOnly(row.inactive_date) : null,
    joinedDate: row.joined_date ? formatDateOnly(row.joined_date) : null,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function mapRole(row: RoleRow): CollectiveRole {
  return {
    id: row.external_id,
    roleKey: row.role_key,
    label: row.label,
    sortOrder: row.sort_order,
  };
}
