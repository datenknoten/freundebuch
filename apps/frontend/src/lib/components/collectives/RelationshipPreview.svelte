<script lang="ts">
import { createI18n } from '$lib/i18n/index.js';
import type { RelationshipPreviewResponse } from '$shared';
import FriendAvatar from '../friends/FriendAvatar.svelte';

const i18n = createI18n();

interface Props {
  preview: RelationshipPreviewResponse;
}

let { preview }: Props = $props();

let newRelationships = $derived(preview.relationships.filter((r) => !r.alreadyExists));
let existingRelationships = $derived(preview.relationships.filter((r) => r.alreadyExists));
</script>

<div class="space-y-3">
  {#if newRelationships.length === 0 && existingRelationships.length === 0}
    <p class="text-sm text-gray-500 font-body italic">
      {$i18n.t('collectives.addMember.noRelationships')}
    </p>
  {:else}
    <!-- New relationships to be created -->
    {#if newRelationships.length > 0}
      <div class="space-y-2">
        <p class="text-xs text-gray-500 font-body uppercase tracking-wide">
          {$i18n.t('collectives.addMember.willCreate')} ({newRelationships.length})
        </p>
        {#each newRelationships as rel}
          <div class="flex items-center gap-2 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <div class="flex items-center gap-1">
              <FriendAvatar
                displayName={rel.fromContact.displayName}
                photoUrl={rel.fromContact.photoUrl}
                size="xs"
              />
              <span class="font-body text-gray-700 truncate max-w-20">{rel.fromContact.displayName}</span>
            </div>

            <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>

            <span class="font-body text-green-700 font-medium text-xs bg-green-100 px-2 py-0.5 rounded flex-shrink-0">
              {rel.relationshipType.label}
            </span>

            <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>

            <div class="flex items-center gap-1">
              <FriendAvatar
                displayName={rel.toContact.displayName}
                photoUrl={rel.toContact.photoUrl}
                size="xs"
              />
              <span class="font-body text-gray-700 truncate max-w-20">{rel.toContact.displayName}</span>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Existing relationships (will be skipped) -->
    {#if existingRelationships.length > 0}
      <div class="space-y-2">
        <p class="text-xs text-gray-500 font-body uppercase tracking-wide">
          {$i18n.t('collectives.addMember.alreadyExist')} ({existingRelationships.length})
        </p>
        {#each existingRelationships as rel}
          <div class="flex items-center gap-2 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 opacity-60">
            <div class="flex items-center gap-1">
              <FriendAvatar
                displayName={rel.fromContact.displayName}
                photoUrl={rel.fromContact.photoUrl}
                size="xs"
              />
              <span class="font-body text-gray-600 truncate max-w-20">{rel.fromContact.displayName}</span>
            </div>

            <svg class="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>

            <span class="font-body text-gray-500 text-xs bg-gray-100 px-2 py-0.5 rounded flex-shrink-0">
              {rel.relationshipType.label}
            </span>

            <svg class="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>

            <div class="flex items-center gap-1">
              <FriendAvatar
                displayName={rel.toContact.displayName}
                photoUrl={rel.toContact.photoUrl}
                size="xs"
              />
              <span class="font-body text-gray-600 truncate max-w-20">{rel.toContact.displayName}</span>
            </div>

            <span class="text-xs text-gray-400 italic ml-auto">{$i18n.t('collectives.addMember.exists')}</span>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
