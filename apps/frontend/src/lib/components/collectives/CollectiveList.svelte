<script lang="ts">
import { onMount } from 'svelte';
import type { CollectiveListParams } from '$lib/api/collectives';
import { createI18n } from '$lib/i18n/index.js';
import { collectives, collectivesList, collectiveTypes } from '$lib/stores/collectives';
import { visibleCollectiveIds } from '$lib/stores/ui';
import CollectiveGrid from './CollectiveGrid.svelte';

const i18n = createI18n();

interface Props {
  /** Initial type filter */
  initialTypeId?: string;
  /** Initial search query */
  initialSearch?: string;
}

let { initialTypeId, initialSearch = '' }: Props = $props();

let searchQuery = $state(initialSearch);
let selectedTypeId = $state(initialTypeId ?? '');
let sortBy = $state<'name' | 'created_at' | 'member_count'>('name');
let sortOrder = $state<'asc' | 'desc'>('asc');
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Derived state
let isLoading = $derived($collectives.isLoading);
let error = $derived($collectives.error);
let collectiveItems = $derived($collectivesList);
let pagination = $derived($collectives.pagination);
let types = $derived($collectiveTypes);

// Update visible collective IDs for keyboard navigation
$effect(() => {
  const ids = collectiveItems.map((c) => c.id);
  visibleCollectiveIds.set(ids);
});

// Load types and collectives on mount
onMount(async () => {
  if (types.length === 0) {
    await collectives.loadTypes();
  }
  await loadCollectives();
});

async function loadCollectives(page = 1) {
  const params: CollectiveListParams = {
    page,
    pageSize: pagination.pageSize,
  };

  if (selectedTypeId) {
    params.typeId = selectedTypeId;
  }
  if (searchQuery.trim()) {
    params.search = searchQuery.trim();
  }

  await collectives.loadCollectives(params);
}

function handleSearchInput(value: string) {
  searchQuery = value;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    loadCollectives();
  }, 300);
}

function handleTypeChange(e: Event) {
  const select = e.target as HTMLSelectElement;
  selectedTypeId = select.value;
  loadCollectives();
}

function clearFilters() {
  searchQuery = '';
  selectedTypeId = '';
  loadCollectives();
}

function handleSortChange(
  newSortBy: 'name' | 'created_at' | 'member_count',
  newSortOrder: 'asc' | 'desc',
) {
  sortBy = newSortBy;
  sortOrder = newSortOrder;
  // Client-side sort for now - the API doesn't support sort params yet
}

function toggleSortOrder() {
  sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
}

function goToPage(page: number) {
  loadCollectives(page);
}

// Navigate to previous page (for keyboard shortcut)
export function goToPreviousPage() {
  if (pagination.page > 1) {
    loadCollectives(pagination.page - 1);
  }
}

// Navigate to next page (for keyboard shortcut)
export function goToNextPage() {
  if (pagination.page < pagination.totalPages) {
    loadCollectives(pagination.page + 1);
  }
}

// Client-side sorted items (until API supports sorting)
let sortedItems = $derived.by(() => {
  const items = [...collectiveItems];
  items.sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case 'name':
        cmp = a.name.localeCompare(b.name);
        break;
      case 'created_at':
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'member_count':
        cmp = a.activeMemberCount - b.activeMemberCount;
        break;
    }
    return sortOrder === 'asc' ? cmp : -cmp;
  });
  return items;
});
</script>

