<script lang="ts">
import { onMount } from 'svelte';
import { page } from '$app/stores';
import { getAppContext } from '$lib/app-context.js';
import { createI18n } from '$lib/i18n/i18n.js';
import FilterPanel from '$lib/shortcuts/components/FilterPanel.svelte';
import HelpDialog from '$lib/shortcuts/components/HelpDialog.svelte';
import HintModePanel from '$lib/shortcuts/components/HintModePanel.svelte';
import MenuPanel from '$lib/shortcuts/components/MenuPanel.svelte';
import ShortcutHintToast from '$lib/shortcuts/components/ShortcutHintToast.svelte';
import {
  COLLECTIVE_DETAIL_ACTIONS,
  CREATION_SHORTCUTS,
  FRIEND_DETAIL_ACTIONS,
  NAVIGATION_SHORTCUTS,
} from './config.js';
import { isDetailPath } from './detail-path.js';
import { createKeydownHandler } from './handlers/keydown-handler.js';
import { ShortcutHintStore } from './shortcut-hint-store.js';
import type { ShortcutStores } from './types.js';

const { stores: appStores } = getAppContext();
const keyboardModes = appStores.keyboardModes;
const shortcutStores: ShortcutStores = {
  keyboardModes,
  overlay: appStores.overlay,
  isAuthenticated: appStores.auth.isAuthenticated,
  search: appStores.search,
  currentFriend: appStores.friends.currentFriend,
  friendListFilter: appStores.friendListFilter,
};
const shortcutHints = new ShortcutHintStore({
  showShortcutHints: appStores.auth.showShortcutHints,
});
const openModePrefix = keyboardModes.friends.prefix;
const openEncounterModePrefix = keyboardModes.encounters.prefix;
const openMemberModePrefix = keyboardModes.members.prefix;
const openCollectiveModePrefix = keyboardModes.collectives.prefix;
const openFriendLinkModePrefix = keyboardModes.friendLinks.prefix;
const openEncounterFriendModePrefix = keyboardModes.encounterFriends.prefix;
const editCircleModePrefix = keyboardModes.editCircle.prefix;
const deleteCircleModePrefix = keyboardModes.deleteCircle.prefix;

const i18n = createI18n();

let isHelpOpen = $state(false);
let pendingKey = $state<string | null>(null);

let isOnCirclesPage = $derived($page.url.pathname === '/circles');
let isOnFriendsListPage = $derived($page.url.pathname === '/friends');
let isOnEncountersListPage = $derived($page.url.pathname === '/encounters');
let isOnCollectivesListPage = $derived($page.url.pathname === '/collectives');
let isOnFriendDetailPage = $derived(isDetailPath($page.url.pathname, 'friends'));
let isOnCollectiveDetailPage = $derived(isDetailPath($page.url.pathname, 'collectives'));
let isOnEncounterDetailPage = $derived(isDetailPath($page.url.pathname, 'encounters'));

function clearPending() {
  pendingKey = null;
  keyboardModes.reset();
}

function getPendingKey() {
  return pendingKey;
}

function setPendingKey(key: string | null) {
  pendingKey = key;
}

function toggleHelp() {
  isHelpOpen = isHelpOpen === false;
}

function closeHelp() {
  isHelpOpen = false;
}

function showClickedShortcutHint(event: MouseEvent) {
  shortcutHints.handleClick(event);
}

// Capture phase, so the hint fires even when inner handlers stopPropagation().
function listenForShortcutClicks() {
  document.addEventListener('click', showClickedShortcutHint, true);
  return function stopListening() {
    document.removeEventListener('click', showClickedShortcutHint, true);
  };
}

onMount(listenForShortcutClicks);

// Recreated when the help dialog opens or closes, so the guards see the current state.
const handleKeydown = $derived(
  createKeydownHandler({
    getPendingKey,
    setPendingKey,
    toggleHelp,
    clearPending,
    isHelpOpen,
    stores: shortcutStores,
  }),
);
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isHelpOpen}
  <HelpDialog
    pageContext={{
      isOnCirclesPage,
      isOnFriendsListPage,
      isOnEncountersListPage,
      isOnCollectivesListPage,
      isOnFriendDetailPage,
      isOnCollectiveDetailPage,
      isOnEncounterDetailPage,
    }}
    onclose={closeHelp}
  />
{/if}

{#if pendingKey === 'g'}
  <MenuPanel title={$i18n.t('shortcuts.panels.goTo')} items={NAVIGATION_SHORTCUTS} />
{:else if pendingKey === 'n'}
  <MenuPanel title={$i18n.t('shortcuts.panels.new')} items={CREATION_SHORTCUTS} />
{:else if pendingKey === 'a' && isOnCollectiveDetailPage}
  <MenuPanel title={$i18n.t('shortcuts.panels.add')} items={COLLECTIVE_DETAIL_ACTIONS} />
{:else if pendingKey === 'a'}
  <MenuPanel title={$i18n.t('shortcuts.panels.add')} items={FRIEND_DETAIL_ACTIONS} />
{:else if pendingKey === 'o' && isOnFriendsListPage}
  <HintModePanel title={$i18n.t('shortcuts.panels.openFriend')} prefix={$openModePrefix} itemDescription={$i18n.t('shortcuts.items.friend')} />
{:else if pendingKey === 'o' && isOnEncountersListPage}
  <HintModePanel title={$i18n.t('shortcuts.panels.openEncounter')} prefix={$openEncounterModePrefix} itemDescription={$i18n.t('shortcuts.items.encounter')} />
{:else if pendingKey === 'o' && isOnCollectiveDetailPage}
  <HintModePanel title={$i18n.t('shortcuts.panels.openMember')} prefix={$openMemberModePrefix} itemDescription={$i18n.t('shortcuts.items.member')} />
{:else if pendingKey === 'o' && isOnCollectivesListPage}
  <HintModePanel title={$i18n.t('shortcuts.panels.openCollective')} prefix={$openCollectiveModePrefix} itemDescription={$i18n.t('shortcuts.items.collective')} />
{:else if pendingKey === 'o' && isOnFriendDetailPage}
  <HintModePanel title={$i18n.t('shortcuts.panels.openLink')} prefix={$openFriendLinkModePrefix} itemDescription={$i18n.t('shortcuts.items.link')} />
{:else if pendingKey === 'o' && isOnEncounterDetailPage}
  <HintModePanel title={$i18n.t('shortcuts.panels.openFriend')} prefix={$openEncounterFriendModePrefix} itemDescription={$i18n.t('shortcuts.items.friend')} />
{:else if pendingKey === 'f'}
  <FilterPanel />
{:else if pendingKey === 'e' && isOnCirclesPage}
  <HintModePanel title={$i18n.t('shortcuts.panels.editCircle')} prefix={$editCircleModePrefix} itemDescription={$i18n.t('shortcuts.items.circleEdit')} />
{:else if pendingKey === 'd' && isOnCirclesPage}
  <HintModePanel title={$i18n.t('shortcuts.panels.deleteCircle')} prefix={$deleteCircleModePrefix} variant="danger" itemDescription={$i18n.t('shortcuts.items.circleDelete')} />
{:else}
  <ShortcutHintToast hints={shortcutHints} />
{/if}
