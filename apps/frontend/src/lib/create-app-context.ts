import { createRootLogger } from '@datenknoten/kit/logger';
import { AddressLookupApi } from './api/address-lookup.js';
import { ApiClient } from './api/api-client.js';
import { AppPasswordsApi } from './api/app-passwords.js';
import { AuthApi } from './api/auth.js';
import { CirclesApi } from './api/circles.js';
import { CollectiveContactsApi } from './api/collective-contacts.js';
import { CollectiveMembersApi } from './api/collective-members.js';
import { CollectivesApi } from './api/collectives.js';
import { EncountersApi } from './api/encounters.js';
import { FriendDetailsApi } from './api/friend-details.js';
import { FriendNotesApi } from './api/friend-notes.js';
import { FriendPhotosApi } from './api/friend-photos.js';
import { FriendSearchApi } from './api/friend-search.js';
import { FriendsApi } from './api/friends.js';
import { NotificationChannelsApi } from './api/notification-channels.js';
import { OAuthApi } from './api/oauth.js';
import type { AppContext } from './app-context.js';
import { createAppAuthClient } from './auth-client.js';
import type { ClientConfig } from './config.js';
import { AuthStore } from './stores/auth.js';
import { CirclesStore } from './stores/circles.js';
import { CollectivesStore } from './stores/collectives.js';
import { EncountersStore } from './stores/encounters.js';
import { FriendListFilterStore } from './stores/friend-list-filter.js';
import { FriendsStore } from './stores/friends.js';
import { InstanceStore } from './stores/instance.js';
import { KeyboardModesStore } from './stores/keyboard-modes.js';
import { LocaleStore } from './stores/locale.js';
import { NotificationChannelsStore } from './stores/notification-channels.js';
import { OverlayStore } from './stores/overlay.js';
import { SearchStore } from './stores/search.js';
import { SessionStore } from './stores/session.js';

/** Builds every client-side collaborator once; the root layout provides the result. */
export function createAppContext(config: ClientConfig) {
  const logger = createRootLogger({ LOG_LEVEL: config.PUBLIC_LOG_LEVEL });
  const session = new SessionStore();
  const client = new ApiClient({
    baseUrl: config.PUBLIC_API_URL,
    logger: logger.child({ module: 'api-client' }),
    onUnauthorized: session.notifyUnauthorized.bind(session),
  });
  const authClient = createAppAuthClient(config.PUBLIC_API_URL);

  const api = {
    addressLookup: new AddressLookupApi({ client }),
    appPasswords: new AppPasswordsApi({ client }),
    auth: new AuthApi({ client }),
    circles: new CirclesApi({ client }),
    collectiveContacts: new CollectiveContactsApi({ client }),
    collectiveMembers: new CollectiveMembersApi({ client }),
    collectives: new CollectivesApi({ client }),
    encounters: new EncountersApi({ client }),
    friendDetails: new FriendDetailsApi({ client }),
    friendNotes: new FriendNotesApi({ client }),
    friendPhotos: new FriendPhotosApi({ client }),
    friendSearch: new FriendSearchApi({ client }),
    friends: new FriendsApi({ client }),
    notificationChannels: new NotificationChannelsApi({ client }),
    oauth: new OAuthApi({ client }),
  } satisfies AppContext['api'];

  const auth = new AuthStore({
    authApi: api.auth,
    authClient,
    session,
    logger: logger.child({ module: 'auth-store' }),
  });

  const stores = {
    auth,
    circles: new CirclesStore({
      circlesApi: api.circles,
      logger: logger.child({ module: 'circles-store' }),
    }),
    collectives: new CollectivesStore({
      collectivesApi: api.collectives,
      collectiveMembersApi: api.collectiveMembers,
      logger: logger.child({ module: 'collectives-store' }),
    }),
    encounters: new EncountersStore({ encountersApi: api.encounters }),
    friendListFilter: new FriendListFilterStore(),
    friends: new FriendsStore({
      friendsApi: api.friends,
      friendDetailsApi: api.friendDetails,
      friendPhotosApi: api.friendPhotos,
      friendSearchApi: api.friendSearch,
      circlesApi: api.circles,
      logger: logger.child({ module: 'friends-store' }),
    }),
    instance: new InstanceStore({ logger: logger.child({ module: 'instance-store' }) }),
    keyboardModes: new KeyboardModesStore(),
    locale: new LocaleStore({ auth, logger: logger.child({ module: 'locale-store' }) }),
    notificationChannels: new NotificationChannelsStore({
      notificationChannelsApi: api.notificationChannels,
    }),
    overlay: new OverlayStore(),
    search: new SearchStore({
      friendSearchApi: api.friendSearch,
      logger: logger.child({ module: 'search-store' }),
    }),
    session,
  } satisfies AppContext['stores'];

  return {
    config,
    logger,
    authClient,
    api,
    stores,
  } satisfies AppContext;
}
