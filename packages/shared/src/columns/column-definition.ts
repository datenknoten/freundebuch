export const COLUMN_IDS = [
  'avatar',
  'displayName',
  'circles',
  'primaryEmail',
  'primaryPhone',
  'organization',
  'jobTitle',
  'department',
  'primaryCity',
  'primaryCountry',
  'birthday',
  'nickname',
  'isFavorite',
  'createdAt',
  'updatedAt',
] as const;

export type ColumnId = (typeof COLUMN_IDS)[number];

export interface ColumnDefinition {
  id: ColumnId;
  /** English fallback label. UI should prefer i18n key `friends.columns.<id>` when available. */
  label: string;
  i18nKey: string;
  isSortable: boolean;
  defaultWidth?: string;
}

export const COLUMN_DEFINITIONS: Record<ColumnId, ColumnDefinition> = {
  avatar: {
    id: 'avatar',
    label: '',
    i18nKey: 'friends.columns.avatar',
    isSortable: false,
    defaultWidth: '56px',
  },
  displayName: {
    id: 'displayName',
    label: 'Name',
    i18nKey: 'friends.columns.displayName',
    isSortable: true,
  },
  circles: {
    id: 'circles',
    label: 'Circles',
    i18nKey: 'friends.columns.circles',
    isSortable: false,
  },
  primaryEmail: {
    id: 'primaryEmail',
    label: 'Email',
    i18nKey: 'friends.columns.primaryEmail',
    isSortable: false,
  },
  primaryPhone: {
    id: 'primaryPhone',
    label: 'Phone',
    i18nKey: 'friends.columns.primaryPhone',
    isSortable: false,
  },
  organization: {
    id: 'organization',
    label: 'Organization',
    i18nKey: 'friends.columns.organization',
    isSortable: true,
  },
  jobTitle: {
    id: 'jobTitle',
    label: 'Job Title',
    i18nKey: 'friends.columns.jobTitle',
    isSortable: true,
  },
  department: {
    id: 'department',
    label: 'Department',
    i18nKey: 'friends.columns.department',
    isSortable: true,
  },
  primaryCity: {
    id: 'primaryCity',
    label: 'City',
    i18nKey: 'friends.columns.primaryCity',
    isSortable: true,
  },
  primaryCountry: {
    id: 'primaryCountry',
    label: 'Country',
    i18nKey: 'friends.columns.primaryCountry',
    isSortable: true,
  },
  birthday: {
    id: 'birthday',
    label: 'Birthday',
    i18nKey: 'friends.columns.birthday',
    isSortable: true,
  },
  nickname: {
    id: 'nickname',
    label: 'Nickname',
    i18nKey: 'friends.columns.nickname',
    isSortable: true,
  },
  isFavorite: {
    id: 'isFavorite',
    label: 'Favorite',
    i18nKey: 'friends.columns.isFavorite',
    isSortable: true,
    defaultWidth: '80px',
  },
  createdAt: {
    id: 'createdAt',
    label: 'Added',
    i18nKey: 'friends.columns.createdAt',
    isSortable: true,
  },
  updatedAt: {
    id: 'updatedAt',
    label: 'Updated',
    i18nKey: 'friends.columns.updatedAt',
    isSortable: true,
  },
};

function toColumnDefinition(id: ColumnId) {
  return COLUMN_DEFINITIONS[id];
}

export function getColumnDefinitions(columnIds: ColumnId[]) {
  return columnIds.map(toColumnDefinition);
}
