<script lang="ts">
import ExclamationTriangle from 'svelte-heros-v2/ExclamationTriangle.svelte';
import FaceSmile from 'svelte-heros-v2/FaceSmile.svelte';
import { page } from '$app/stores';
import CollectiveDetail from '$lib/components/collectives/collective-detail.svelte';
import CollectiveForm from '$lib/components/collectives/collective-form.svelte';
import { Button, EmptyState, PageShell, Spinner } from '$lib/components/ui';
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

function handleShortcutEdit() {
  if (collective && !isEditing) {
    isEditing = true;
  }
}

$effect(() => {
  window.addEventListener('shortcut:edit-collective', handleShortcutEdit);
  return () => {
    window.removeEventListener('shortcut:edit-collective', handleShortcutEdit);
  };
});
</script>

<svelte:head>
  <title>{collective?.name ?? $i18n.t('collectives.title')} | Freundebuch</title>
</svelte:head>

<PageShell
  width="detail"
  title={isEditing ? $i18n.t('collectives.detail.editCollective') : undefined}
  back={{ href: '/collectives', label: $i18n.t('collectives.backToCollectives') }}
>
  {#if isLoading && !collective}
    <!-- Loading state -->
    <div class="flex justify-center py-12">
      <Spinner size="lg" />
    </div>
  {:else if error}
    <!-- Error state -->
    <EmptyState
      icon={ExclamationTriangle}
      tone="error"
      title={$i18n.t('collectives.detail.loadError')}
      description={error}
    >
      <Button variant="secondary" href="/collectives">
        {$i18n.t('collectives.detail.returnToCollectives')}
      </Button>
    </EmptyState>
  {:else if !collective}
    <!-- Not found state -->
    <EmptyState
      icon={FaceSmile}
      title={$i18n.t('collectives.detail.notFound')}
      description={$i18n.t('collectives.detail.notFoundSubtitle')}
    >
      <Button variant="secondary" href="/collectives">
        {$i18n.t('collectives.detail.returnToCollectives')}
      </Button>
    </EmptyState>
  {:else if isEditing}
    <!-- Edit form -->
    <CollectiveForm
      {collective}
      onSuccess={handleEditSuccess}
      onCancel={handleEditCancel}
    />
  {:else}
    <!-- Detail view -->
    <CollectiveDetail {collective} onEdit={handleEdit} />
  {/if}
</PageShell>
