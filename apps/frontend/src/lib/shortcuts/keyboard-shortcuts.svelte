<script lang="ts">
import { page } from '$app/stores';
import { createI18n } from '$lib/i18n/index.js';
import {
  deleteCircleModePrefix,
  editCircleModePrefix,
  filterModeCategory,
  filterModePrefix,
  isDeleteCircleModeActive,
  isEditCircleModeActive,
  isFilterModeActive,
  isOpenCollectiveModeActive,
  isOpenEncounterModeActive,
  isOpenFriendLinkModeActive,
  isOpenMemberModeActive,
  isOpenModeActive,
  openCollectiveModePrefix,
  openEncounterModePrefix,
  openFriendLinkModePrefix,
  openMemberModePrefix,
  openModePrefix,
} from '$lib/stores/ui';
import { FilterPanel, HelpDialog, HintModePanel, MenuPanel } from './components/index.js';
import {
  COLLECTIVE_DETAIL_ACTIONS,
  CREATION_SHORTCUTS,
  FRIEND_DETAIL_ACTIONS,
  NAVIGATION_SHORTCUTS,
} from './config.js';
import { createKeydownHandler } from './handlers/index.js';

const i18n = createI18n();

let showHelp = $state(false);
let pendingKey = $state<string | null>(null);

let isOnCirclesPage = $derived($page.url.pathname === '/circles');
let isOnFriendsListPage = $derived($page.url.pathname === '/friends');
let isOnEncountersListPage = $derived($page.url.pathname === '/encounters');
let isOnCollectivesListPage = $derived($page.url.pathname === '/collectives');
let isOnFriendDetailPage = $derived(
  $page.url.pathname.match(/^\/friends\/[^/]+$/) && !$page.url.pathname.endsWith('/new'),
);
let isOnCollectiveDetailPage = $derived(
  $page.url.pathname.match(/^\/collectives\/[^/]+$/) && !$page.url.pathname.endsWith('/new'),
);

function clearPending() {
  pendingKey = null;
  isOpenModeActive.set(false);
  openModePrefix.set(null);
  isFilterModeActive.set(false);
  filterModeCategory.set(null);
  filterModePrefix.set(null);
  isEditCircleModeActive.set(false);
  editCircleModePrefix.set(null);
  isDeleteCircleModeActive.set(false);
  deleteCircleModePrefix.set(null);
  isOpenEncounterModeActive.set(false);
  openEncounterModePrefix.set(null);
  isOpenCollectiveModeActive.set(false);
  openCollectiveModePrefix.set(null);
  isOpenMemberModeActive.set(false);
  openMemberModePrefix.set(null);
  isOpenFriendLinkModeActive.set(false);
  openFriendLinkModePrefix.set(null);
}

// The handler is recreated when showHelp changes so guards get fresh state
const handleKeydown = $derived(
  createKeydownHandler({
    getPendingKey: () => pendingKey,
    setPendingKey: (key) => {
      pendingKey = key;
    },
    toggleHelp: () => {
      showHelp = !showHelp;
    },
    clearPending,
    showHelp,
  }),
);
</script>

<svelte:window onkeydown={handleKeydown} />

{#if showHelp}
  <HelpDialog
    pageContext={{
      isOnCirclesPage,
      isOnFriendsListPage,
      isOnEncountersListPage,
      isOnCollectivesListPage,
      isOnFriendDetailPage: !!isOnFriendDetailPage,
      isOnCollectiveDetailPage: !!isOnCollectiveDetailPage,
    }}
    onclose={() => (showHelp = false)}
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
{:else if pendingKey === 'f'}
  <FilterPanel />
{:else if pendingKey === 'e' && isOnCirclesPage}
  <HintModePanel title={$i18n.t('shortcuts.panels.editCircle')} prefix={$editCircleModePrefix} itemDescription={$i18n.t('shortcuts.items.circleEdit')} />
{:else if pendingKey === 'd' && isOnCirclesPage}
  <HintModePanel title={$i18n.t('shortcuts.panels.deleteCircle')} prefix={$deleteCircleModePrefix} variant="danger" itemDescription={$i18n.t('shortcuts.items.circleDelete')} />
{/if}