<div class="space-y-4">
  <!-- Search input (prominent, matching friend list style) -->
  <div class="relative">
    <svg
      class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
    <input
      id="collective-search"
      type="text"
      value={searchQuery}
      oninput={(e) => handleSearchInput(e.currentTarget.value)}
      placeholder={$i18n.t('collectives.searchPlaceholder')}
      class="w-full pl-12 pr-12 py-3 text-base font-body text-gray-900 placeholder-gray-400 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent"
      autocomplete="off"
      data-search-input
      aria-label="Search collectives"
    />
    {#if searchQuery}
      <button
        type="button"
        onclick={clearFilters}
        class="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
        aria-label="Clear search"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    {/if}
  </div>

  <!-- Unified Control Bar (matching friend list style) -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-2 border-b border-gray-200">
    <!-- Left: Result count -->
    <div class="text-sm text-gray-600 font-body" aria-live="polite">
      {$i18n.t(pagination.totalCount === 1 ? 'collectives.collectiveCount' : 'collectives.collectiveCount_plural', { count: pagination.totalCount })}
      {#if searchQuery || selectedTypeId}
        <span class="text-forest">{$i18n.t('collectives.filtered')}</span>
      {/if}
    </div>

    <!-- Right: Controls -->
    <div class="flex flex-wrap items-center gap-3">
      <!-- Type filter -->
      <div class="flex items-center gap-2">
        <label for="type-filter" class="text-sm text-gray-600 font-body whitespace-nowrap">
          {$i18n.t('collectives.type')}
        </label>
        <select
          id="type-filter"
          value={selectedTypeId}
          onchange={handleTypeChange}
          class="px-2 py-1 border border-gray-300 rounded text-sm font-body focus:ring-2 focus:ring-forest focus:border-transparent"
          aria-label="Filter by type"
        >
          <option value="">{$i18n.t('collectives.allTypes')}</option>
          {#each types as type (type.id)}
            <option value={type.id}>{type.name}</option>
          {/each}
        </select>
      </div>

      <!-- Sort controls -->
      <div class="flex items-center gap-2">
        <label for="sort-by" class="text-sm text-gray-600 font-body whitespace-nowrap">{$i18n.t('friendList.sortLabel')}</label>
        <select
          id="sort-by"
          value={sortBy}
          onchange={(e) => {
            sortBy = e.currentTarget.value as 'name' | 'created_at' | 'member_count';
          }}
          class="px-2 py-1 border border-gray-300 rounded text-sm font-body focus:ring-2 focus:ring-forest focus:border-transparent"
          aria-label="Sort by"
        >
          <option value="name">{$i18n.t('friendList.name')}</option>
          <option value="created_at">{$i18n.t('friendList.dateAdded')}</option>
          <option value="member_count">{$i18n.t('collectives.sortByMembers')}</option>
        </select>

        <button
          onclick={toggleSortOrder}
          class="p-1.5 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          title={sortOrder === 'asc' ? $i18n.t('common.ascending') : $i18n.t('common.descending')}
          aria-label={sortOrder === 'asc' ? $i18n.t('common.ascending') : $i18n.t('common.descending')}
        >
          {#if sortOrder === 'asc'}
            <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
          {:else}
            <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
            </svg>
          {/if}
        </button>
      </div>

      <!-- Pagination controls (inline) -->
      {#if pagination.totalPages > 1}
        <div class="flex items-center gap-1 ml-2 pl-2 border-l border-gray-200">
          <button
            onclick={() => goToPage(pagination.page - 1)}
            disabled={pagination.page <= 1 || isLoading}
            class="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span class="text-sm text-gray-600 font-body px-2 whitespace-nowrap">
            {pagination.page} / {pagination.totalPages}
          </span>
          <button
            onclick={() => goToPage(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages || isLoading}
            class="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      {/if}
    </div>
  </div>

  <!-- Error state -->
  {#if error}
    <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg font-body text-sm" role="alert">
      {error}
    </div>
  {/if}

  <!-- Loading state -->
  {#if isLoading && collectiveItems.length === 0}
    <div class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
    </div>
  {:else if collectiveItems.length === 0}
    <!-- Empty state -->
    <div class="text-center py-12 bg-gray-50 rounded-lg">
      <svg
        class="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      <h3 class="mt-4 text-lg font-heading text-gray-900">{$i18n.t('collectives.noCollectives')}</h3>
      <p class="mt-2 text-sm text-gray-600 font-body">
        {#if searchQuery || selectedTypeId}
          {$i18n.t('collectives.noCollectivesFiltered')}
        {:else}
          {$i18n.t('collectives.noCollectivesSubtitle')}
        {/if}
      </p>
      <a
        href="/collectives/new"
        class="mt-4 inline-flex items-center gap-2 bg-forest text-white px-4 py-2 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        {$i18n.t('collectives.createNew')}
      </a>
    </div>
  {:else}
    <!-- Collective Grid (table + cards) -->
    <CollectiveGrid
      items={sortedItems}
      {sortBy}
      {sortOrder}
      onSortChange={handleSortChange}
    />
  {/if}
</div>
