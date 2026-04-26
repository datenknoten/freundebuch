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
  /** English fallback label. UI should prefer i18n key `friends.columns.<id>` when available. */
  label: string;
  /** i18n key for the column header */
  i18nKey: string;
  sortable: boolean;
  defaultWidth?: string;
}

export const COLUMN_DEFINITIONS: Record<ColumnId, ColumnDefinition> = {
  avatar: {
    id: 'avatar',
    label: '',
    i18nKey: 'friends.columns.avatar',
    sortable: false,
    defaultWidth: '56px',
  },
  displayName: {
    id: 'displayName',
    label: 'Name',
    i18nKey: 'friends.columns.displayName',
    sortable: true,
  },
  circles: {
    id: 'circles',
    label: 'Circles',
    i18nKey: 'friends.columns.circles',
    sortable: false,
  },
  primaryEmail: {
    id: 'primaryEmail',
    label: 'Email',
    i18nKey: 'friends.columns.primaryEmail',
    sortable: false,
  },
  primaryPhone: {
    id: 'primaryPhone',
    label: 'Phone',
    i18nKey: 'friends.columns.primaryPhone',
    sortable: false,
  },
  organization: {
    id: 'organization',
    label: 'Organization',
    i18nKey: 'friends.columns.organization',
    sortable: true,
  },
  jobTitle: {
    id: 'jobTitle',
    label: 'Job Title',
    i18nKey: 'friends.columns.jobTitle',
    sortable: true,
  },
  department: {
    id: 'department',
    label: 'Department',
    i18nKey: 'friends.columns.department',
    sortable: true,
  },
  primaryCity: {
    id: 'primaryCity',
    label: 'City',
    i18nKey: 'friends.columns.primaryCity',
    sortable: true,
  },
  primaryCountry: {
    id: 'primaryCountry',
    label: 'Country',
    i18nKey: 'friends.columns.primaryCountry',
    sortable: true,
  },
  birthday: {
    id: 'birthday',
    label: 'Birthday',
    i18nKey: 'friends.columns.birthday',
    sortable: true,
  },
  nickname: {
    id: 'nickname',
    label: 'Nickname',
    i18nKey: 'friends.columns.nickname',
    sortable: true,
  },
  isFavorite: {
    id: 'isFavorite',
    label: 'Favorite',
    i18nKey: 'friends.columns.isFavorite',
    sortable: true,
    defaultWidth: '80px',
  },
  createdAt: {
    id: 'createdAt',
    label: 'Added',
    i18nKey: 'friends.columns.createdAt',
    sortable: true,
  },
  updatedAt: {
    id: 'updatedAt',
    label: 'Updated',
    i18nKey: 'friends.columns.updatedAt',
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
