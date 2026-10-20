<script lang="ts">
import ExclamationTriangle from 'svelte-heros-v2/ExclamationTriangle.svelte';
import FaceSmile from 'svelte-heros-v2/FaceSmile.svelte';
import { page } from '$app/stores';
import { getAppContext } from '$lib/app-context.js';
import EncounterDetail from '$lib/components/encounters/EncounterDetail.svelte';
import EncounterForm from '$lib/components/encounters/EncounterForm.svelte';
import Button from '$lib/components/ui/Button.svelte';
import EmptyState from '$lib/components/ui/EmptyState.svelte';
import PageShell from '$lib/components/ui/PageShell.svelte';
import Spinner from '$lib/components/ui/Spinner.svelte';
import { createI18n } from '$lib/i18n/i18n.js';
import type { EncounterResponse } from '$shared';

const isAuthInitialized = getAppContext().stores.auth.isInitialized;
const encounters = getAppContext().stores.encounters;

const i18n = createI18n();

let encounterId = $derived($page.params.id);
let encounter = $derived($encounters.currentEncounter);
let isLoading = $derived($encounters.isLoading);
let error = $derived($encounters.error);
let isEditing = $state(false);

let hasLoaded = $state(false);

function loadEncounterWhenAuthReady() {
  if ($isAuthInitialized === true && encounterId !== undefined && hasLoaded === false) {
    hasLoaded = true;
    void encounters.loadEncounter(encounterId);
  }
}
$effect(loadEncounterWhenAuthReady);

// Reset when navigating to a different encounter
function resetOnEncounterChange() {
  if (encounterId !== undefined) {
    hasLoaded = false;
    isEditing = false;
  }
}
$effect(resetOnEncounterChange);

function handleEdit() {
  isEditing = true;
}

function handleShortcutEdit() {
  if (encounter !== null && isEditing === false) {
    isEditing = true;
  }
}

function removeShortcutEditListener() {
  window.removeEventListener('shortcut:edit-encounter', handleShortcutEdit);
}

function listenForShortcutEdit() {
  window.addEventListener('shortcut:edit-encounter', handleShortcutEdit);
  return removeShortcutEditListener;
}
$effect(listenForShortcutEdit);

function handleEditSuccess(_updatedEncounter: EncounterResponse) {
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
