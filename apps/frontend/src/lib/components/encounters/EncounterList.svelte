<script lang="ts">
import { onMount } from 'svelte';
import Calendar from 'svelte-heros-v2/Calendar.svelte';
import ChevronLeft from 'svelte-heros-v2/ChevronLeft.svelte';
import ChevronRight from 'svelte-heros-v2/ChevronRight.svelte';
import Plus from 'svelte-heros-v2/Plus.svelte';
import { goto } from '$app/navigation';
import type { EncounterListParams } from '$lib/api/encounters.js';
import { getAppContext } from '$lib/app-context.js';
import AlertBanner from '$lib/components/AlertBanner.svelte';
import Button from '$lib/components/ui/Button.svelte';
import EmptyState from '$lib/components/ui/EmptyState.svelte';
import { FORM_CLASSES } from '$lib/components/ui/form-classes.js';
import SearchInput from '$lib/components/ui/SearchInput.svelte';
import Spinner from '$lib/components/ui/Spinner.svelte';
import { createI18n } from '$lib/i18n/i18n.js';
import { ENCOUNTER_TYPES, type EncounterType } from '$shared';
import EncounterCard from './EncounterCard.svelte';
import { encounterTypeLabel } from './encounter-display';

const visibleEncounterIds = getAppContext().stores.keyboardModes.encounters.visibleItems;

const i18n = createI18n();
const encounters = getAppContext().stores.encounters;
const encountersList = encounters.list;

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
let selectedType = $state<EncounterType | ''>('');
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Derived state
let isLoading = $derived($encounters.isLoading);
let error = $derived($encounters.error);
let encounterItems = $derived($encountersList);
let pagination = $derived($encounters.pagination);

// "Any filter set" drives both the clear button and the "filtered" note.
let hasActiveFilters = $derived(
  searchQuery.length > 0 || fromDate.length > 0 || toDate.length > 0 || selectedType.length > 0,
);

// Update visible encounter IDs for keyboard navigation
$effect(() => {
  const ids = encounterItems.map((e) => e.id);
  visibleEncounterIds.set(ids);
});

// Open the first result when pressing Enter in the search box
function openFirstResult() {
  const first = encounterItems[0];
  if (!first) return;
  void goto(`/encounters/${first.id}`);
}

// Load encounters on mount (not in $effect to avoid infinite loop)
onMount(() => {
  void loadEncounters();
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
  if (selectedType) {
    params.type = selectedType;
  }

  await encounters.loadEncounters(params);
}

function handleSearchInput(value: string) {
  searchQuery = value;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    void loadEncounters();
  }, 300);
}

function handleDateChange() {
  void loadEncounters();
}

function clearFilters() {
  searchQuery = '';
  fromDate = '';
  toDate = '';
  selectedType = '';
  void loadEncounters();
}

function goToPage(page: number) {
  void loadEncounters(page);
}
</script>

<div class="space-y-4">
  <!-- Search and filters -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-end">
    <!-- Search input -->
    <div class="flex-1">
      <label for="encounter-search" class={FORM_CLASSES.label}>
        {$i18n.t('encounters.search')}
      </label>
      <SearchInput
        id="encounter-search"
        value={searchQuery}
        oninput={handleSearchInput}
        onsubmit={openFirstResult}
        placeholder={$i18n.t('encounters.searchPlaceholder')}
        ariaLabel={$i18n.t('encounters.search')}
      />
    </div>

    <!-- Type filter -->
    <div>
      <label for="type-filter" class={FORM_CLASSES.label}>
        {$i18n.t('encounters.typeFilter')}
      </label>
      <select
        id="type-filter"
        bind:value={selectedType}
        onchange={() => loadEncounters()}
        class="{FORM_CLASSES.inputSm} bg-white"
      >
        <option value="">{$i18n.t('encounters.allTypes')}</option>
        {#each ENCOUNTER_TYPES as type (type)}
          <option value={type}>{encounterTypeLabel($i18n.t, type)}</option>
        {/each}
      </select>
    </div>

    <!-- Date filters -->
    <div class="flex gap-2">
      <div>
        <label for="from-date" class={FORM_CLASSES.label}>
          {$i18n.t('encounters.fromDate')}
        </label>
        <input
          id="from-date"
          type="date"
          bind:value={fromDate}
          onchange={handleDateChange}
          class={FORM_CLASSES.inputSm}
        />
      </div>
      <div>
        <label for="to-date" class={FORM_CLASSES.label}>
          {$i18n.t('encounters.toDate')}
        </label>
        <input
          id="to-date"
          type="date"
          bind:value={toDate}
          onchange={handleDateChange}
          class={FORM_CLASSES.inputSm}
        />
      </div>
    </div>

    <!-- Clear filters -->
    {#if hasActiveFilters}
      <Button variant="ghostAccent" size="sm" onclick={clearFilters}>
        {$i18n.t('encounters.clearFilters')}
      </Button>
    {/if}
  </div>

  <!-- Results count -->
  <div class="text-sm text-gray-600 font-body">
    {$i18n.t('encounters.encounterCount', { count: pagination.totalCount })}
    {#if hasActiveFilters}
      <span class="text-forest">{$i18n.t('encounters.filtered')}</span>
    {/if}
  </div>

  <!-- Error state -->
  {#if error !== null && error.length > 0}
    <AlertBanner variant="error">{error}</AlertBanner>
  {/if}

  <!-- Loading state -->
  {#if isLoading && encounterItems.length === 0}
    <div class="flex justify-center py-12">
      <Spinner size="lg" />
    </div>
  {:else if encounterItems.length === 0}
    <EmptyState
      icon={Calendar}
      title={$i18n.t('encounters.noEncounters')}
      description={searchQuery.length > 0 ||
      fromDate.length > 0 ||
      toDate.length > 0 ||
      selectedType.length > 0
        ? $i18n.t('encounters.noEncountersFiltered')
        : $i18n.t('encounters.noEncountersSubtitle')}
    >
      {#if friendId === undefined}
        <Button href="/encounters/new">
          <Plus class="w-5 h-5" strokeWidth="2" />
          {$i18n.t('encounters.logNew')}
        </Button>
      {/if}
    </EmptyState>
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
        <Button
          variant="secondary"
          size="sm"
          onclick={() => goToPage(pagination.page - 1)}
          disabled={pagination.page <= 1 || isLoading}
          aria-label={$i18n.t('aria.previousPage')}
        >
          <ChevronLeft class="w-4 h-4 text-gray-600" strokeWidth="2" />
        </Button>

        <span class="text-sm text-gray-600 font-body px-2">
          {$i18n.t('encounters.pageOf', { page: pagination.page, total: pagination.totalPages })}
        </span>

        <Button
          variant="secondary"
          size="sm"
          onclick={() => goToPage(pagination.page + 1)}
          disabled={pagination.page >= pagination.totalPages || isLoading}
          aria-label={$i18n.t('aria.nextPage')}
        >
          <ChevronRight class="w-4 h-4 text-gray-600" strokeWidth="2" />
        </Button>
      </div>
    {/if}
  {/if}
</div>
