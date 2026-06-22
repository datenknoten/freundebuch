/**
 * Typed factory builders for core domain objects, so tests can construct
 * realistic API payloads in one line and override only the fields they care
 * about. All builders accept a partial override merged over sensible defaults.
 *
 *   const friend = aFriend({ displayName: 'Ada Lovelace', isFavorite: true });
 *   const phone = aPhone({ isPrimary: true });
 *
 * IDs are deterministic (a monotonic counter) so snapshots stay stable.
 */
import type {
  Address,
  Collective,
  CollectiveMember,
  CollectiveRole,
  CollectiveType,
  Email,
  Friend,
  FriendDate,
  FriendListItem,
  Phone,
  Url,
} from '$shared';

let counter = 0;
/** Deterministic id generator: `friend-1`, `phone-2`, ... */
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

const TIMESTAMP = '2026-01-01T00:00:00.000Z';

export function aPhone(overrides: Partial<Phone> = {}): Phone {
  return {
    id: nextId('phone'),
    phoneNumber: '+1 555 0100',
    phoneType: 'mobile',
    isPrimary: false,
    createdAt: TIMESTAMP,
    ...overrides,
  };
}

export function anEmail(overrides: Partial<Email> = {}): Email {
  return {
    id: nextId('email'),
    emailAddress: 'friend@example.com',
    emailType: 'personal',
    isPrimary: false,
    createdAt: TIMESTAMP,
    ...overrides,
  };
}

export function anAddress(overrides: Partial<Address> = {}): Address {
  return {
    id: nextId('address'),
    streetLine1: '1 Example St',
    city: 'Berlin',
    country: 'DE',
    addressType: 'home',
    isPrimary: false,
    createdAt: TIMESTAMP,
    ...overrides,
  };
}

export function aUrl(overrides: Partial<Url> = {}): Url {
  return {
    id: nextId('url'),
    url: 'https://example.com',
    urlType: 'personal',
    createdAt: TIMESTAMP,
    ...overrides,
  };
}

export function aFriendDate(overrides: Partial<FriendDate> = {}): FriendDate {
  return {
    id: nextId('date'),
    dateValue: '1990-05-15',
    yearKnown: true,
    dateType: 'birthday',
    createdAt: TIMESTAMP,
    ...overrides,
  };
}

export function aFriend(overrides: Partial<Friend> = {}): Friend {
  return {
    id: nextId('friend'),
    displayName: 'Test Friend',
    phones: [],
    emails: [],
    addresses: [],
    urls: [],
    professionalHistory: [],
    circles: [],
    isFavorite: false,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

export function aFriendListItem(overrides: Partial<FriendListItem> = {}): FriendListItem {
  return {
    id: nextId('friend'),
    displayName: 'Test Friend',
    circles: [],
    isFavorite: false,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

export function aCollectiveRole(overrides: Partial<CollectiveRole> = {}): CollectiveRole {
  return {
    id: nextId('role'),
    roleKey: 'member',
    label: 'Member',
    sortOrder: 0,
    ...overrides,
  };
}

export function aCollectiveType(overrides: Partial<CollectiveType> = {}): CollectiveType {
  return {
    id: nextId('collective-type'),
    name: 'Club',
    description: null,
    isSystemDefault: true,
    roles: [aCollectiveRole()],
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

export function aCollectiveMember(overrides: Partial<CollectiveMember> = {}): CollectiveMember {
  return {
    id: nextId('membership'),
    contact: { id: nextId('friend'), displayName: 'Test Friend', photoUrl: null },
    role: aCollectiveRole(),
    isActive: true,
    inactiveReason: null,
    inactiveDate: null,
    joinedDate: null,
    notes: null,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

export function aCollective(overrides: Partial<Collective> = {}): Collective {
  return {
    id: nextId('collective'),
    name: 'Test Collective',
    type: aCollectiveType(),
    photoUrl: null,
    photoThumbnailUrl: null,
    notes: null,
    address: {
      streetLine1: null,
      streetLine2: null,
      city: null,
      stateProvince: null,
      postalCode: null,
      country: null,
    },
    memberCount: 0,
    activeMemberCount: 0,
    members: [],
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    deletedAt: null,
    ...overrides,
  };
}
