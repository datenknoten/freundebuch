<script lang="ts">
import { removeMember } from '$lib/api/collectives';
import { createI18n } from '$lib/i18n/index.js';
import { isOpenFriendLinkModeActive, openFriendLinkModePrefix } from '$lib/stores/ui';
import type { ContactCollectiveSummary } from '$shared';
import KeyboardHintBadge from '../../KeyboardHintBadge.svelte';
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
</script>

{#if collectives.length > 0}
  <section class="space-y-2">
    <div class="flex items-center justify-between bg-forest text-white px-3 py-1.5 rounded-lg">
      <h2 class="text-lg font-heading flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        {$i18n.t('friendDetail.sections.collectives')}
      </h2>
      <button
        type="button"
        onclick={() => showAddToCollectiveModal = true}
        class="text-sm font-body font-semibold text-white/90 hover:text-white
               flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
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
