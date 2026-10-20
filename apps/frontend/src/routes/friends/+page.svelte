<script lang="ts">
import { onMount } from 'svelte';
import Plus from 'svelte-heros-v2/Plus.svelte';
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import { getAppContext } from '$lib/app-context.js';
import FriendList from '$lib/components/friends/FriendList.svelte';
import Button from '$lib/components/ui/Button.svelte';
import PageShell from '$lib/components/ui/PageShell.svelte';
import { createI18n } from '$lib/i18n/i18n.js';
import type { FacetFilters } from '$shared';

const friends = getAppContext().stores.friends;
const logger = getAppContext().logger;
const auth = getAppContext().stores.auth;
const friendsPageSize = auth.friendsPageSize;
const isAuthInitialized = auth.isInitialized;

const i18n = createI18n();

let hasLoaded = $state(false);
let friendListRef = $state<FriendList | null>(null);

// Known facet filter keys for URL parsing
const STRING_ARRAY_KEYS = [
  'country',
  'city',
  'organization',
  'job_title',
  'department',
  'circles',
] as const;
const ALL_FACET_KEYS = [...STRING_ARRAY_KEYS, 'relationship_category'] as const;

let initialQuery = $derived($page.url.searchParams.get('q') ?? '');

function parseFiltersFromUrl() {
  const filters: FacetFilters = {};

  for (const key of STRING_ARRAY_KEYS) {
    const value = $page.url.searchParams.get(key);
    if (value !== null && value !== '') {
      filters[key] = value.split(',');
    }
  }

  const relationshipCategory = $page.url.searchParams.get('relationship_category');
  if (relationshipCategory !== null && relationshipCategory !== '') {
    filters.relationship_category = relationshipCategory.split(',') as (
      | 'family'
      | 'professional'
      | 'social'
    )[];
  }

  return filters;
}
let initialFilters = $derived.by<FacetFilters>(parseFiltersFromUrl);

function handleQueryChange(query: string) {
  updateUrl(query, undefined);
}

function handleFiltersChange(filters: FacetFilters) {
  updateUrl(undefined, filters);
}

function updateUrl(query?: string, filters?: FacetFilters) {
  const url = new URL($page.url);

  if (query !== undefined) {
    if (query.trim() !== '') {
      url.searchParams.set('q', query.trim());
    } else {
      url.searchParams.delete('q');
    }
  }

  if (filters !== undefined) {
    for (const key of ALL_FACET_KEYS) {
      url.searchParams.delete(key);
    }
    for (const [key, values] of Object.entries(filters)) {
      if (values !== undefined && values.length > 0) {
        url.searchParams.set(key, values.join(','));
      }
    }
  }

  // replaceState: filter edits must not pile up history entries.
  void goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
}

// The store keeps the failure in its error state, which FriendList shows.
async function loadInitialFriends() {
  try {
    await friends.loadFriends({ pageSize: $friendsPageSize });
  } catch (err) {
    logger.error({ err }, 'Failed to load friends');
  }
}

function loadFriendsWhenAuthReady() {
  if ($isAuthInitialized === true && hasLoaded === false) {
    hasLoaded = true;
    void loadInitialFriends();
  }
}
$effect(loadFriendsWhenAuthReady);

function handlePreviousPage() {
  friendListRef?.goToPreviousPage();
}

function handleNextPage() {
  friendListRef?.goToNextPage();
}

function removePaginationShortcuts() {
  window.removeEventListener('shortcut:previous-page', handlePreviousPage);
  window.removeEventListener('shortcut:next-page', handleNextPage);
}

function listenForPaginationShortcuts() {
  window.addEventListener('shortcut:previous-page', handlePreviousPage);
  window.addEventListener('shortcut:next-page', handleNextPage);
  return removePaginationShortcuts;
}
onMount(listenForPaginationShortcuts);
</script>

<svelte:head>
  <title>{initialQuery ? `${$i18n.t('search.placeholder')}: ${initialQuery}` : $i18n.t('friends.title')} | Freundebuch</title>
</svelte:head>

<PageShell
  width="list"
  title={$i18n.t('friends.title')}
  subtitle={$i18n.t('friends.subtitle')}
>
  {#snippet actions()}
    <Button href="/friends/new">
      <Plus class="w-5 h-5" strokeWidth="2" />
      {$i18n.t('friends.addFriend')}
    </Button>
  {/snippet}

  <FriendList
    bind:this={friendListRef}
    {initialQuery}
    {initialFilters}
    onQueryChange={handleQueryChange}
    onFiltersChange={handleFiltersChange}
  />
</PageShell>
