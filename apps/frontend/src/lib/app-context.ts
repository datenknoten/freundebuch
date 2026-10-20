import type { Logger } from 'pino';
import { getContext, hasContext, setContext } from 'svelte';
import type { AddressLookupApi } from './api/address-lookup.js';
import type { AppPasswordsApi } from './api/app-passwords.js';
import type { AuthApi } from './api/auth.js';
import type { CirclesApi } from './api/circles.js';
import type { CollectiveContactsApi } from './api/collective-contacts.js';
import type { CollectiveMembersApi } from './api/collective-members.js';
import type { CollectivesApi } from './api/collectives.js';
import type { EncountersApi } from './api/encounters.js';
import type { FriendDetailsApi } from './api/friend-details.js';
import type { FriendNotesApi } from './api/friend-notes.js';
import type { FriendPhotosApi } from './api/friend-photos.js';
import type { FriendSearchApi } from './api/friend-search.js';
import type { FriendsApi } from './api/friends.js';
import type { NotificationChannelsApi } from './api/notification-channels.js';
import type { OAuthApi } from './api/oauth.js';
import type { AuthClient } from './auth-client.js';
import type { ClientConfig } from './config.js';
import { MissingAppContextError } from './errors/missing-app-context.error.js';
import type { AuthStore } from './stores/auth.js';
import type { CirclesStore } from './stores/circles.js';
import type { CollectivesStore } from './stores/collectives.js';
import type { EncountersStore } from './stores/encounters.js';
import type { FriendListFilterStore } from './stores/friend-list-filter.js';
import type { FriendsStore } from './stores/friends.js';
import type { InstanceStore } from './stores/instance.js';
import type { KeyboardModesStore } from './stores/keyboard-modes.js';
import type { LocaleStore } from './stores/locale.js';
import type { NotificationChannelsStore } from './stores/notification-channels.js';
import type { OverlayStore } from './stores/overlay.js';
import type { SearchStore } from './stores/search.js';
import type { SessionStore } from './stores/session.js';

/** One API class per backend resource. */
export interface AppApis {
  readonly addressLookup: AddressLookupApi;
  readonly appPasswords: AppPasswordsApi;
  readonly auth: AuthApi;
  readonly circles: CirclesApi;
  readonly collectiveContacts: CollectiveContactsApi;
  readonly collectiveMembers: CollectiveMembersApi;
  readonly collectives: CollectivesApi;
  readonly encounters: EncountersApi;
  readonly friendDetails: FriendDetailsApi;
  readonly friendNotes: FriendNotesApi;
  readonly friendPhotos: FriendPhotosApi;
  readonly friendSearch: FriendSearchApi;
  readonly friends: FriendsApi;
  readonly notificationChannels: NotificationChannelsApi;
  readonly oauth: OAuthApi;
}

/** One store class per client-side state slice. */
export interface AppStores {
  readonly auth: AuthStore;
  readonly circles: CirclesStore;
  readonly collectives: CollectivesStore;
  readonly encounters: EncountersStore;
  readonly friendListFilter: FriendListFilterStore;
  readonly friends: FriendsStore;
  readonly instance: InstanceStore;
  readonly keyboardModes: KeyboardModesStore;
  readonly locale: LocaleStore;
  readonly notificationChannels: NotificationChannelsStore;
  readonly overlay: OverlayStore;
  readonly search: SearchStore;
  readonly session: SessionStore;
}

export interface AppContext {
  readonly config: ClientConfig;
  readonly logger: Logger;
  readonly authClient: AuthClient;
  readonly api: AppApis;
  readonly stores: AppStores;
}

const APP_CONTEXT_KEY = Symbol('app-context');

/** Must run during the initialisation of the root layout, like every Svelte `setContext`. */
export function setAppContext(context: AppContext) {
  setContext(APP_CONTEXT_KEY, context);
}

/**
 * Must run during component initialisation.
 *
 * @throws {MissingAppContextError} when no ancestor called `setAppContext`.
 */
export function getAppContext() {
  if (hasContext(APP_CONTEXT_KEY) === false) {
    throw new MissingAppContextError();
  }
  const context: AppContext = getContext(APP_CONTEXT_KEY);
  return context;
}

/** The `context` option of Svelte's `mount`/`render`, for tests that mount a component alone. */
export function createAppContextMap(context: AppContext) {
  return new Map<symbol, AppContext>([[APP_CONTEXT_KEY, context]]);
}
