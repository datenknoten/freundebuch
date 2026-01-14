/**
 * Column definitions for the friends table
 */

export type ColumnId =
  | 'avatar'
  | 'displayName'
  | 'circles'
  | 'primaryEmail'
  | 'primaryPhone'
  | 'organization'
  | 'jobTitle'
  | 'department'
  | 'primaryCity'
  | 'primaryCountry'
  | 'birthday'
  | 'nickname'
  | 'isFavorite'
  | 'createdAt'
  | 'updatedAt';

export interface ColumnDefinition {
  id: ColumnId;
  label: string;
  sortable: boolean;
  defaultWidth?: string;
}

export const COLUMN_DEFINITIONS: Record<ColumnId, ColumnDefinition> = {
  avatar: {
    id: 'avatar',
    label: '',
    sortable: false,
    defaultWidth: '56px',
  },
  displayName: {
    id: 'displayName',
    label: 'Name',
    sortable: true,
  },
  circles: {
    id: 'circles',
    label: 'Circles',
    sortable: false,
  },
  primaryEmail: {
    id: 'primaryEmail',
    label: 'Email',
    sortable: false,
  },
  primaryPhone: {
    id: 'primaryPhone',
    label: 'Phone',
    sortable: false,
  },
  organization: {
    id: 'organization',
    label: 'Organization',
    sortable: true,
  },
  jobTitle: {
    id: 'jobTitle',
    label: 'Job Title',
    sortable: true,
  },
  department: {
    id: 'department',
    label: 'Department',
    sortable: true,
  },
  primaryCity: {
    id: 'primaryCity',
    label: 'City',
    sortable: true,
  },
  primaryCountry: {
    id: 'primaryCountry',
    label: 'Country',
    sortable: true,
  },
  birthday: {
    id: 'birthday',
    label: 'Birthday',
    sortable: true,
  },
  nickname: {
    id: 'nickname',
    label: 'Nickname',
    sortable: true,
  },
  isFavorite: {
    id: 'isFavorite',
    label: 'Favorite',
    sortable: true,
    defaultWidth: '80px',
  },
  createdAt: {
    id: 'createdAt',
    label: 'Added',
    sortable: true,
  },
  updatedAt: {
    id: 'updatedAt',
    label: 'Updated',
    sortable: true,
  },
};

export const DEFAULT_COLUMNS: ColumnId[] = [
  'avatar',
  'displayName',
  'circles',
  'primaryEmail',
  'primaryPhone',
];

/** Columns that are always visible and cannot be removed */
export const REQUIRED_COLUMNS: ColumnId[] = ['avatar', 'displayName'];

/** Get ordered column definitions for the given column IDs */
export function getColumnDefinitions(columnIds: ColumnId[]): ColumnDefinition[] {
  return columnIds.map((id) => COLUMN_DEFINITIONS[id]);
}
