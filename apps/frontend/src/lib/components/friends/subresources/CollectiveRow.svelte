<script lang="ts">
import { createI18n } from '$lib/i18n/index.js';
import type { ContactCollectiveSummary } from '$shared';
import DetailActions from './DetailActions.svelte';
import SwipeableRow from './SwipeableRow.svelte';

const i18n = createI18n();

interface Props {
  collective: ContactCollectiveSummary;
  onRemove: (collectiveId: string, membershipId: string) => void;
  isRemoving?: boolean;
}

let { collective, onRemove, isRemoving = false }: Props = $props();
</script>

<!-- Mobile: Swipeable row (only swipe left for remove, no edit) -->
<div class="sm:hidden">
  <SwipeableRow onSwipeLeft={() => onRemove(collective.id, collective.membershipId)} disabled={isRemoving}>
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <a
            href="/collectives/{collective.id}"
            class="font-body font-semibold text-forest hover:underline"
          >
            {collective.name}
          </a>
          {#if !collective.isActive}
            <span class="px-1.5 py-0.5 bg-gray-400 text-white text-xs rounded font-body">
              {$i18n.t('collectives.inactive')}
            </span>
          {/if}
        </div>
        <div class="flex items-center gap-2 text-sm text-gray-500 font-body mt-1">
          <span>{collective.typeName}</span>
          <span class="text-gray-300">|</span>
          <span>{collective.role.label}</span>
        </div>
      </div>
      <DetailActions
        onDelete={() => onRemove(collective.id, collective.membershipId)}
        isDeleting={isRemoving}
        deleteLabel="Remove from collective"
      />
    </div>
  </SwipeableRow>
</div>

<!-- Desktop: Hover-revealed actions -->
<div class="hidden sm:block">
  <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <a
          href="/collectives/{collective.id}"
          class="font-body font-semibold text-forest hover:underline"
        >
          {collective.name}
        </a>
        {#if !collective.isActive}
          <span class="px-1.5 py-0.5 bg-gray-400 text-white text-xs rounded font-body">
            {$i18n.t('collectives.inactive')}
          </span>
        {/if}
      </div>
      <div class="flex items-center gap-2 text-sm text-gray-500 font-body mt-1">
        <span>{collective.typeName}</span>
        <span class="text-gray-300">|</span>
        <span>{collective.role.label}</span>
      </div>
    </div>
    <DetailActions
      onDelete={() => onRemove(collective.id, collective.membershipId)}
      isDeleting={isRemoving}
      deleteLabel="Remove from collective"
    />
  </div>
</div>
