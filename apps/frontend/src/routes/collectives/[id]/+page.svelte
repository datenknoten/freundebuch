<script lang="ts">
import { page } from '$app/stores';
import CollectiveDetail from '$lib/components/collectives/CollectiveDetail.svelte';
import CollectiveForm from '$lib/components/collectives/CollectiveForm.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { isAuthInitialized } from '$lib/stores/auth';
import { collectives } from '$lib/stores/collectives';
import type { Collective } from '$shared';

const i18n = createI18n();

let collectiveId = $derived($page.params.id);
let collective = $derived($collectives.currentCollective);
let isLoading = $derived($collectives.isLoading);
let error = $derived($collectives.error);
let isEditing = $state(false);

let hasLoaded = $state(false);

// Load collective when auth is ready
$effect(() => {
  if ($isAuthInitialized && collectiveId && !hasLoaded) {
    hasLoaded = true;
    collectives.loadCollective(collectiveId);
  }
});

// Reset when navigating to a different collective
$effect(() => {
  if (collectiveId) {
    hasLoaded = false;
    isEditing = false;
  }
});

function handleEdit() {
  isEditing = true;
}

function handleEditSuccess(_updatedCollective: Collective) {
  isEditing = false;
}

function handleEditCancel() {
  isEditing = false;
}
</script>

<svelte:head>
  <title>{collective?.name ?? $i18n.t('collectives.title')} | Freundebuch</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 p-4">
  <div class="max-w-4xl mx-auto mt-8">
    <div class="bg-white rounded-xl shadow-lg p-8">
      <!-- Back link -->
      <div class="mb-6">
        <a
          href="/collectives"
          class="inline-flex items-center gap-2 text-gray-600 hover:text-forest font-body text-sm transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          {$i18n.t('collectives.backToCollectives')}
        </a>
      </div>

      {#if isLoading && !collective}
        <!-- Loading state -->
        <div class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
        </div>
      {:else if error}
        <!-- Error state -->
        <div class="text-center py-12">
          <svg
            class="mx-auto h-12 w-12 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 class="mt-4 text-lg font-heading text-gray-900">{$i18n.t('collectives.detail.loadError')}</h3>
          <p class="mt-2 text-sm text-gray-600 font-body">{error}</p>
          <a
            href="/collectives"
            class="mt-4 inline-flex items-center gap-2 text-forest hover:text-forest-light font-body font-medium transition-colors"
          >
            {$i18n.t('collectives.detail.returnToCollectives')}
          </a>
        </div>
      {:else if !collective}
        <!-- Not found state -->
        <div class="text-center py-12">
          <svg
            class="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 class="mt-4 text-lg font-heading text-gray-900">{$i18n.t('collectives.detail.notFound')}</h3>
          <p class="mt-2 text-sm text-gray-600 font-body">{$i18n.t('collectives.detail.notFoundSubtitle')}</p>
          <a
            href="/collectives"
            class="mt-4 inline-flex items-center gap-2 text-forest hover:text-forest-light font-body font-medium transition-colors"
          >
            {$i18n.t('collectives.detail.returnToCollectives')}
          </a>
        </div>
      {:else if isEditing}
        <!-- Edit form -->
        <div>
          <h1 class="text-2xl font-heading font-bold text-gray-900 mb-6">{$i18n.t('collectives.detail.editCollective')}</h1>
          <CollectiveForm
            {collective}
            onSuccess={handleEditSuccess}
            onCancel={handleEditCancel}
          />
        </div>
      {:else}
        <!-- Detail view -->
        <CollectiveDetail {collective} onEdit={handleEdit} />
      {/if}
    </div>
  </div>
</div>
