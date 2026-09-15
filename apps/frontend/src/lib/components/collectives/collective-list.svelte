<script lang="ts">
import { onMount } from 'svelte';
import BarsArrowDown from 'svelte-heros-v2/BarsArrowDown.svelte';
import BarsArrowUp from 'svelte-heros-v2/BarsArrowUp.svelte';
import ChevronLeft from 'svelte-heros-v2/ChevronLeft.svelte';
import ChevronRight from 'svelte-heros-v2/ChevronRight.svelte';
import Plus from 'svelte-heros-v2/Plus.svelte';
import Users from 'svelte-heros-v2/Users.svelte';
import { goto } from '$app/navigation';
import type { CollectiveListParams } from '$lib/api/collectives';
import AlertBanner from '$lib/components/alert-banner.svelte';
import { Button, EmptyState, formClasses, SearchInput, Spinner } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';
import { collectives, collectivesList, collectiveTypes } from '$lib/stores/collectives';
import { visibleCollectiveIds } from '$lib/stores/ui';
import CollectiveGrid from './collective-grid.svelte';

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

// Open the first result when pressing Enter in the search box
function openFirstResult() {
  const first = sortedItems[0];
  if (!first) return;
  goto(`/collectives/${first.id}`);
}
</script>

<div class="space-y-4">
  <!-- Search input (prominent, matching friend list style) -->
  <SearchInput
    id="collective-search"
    value={searchQuery}
    oninput={handleSearchInput}
    onsubmit={openFirstResult}
    onclear={clearFilters}
    placeholder={$i18n.t('collectives.searchPlaceholder')}
    ariaLabel={$i18n.t('aria.searchCollectives')}
  />

  <!-- Unified Control Bar (matching friend list style) -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-2 border-b border-gray-200">
    <!-- Left: Result count -->
    <div class="text-sm text-gray-600 font-body" aria-live="polite">
      {$i18n.t('collectives.collectiveCount', { count: pagination.totalCount })}
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
          class={formClasses.inputSm}
          aria-label={$i18n.t('aria.filterByType')}
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
          class={formClasses.inputSm}
          aria-label={$i18n.t('aria.sortBy')}
        >
          <option value="name">{$i18n.t('friendList.name')}</option>
          <option value="created_at">{$i18n.t('friendList.dateAdded')}</option>
          <option value="member_count">{$i18n.t('collectives.sortByMembers')}</option>
        </select>

        <Button
          variant="secondary"
          size="xs"
          onclick={toggleSortOrder}
          title={sortOrder === 'asc' ? $i18n.t('common.ascending') : $i18n.t('common.descending')}
          aria-label={sortOrder === 'asc' ? $i18n.t('common.ascending') : $i18n.t('common.descending')}
        >
          {#if sortOrder === 'asc'}
            <BarsArrowUp class="w-4 h-4 text-gray-600" strokeWidth="2" />
          {:else}
            <BarsArrowDown class="w-4 h-4 text-gray-600" strokeWidth="2" />
          {/if}
        </Button>
      </div>

      <!-- Pagination controls (inline) -->
      {#if pagination.totalPages > 1}
        <div class="flex items-center gap-1 ml-2 pl-2 border-l border-gray-200">
          <Button
            variant="secondary"
            size="xs"
            onclick={() => goToPage(pagination.page - 1)}
            disabled={pagination.page <= 1 || isLoading}
            aria-label={$i18n.t('aria.previousPage')}
          >
            <ChevronLeft class="w-4 h-4 text-gray-600" strokeWidth="2" />
          </Button>
          <span class="text-sm text-gray-600 font-body px-2 whitespace-nowrap">
            {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            variant="secondary"
            size="xs"
            onclick={() => goToPage(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages || isLoading}
            aria-label={$i18n.t('aria.nextPage')}
          >
            <ChevronRight class="w-4 h-4 text-gray-600" strokeWidth="2" />
          </Button>
        </div>
      {/if}
    </div>
  </div>

  <!-- Error state -->
  {#if error}
    <AlertBanner variant="error">{error}</AlertBanner>
  {/if}

  <!-- Loading state -->
  {#if isLoading && collectiveItems.length === 0}
    <div class="flex justify-center py-12">
      <Spinner size="lg" />
    </div>
  {:else if collectiveItems.length === 0}
    <EmptyState
      icon={Users}
      title={$i18n.t('collectives.noCollectives')}
      description={searchQuery.length > 0 || selectedTypeId.length > 0
        ? $i18n.t('collectives.noCollectivesFiltered')
        : $i18n.t('collectives.noCollectivesSubtitle')}
    >
      <Button href="/collectives/new">
        <Plus class="w-5 h-5" strokeWidth="2" />
        {$i18n.t('collectives.createNew')}
      </Button>
    </EmptyState>
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
