<script lang="ts">
import { onMount } from 'svelte';
import type { EncounterListParams } from '$lib/api/encounters';
import { createI18n } from '$lib/i18n/index.js';
import { encounters, encountersList } from '$lib/stores/encounters';
import { visibleEncounterIds } from '$lib/stores/ui';
import EncounterCard from './EncounterCard.svelte';

const i18n = createI18n();

interface Props {
  /** Friend ID to filter encounters by */
  friendId?: string;
  /** Initial search query */
  initialSearch?: string;
}

let { friendId, initialSearch = '' }: Props = $props();

let searchQuery = $state(initialSearch);
let fromDate = $state('');
let toDate = $state('');
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Derived state
let isLoading = $derived($encounters.isLoading);
let error = $derived($encounters.error);
let encounterItems = $derived($encountersList);
let pagination = $derived($encounters.pagination);

// Update visible encounter IDs for keyboard navigation
$effect(() => {
  const ids = encounterItems.map((e) => e.id);
  visibleEncounterIds.set(ids);
});

// Load encounters on mount (not in $effect to avoid infinite loop)
onMount(() => {
  loadEncounters();
});

async function loadEncounters(page = 1) {
  const params: EncounterListParams = {
    page,
    pageSize: pagination.pageSize,
  };

  if (friendId) {
    params.friendId = friendId;
  }
  if (searchQuery.trim()) {
    params.search = searchQuery.trim();
  }
  if (fromDate) {
    params.fromDate = fromDate;
  }
  if (toDate) {
    params.toDate = toDate;
  }

  await encounters.loadEncounters(params);
}

function handleSearchInput(value: string) {
  searchQuery = value;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    loadEncounters();
  }, 300);
}

function handleDateChange() {
  loadEncounters();
}

function clearFilters() {
  searchQuery = '';
  fromDate = '';
  toDate = '';
  loadEncounters();
}

function goToPage(page: number) {
  loadEncounters(page);
}
</script>

<div class="space-y-4">
  <!-- Search and filters -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-end">
    <!-- Search input -->
    <div class="flex-1">
      <label for="encounter-search" class="block text-sm font-body font-medium text-gray-700 mb-1">
        {$i18n.t('encounters.search')}
      </label>
      <div class="relative">
        <svg
          class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          id="encounter-search"
          type="text"
          value={searchQuery}
          oninput={(e) => handleSearchInput(e.currentTarget.value)}
          placeholder={$i18n.t('encounters.searchPlaceholder')}
          class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
        />
      </div>
    </div>

    <!-- Date filters -->
    <div class="flex gap-2">
      <div>
        <label for="from-date" class="block text-sm font-body font-medium text-gray-700 mb-1">
          {$i18n.t('encounters.fromDate')}
        </label>
        <input
          id="from-date"
          type="date"
          bind:value={fromDate}
          onchange={handleDateChange}
          class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
        />
      </div>
      <div>
        <label for="to-date" class="block text-sm font-body font-medium text-gray-700 mb-1">
          {$i18n.t('encounters.toDate')}
        </label>
        <input
          id="to-date"
          type="date"
          bind:value={toDate}
          onchange={handleDateChange}
          class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm"
        />
      </div>
    </div>

    <!-- Clear filters -->
    {#if searchQuery || fromDate || toDate}
      <button
        type="button"
        onclick={clearFilters}
        class="px-3 py-2 text-sm text-forest hover:text-forest-dark font-body font-medium transition-colors"
      >
        {$i18n.t('encounters.clearFilters')}
      </button>
    {/if}
  </div>

  <!-- Results count -->
  <div class="text-sm text-gray-600 font-body">
    {$i18n.t(pagination.totalCount === 1 ? 'encounters.encounterCount' : 'encounters.encounterCount_plural', { count: pagination.totalCount })}
    {#if searchQuery || fromDate || toDate}
      <span class="text-forest">{$i18n.t('encounters.filtered')}</span>
    {/if}
  </div>

  <!-- Error state -->
  {#if error}
    <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg font-body text-sm" role="alert">
      {error}
    </div>
  {/if}

  <!-- Loading state -->
  {#if isLoading && encounterItems.length === 0}
    <div class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
    </div>
  {:else if encounterItems.length === 0}
    <!-- Empty state -->
    <div class="text-center py-12 bg-gray-50 rounded-lg">
      <svg
        class="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <h3 class="mt-4 text-lg font-heading text-gray-900">{$i18n.t('encounters.noEncounters')}</h3>
      <p class="mt-2 text-sm text-gray-600 font-body">
        {#if searchQuery || fromDate || toDate}
          {$i18n.t('encounters.noEncountersFiltered')}
        {:else}
          {$i18n.t('encounters.noEncountersSubtitle')}
        {/if}
      </p>
      {#if !friendId}
        <a
          href="/encounters/new"
          class="mt-4 inline-flex items-center gap-2 bg-forest text-white px-4 py-2 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          {$i18n.t('encounters.logNew')}
        </a>
      {/if}
    </div>
  {:else}
    <!-- Encounter cards -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each encounterItems as encounter, index (encounter.id)}
        <EncounterCard {encounter} {index} />
      {/each}
    </div>

    <!-- Pagination -->
    {#if pagination.totalPages > 1}
      <div class="flex items-center justify-center gap-2 pt-4">
        <button
          onclick={() => goToPage(pagination.page - 1)}
          disabled={pagination.page <= 1 || isLoading}
          class="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <span class="text-sm text-gray-600 font-body px-2">
          {$i18n.t('encounters.pageOf', { page: pagination.page, total: pagination.totalPages })}
        </span>

        <button
          onclick={() => goToPage(pagination.page + 1)}
          disabled={pagination.page >= pagination.totalPages || isLoading}
          class="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    {/if}
  {/if}
</div>
