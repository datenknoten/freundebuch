<script lang="ts">
import { onMount } from 'svelte';
import ChevronLeft from 'svelte-heros-v2/ChevronLeft.svelte';
import ExclamationTriangle from 'svelte-heros-v2/ExclamationTriangle.svelte';
import FaceSmile from 'svelte-heros-v2/FaceSmile.svelte';
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import EncounterDetail from '$lib/components/encounters/encounter-detail.svelte';
import EncounterForm from '$lib/components/encounters/encounter-form.svelte';
import { Button, EmptyState, Spinner } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';
import { isAuthInitialized } from '$lib/stores/auth';
import { encounters } from '$lib/stores/encounters';
import type { Encounter } from '$shared';

const i18n = createI18n();

let encounterId = $derived($page.params.id);
let encounter = $derived($encounters.currentEncounter);
let isLoading = $derived($encounters.isLoading);
let error = $derived($encounters.error);
let isEditing = $state(false);

let hasLoaded = $state(false);

// Load encounter when auth is ready
$effect(() => {
  if ($isAuthInitialized && encounterId && !hasLoaded) {
    hasLoaded = true;
    encounters.loadEncounter(encounterId);
  }
});

// Reset when navigating to a different encounter
$effect(() => {
  if (encounterId) {
    hasLoaded = false;
    isEditing = false;
  }
});

function handleEdit() {
  isEditing = true;
}

function handleShortcutEdit() {
  if (encounter && !isEditing) {
    isEditing = true;
  }
}

$effect(() => {
  window.addEventListener('shortcut:edit-encounter', handleShortcutEdit);
  return () => {
    window.removeEventListener('shortcut:edit-encounter', handleShortcutEdit);
  };
});

function handleEditSuccess(_updatedEncounter: Encounter) {
  isEditing = false;
}

function handleEditCancel() {
  isEditing = false;
}
</script>

<svelte:head>
  <title>{encounter?.title ?? $i18n.t('encounters.title')} | Freundebuch</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 p-4">
  <div class="max-w-4xl mx-auto mt-8">
    <div class="bg-white rounded-xl shadow-lg p-8">
      <!-- Back link -->
      <div class="mb-6">
        <a
          href="/encounters"
          class="inline-flex items-center gap-2 text-gray-600 hover:text-forest font-body text-sm transition-colors"
        >
          <ChevronLeft class="w-4 h-4" strokeWidth="2" />
          {$i18n.t('encounters.backToEncounters')}
        </a>
      </div>

      {#if isLoading && !encounter}
        <!-- Loading state -->
        <div class="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      {:else if error}
        <!-- Error state -->
        <EmptyState
          icon={ExclamationTriangle}
          tone="error"
          title={$i18n.t('encounters.detail.loadError')}
          description={error}
        >
          <Button variant="secondary" href="/encounters">
            {$i18n.t('encounters.detail.returnToEncounters')}
          </Button>
        </EmptyState>
      {:else if !encounter}
        <!-- Not found state -->
        <EmptyState
          icon={FaceSmile}
          title={$i18n.t('encounters.detail.notFound')}
          description={$i18n.t('encounters.detail.notFoundSubtitle')}
        >
          <Button variant="secondary" href="/encounters">
            {$i18n.t('encounters.detail.returnToEncounters')}
          </Button>
        </EmptyState>
      {:else if isEditing}
        <!-- Edit form -->
        <div>
          <h1 class="text-2xl font-heading font-bold text-gray-900 mb-6">{$i18n.t('encounters.detail.editEncounter')}</h1>
          <EncounterForm
            {encounter}
            onSuccess={handleEditSuccess}
            onCancel={handleEditCancel}
          />
        </div>
      {:else}
        <!-- Detail view -->
        <EncounterDetail {encounter} onEdit={handleEdit} />
      {/if}
    </div>
  </div>
</div>
