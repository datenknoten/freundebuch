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
  AddressResponse,
  CircleResponse,
  CollectiveMemberResponse,
  CollectiveResponse,
  CollectiveRoleResponse,
  CollectiveTypeResponse,
  EmailResponse,
  EncounterListItemResponse,
  EncounterResponse,
  FriendDateResponse,
  FriendListItemResponse,
  FriendNoteResponse,
  FriendResponse,
  PhoneResponse,
  UrlResponse,
} from '$shared';

let counter = 0;
function nextId(prefix: string) {
  counter += 1;
  return `${prefix}-${counter}`;
}

const TIMESTAMP = '2026-01-01T00:00:00.000Z';

export function aPhone(overrides: Partial<PhoneResponse> = {}) {
  const value: PhoneResponse = {
    id: nextId('phone'),
    phoneNumber: '+1 555 0100',
    phoneType: 'mobile',
    isPrimary: false,
    createdAt: TIMESTAMP,
    ...overrides,
  };
  return value;
}

export function anEmail(overrides: Partial<EmailResponse> = {}) {
  const value: EmailResponse = {
    id: nextId('email'),
    emailAddress: 'friend@example.com',
    emailType: 'personal',
    isPrimary: false,
    createdAt: TIMESTAMP,
    ...overrides,
  };
  return value;
}

export function anAddress(overrides: Partial<AddressResponse> = {}) {
  const value: AddressResponse = {
    id: nextId('address'),
    streetLine1: '1 Example St',
    city: 'Berlin',
    country: 'DE',
    addressType: 'home',
    isPrimary: false,
    createdAt: TIMESTAMP,
    ...overrides,
  };
  return value;
}

export function aUrl(overrides: Partial<UrlResponse> = {}) {
  const value: UrlResponse = {
    id: nextId('url'),
    url: 'https://example.com',
    urlType: 'personal',
    createdAt: TIMESTAMP,
    ...overrides,
  };
  return value;
}

export function aFriendDate(overrides: Partial<FriendDateResponse> = {}) {
  const value: FriendDateResponse = {
    id: nextId('date'),
    dateValue: '1990-05-15',
    yearKnown: true,
    dateType: 'birthday',
    createdAt: TIMESTAMP,
    ...overrides,
  };
  return value;
}

export function aFriendNote(overrides: Partial<FriendNoteResponse> = {}) {
  const value: FriendNoteResponse = {
    id: nextId('note'),
    content: 'Likes hiking',
    encounter: null,
    sourceFriend: null,
    supersedesNoteId: null,
    supersededByNoteId: null,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
  return value;
}

export function aFriend(overrides: Partial<FriendResponse> = {}) {
  const value: FriendResponse = {
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
  return value;
}

export function aFriendListItem(overrides: Partial<FriendListItemResponse> = {}) {
  const value: FriendListItemResponse = {
    id: nextId('friend'),
    displayName: 'Test Friend',
    circles: [],
    isFavorite: false,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
  return value;
}

export function aCollectiveRole(overrides: Partial<CollectiveRoleResponse> = {}) {
  const value: CollectiveRoleResponse = {
    id: nextId('role'),
    roleKey: 'member',
    label: 'Member',
    sortOrder: 0,
    ...overrides,
  };
  return value;
}

export function aCollectiveType(overrides: Partial<CollectiveTypeResponse> = {}) {
  const value: CollectiveTypeResponse = {
    id: nextId('collective-type'),
    name: 'Club',
    description: null,
    isSystemDefault: true,
    roles: [aCollectiveRole()],
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
  return value;
}

export function aCollectiveMember(overrides: Partial<CollectiveMemberResponse> = {}) {
  const value: CollectiveMemberResponse = {
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
  return value;
}

export function aCollective(overrides: Partial<CollectiveResponse> = {}) {
  const value: CollectiveResponse = {
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
  return value;
}

export function aCircle(overrides: Partial<CircleResponse> = {}) {
  const circle: CircleResponse = {
    id: nextId('circle'),
    name: 'Close friends',
    color: null,
    parentCircleId: null,
    sortOrder: 0,
    friendCount: 0,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
  return circle;
}

export function anEncounter(overrides: Partial<EncounterResponse> = {}) {
  const encounter: EncounterResponse = {
    id: nextId('encounter'),
    title: 'Coffee',
    encounterType: 'in_person',
    encounterDate: '2026-02-01',
    locationText: null,
    description: null,
    friends: [{ id: nextId('friend'), displayName: 'Test Friend', photoUrl: null }],
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
  return encounter;
}

export function anEncounterListItem(overrides: Partial<EncounterListItemResponse> = {}) {
  const item: EncounterListItemResponse = {
    id: nextId('encounter'),
    title: 'Coffee',
    encounterType: 'in_person',
    encounterDate: '2026-02-01',
    locationText: null,
    friendCount: 1,
    friends: [{ id: nextId('friend'), displayName: 'Test Friend', photoUrl: null }],
    createdAt: TIMESTAMP,
    ...overrides,
  };
  return item;
}
