<script lang="ts">
import { onMount } from 'svelte';
import ExclamationTriangle from 'svelte-heros-v2/ExclamationTriangle.svelte';
import FaceSmile from 'svelte-heros-v2/FaceSmile.svelte';
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import EncounterDetail from '$lib/components/encounters/encounter-detail.svelte';
import EncounterForm from '$lib/components/encounters/encounter-form.svelte';
import { Button, EmptyState, PageShell, Spinner } from '$lib/components/ui';
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

<PageShell
  width="detail"
  title={isEditing ? $i18n.t('encounters.detail.editEncounter') : undefined}
  back={{ href: '/encounters', label: $i18n.t('encounters.backToEncounters') }}
>
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
    <EncounterForm
      {encounter}
      onSuccess={handleEditSuccess}
      onCancel={handleEditCancel}
    />
  {:else}
    <!-- Detail view -->
    <EncounterDetail {encounter} onEdit={handleEdit} />
  {/if}
</PageShell>
