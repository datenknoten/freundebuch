<script lang="ts">
import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import { page } from '$app/stores';
// biome-ignore lint/style/useImportType: FriendList is used both as type and value (bind:this)
import FriendList from '$lib/components/friends/FriendList.svelte';
import { friendsPageSize, isAuthInitialized } from '$lib/stores/auth';
import { friendListFilter, friends } from '$lib/stores/friends';
import type { FacetFilters } from '$shared';

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

// Get initial query and filters from URL
let initialQuery = $derived($page.url.searchParams.get('q') ?? '');
let initialFilters = $derived.by<FacetFilters>(() => {
  const filters: FacetFilters = {};

  // Parse string array filters
  for (const key of STRING_ARRAY_KEYS) {
    const value = $page.url.searchParams.get(key);
    if (value) {
      filters[key] = value.split(',');
    }
  }

  // Parse relationship_category with proper type
  const relationshipCategory = $page.url.searchParams.get('relationship_category');
  if (relationshipCategory) {
    filters.relationship_category = relationshipCategory.split(',') as (
      | 'family'
      | 'professional'
      | 'social'
    )[];
  }

  return filters;
});

// Handle query changes from the FriendList component
function handleQueryChange(query: string) {
  updateUrl(query, undefined);
}

// Handle filter changes from the FriendList component
function handleFiltersChange(filters: FacetFilters) {
  updateUrl(undefined, filters);
}

// Update URL with query and/or filters
function updateUrl(query?: string, filters?: FacetFilters) {
  const url = new URL($page.url);

  // Update query if provided
  if (query !== undefined) {
    if (query.trim()) {
      url.searchParams.set('q', query.trim());
    } else {
      url.searchParams.delete('q');
    }
  }

  // Update filters if provided
  if (filters !== undefined) {
    // Remove all existing filter params
    for (const key of ALL_FACET_KEYS) {
      url.searchParams.delete(key);
    }
    // Add new filter params
    for (const [key, values] of Object.entries(filters)) {
      if (values && values.length > 0) {
        url.searchParams.set(key, values.join(','));
      }
    }
  }

  // Update URL without navigation (replaceState)
  goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
}

// Load friends when auth is ready
$effect(() => {
  if ($isAuthInitialized && !hasLoaded) {
    hasLoaded = true;
    friends.loadFriends({ pageSize: $friendsPageSize });
  }
});

// Listen for keyboard shortcuts for pagination
onMount(() => {
  function handlePreviousPage() {
    friendListRef?.goToPreviousPage();
  }

  function handleNextPage() {
    friendListRef?.goToNextPage();
  }

  window.addEventListener('shortcut:previous-page', handlePreviousPage);
  window.addEventListener('shortcut:next-page', handleNextPage);

  return () => {
    window.removeEventListener('shortcut:previous-page', handlePreviousPage);
    window.removeEventListener('shortcut:next-page', handleNextPage);
  };
});
</script>

<svelte:head>
  <title>{initialQuery ? `Search: ${initialQuery}` : 'Friends'} | Freundebuch</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 p-4">
  <div class="max-w-7xl mx-auto mt-8">
    <div class="bg-white rounded-xl shadow-lg p-8">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 class="text-3xl font-heading text-forest">Friends</h1>
          <p class="text-gray-600 font-body mt-1">Manage your personal and professional friends</p>
        </div>
        <a
          href="/friends/new"
          class="inline-flex items-center gap-2 bg-forest text-white px-4 py-2 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Friend
        </a>
      </div>

      <FriendList
        bind:this={friendListRef}
        {initialQuery}
        {initialFilters}
        onQueryChange={handleQueryChange}
        onFiltersChange={handleFiltersChange}
      />
    </div>
  </div>
</div>
