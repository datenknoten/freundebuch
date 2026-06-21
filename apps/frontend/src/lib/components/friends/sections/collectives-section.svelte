<script lang="ts">
import { onMount } from 'svelte';
import BuildingOffice from 'svelte-heros-v2/BuildingOffice.svelte';
import Plus from 'svelte-heros-v2/Plus.svelte';
import { primeKeyboardFocus } from '$lib/actions/auto-focus';
import { removeMember } from '$lib/api/collectives';
import { createI18n } from '$lib/i18n/index.js';
import {
  getKeyboardHint,
  isOpenFriendLinkModeActive,
  openFriendLinkModePrefix,
} from '$lib/stores/ui';
import type { ContactCollectiveSummary } from '$shared';
import KeyboardHintBadge from '../../keyboard-hint-badge.svelte';
import { AddToCollectiveModal, CollectiveRow } from '../subresources';

const i18n = createI18n();

interface Props {
  friendId: string;
  friendDisplayName: string;
  collectives: ContactCollectiveSummary[];
  linkStartIndex?: number;
  onCollectivesChanged: () => void;
}

let { friendId, friendDisplayName, collectives, linkStartIndex, onCollectivesChanged }: Props =
  $props();

let showAddToCollectiveModal = $state(false);
let removingCollectiveId = $state<string | null>(null);

function openAddToCollectiveModal() {
  // Prime the keyboard within this tap so iOS keeps it open when the
  // auto-focused collective search input mounts inside the modal.
  primeKeyboardFocus();
  showAddToCollectiveModal = true;
}

function handleAddToCollectiveSuccess() {
  showAddToCollectiveModal = false;
  onCollectivesChanged();
}

async function handleRemoveFromCollective(collectiveId: string, membershipId: string) {
  removingCollectiveId = collectiveId;
  try {
    await removeMember(collectiveId, membershipId);
    onCollectivesChanged();
  } catch (err) {
    console.error('Failed to remove from collective:', err);
  } finally {
    removingCollectiveId = null;
  }
}

onMount(() => {
  function handleAddCollective() {
    showAddToCollectiveModal = true;
  }
  window.addEventListener('shortcut:add-collective', handleAddCollective);
  return () => {
    window.removeEventListener('shortcut:add-collective', handleAddCollective);
  };
});
</script>

{#if collectives.length > 0}
  <section class="space-y-2">
    <div class="flex items-center justify-between bg-forest/10 text-forest px-3 py-1.5 rounded-lg">
      <h2 class="text-lg font-heading flex items-center gap-2">
        <BuildingOffice class="w-5 h-5" strokeWidth="2" />
        {$i18n.t('friendDetail.sections.collectives')}
      </h2>
      <button
        type="button"
        onclick={openAddToCollectiveModal}
        class="text-sm font-body font-semibold bg-forest text-white hover:bg-forest-light
               flex items-center gap-1 px-2 py-1 rounded-md transition-colors"
      >
        <Plus class="w-4 h-4" strokeWidth="2" />
        {$i18n.t('friendDetail.actions.addCollective')}
      </button>
    </div>
    <div class="space-y-2">
      {#each collectives as collective, i (collective.id)}
        <div class="relative">
          {#if linkStartIndex !== undefined}
            <KeyboardHintBadge index={linkStartIndex + i} isActive={$isOpenFriendLinkModeActive} prefix={$openFriendLinkModePrefix} />
          {/if}
          <CollectiveRow
            {collective}
            onRemove={handleRemoveFromCollective}
            isRemoving={removingCollectiveId === collective.id}
            shortcutHint={linkStartIndex !== undefined
              ? `o ${getKeyboardHint(linkStartIndex + i)}`
              : undefined}
          />
        </div>
      {/each}
    </div>
  </section>
{/if}

{#if showAddToCollectiveModal}
  <AddToCollectiveModal
    {friendId}
    {friendDisplayName}
    existingCollectiveIds={collectives.map((c) => c.id)}
    onSuccess={handleAddToCollectiveSuccess}
    onClose={() => showAddToCollectiveModal = false}
  />
{/if}
